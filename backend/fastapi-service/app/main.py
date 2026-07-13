from fastapi import FastAPI, Request, status, WebSocket, WebSocketDisconnect
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import json
import time
from app.core.config import settings
from app.api.v1.endpoints import auth, users, crowd, notifications, emergencies, navigation, vendors, prediction, copilot, health
from app.core.security_layer import SecureHeadersMiddleware
from app.db.session import engine, Base
from app.db.seed import seed_database
from shared.utils.error_handlers import ApplicationError
from app.core.websocket import live_ws_manager
import logging
import uuid
from app.core.env_validator import validate_environment
from app.core.logging_config import setup_structured_logging

# Run environment validation before the app boots
validate_environment()

# Setup JSON structured logging
setup_structured_logging()

# Ensure database tables exist (Development fallbacks)
Base.metadata.create_all(bind=engine)
seed_database()

logger = logging.getLogger("fastapi")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS Policy Mapping
cors_origins = [str(origin) for origin in settings.BACKEND_CORS_ORIGINS]
cors_origin_regex = r"https?://.*"

if "*" in cors_origins:
    cors_origins = []

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Zero-Trust Secure Headers and Rate Limiter Middleware
app.add_middleware(SecureHeadersMiddleware)

@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    # We can inject this into logs by modifying the logger factory, but for simplicity
    # we just attach it to the request state and return it in headers.
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

# Exception handlers mapping
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    details = []
    for error in exc.errors():
        loc = ".".join(str(x) for x in error.get("loc", []))
        details.append({
            "field": loc,
            "message": error.get("msg")
        })
    logger.warning(f"Request validation failed: {details}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error_code": "VALIDATION_ERROR",
            "message": "Request validation failed",
            "details": details
        }
    )

@app.exception_handler(ApplicationError)
async def application_error_handler(request: Request, exc: ApplicationError):
    logger.error(f"Application exception error: {exc.message} - Code: {exc.code}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"error_code": exc.code, "message": exc.message}
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.critical(f"Unhandled server exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error_code": "INTERNAL_SERVER_ERROR", "message": "An unhandled server exception has occurred."}
    )

# Routers mounting
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(crowd.router, prefix=f"{settings.API_V1_STR}/crowd", tags=["crowd"])
app.include_router(notifications.router, prefix=f"{settings.API_V1_STR}/notifications", tags=["notifications"])
app.include_router(emergencies.router, prefix=f"{settings.API_V1_STR}/emergencies", tags=["emergencies"])
app.include_router(navigation.router, prefix=f"{settings.API_V1_STR}/navigation", tags=["navigation"])
app.include_router(vendors.router, prefix=f"{settings.API_V1_STR}/vendors", tags=["vendors"])
app.include_router(prediction.router, prefix=f"{settings.API_V1_STR}/predict", tags=["prediction"])
app.include_router(copilot.router, prefix=f"{settings.API_V1_STR}/copilot", tags=["copilot"])
app.include_router(health.router, prefix="/health", tags=["health"])

@app.get("/")
def read_root():
    return {"status": "ok", "message": "StadiumOS API Gateway"}


@app.websocket("/ws/live")
async def websocket_live_endpoint(websocket: WebSocket):
    await live_ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                msg_type = msg.get("type")
                if msg_type == "ping":
                    await websocket.send_json({"type": "pong", "timestamp": time.time()})
                elif msg_type == "SimulationStarted":
                    await live_ws_manager.start_simulation()
                    await live_ws_manager.broadcast({"type": "SimulationStarted", "data": {}})
                elif msg_type == "SimulationStopped":
                    await live_ws_manager.stop_simulation()
                    await live_ws_manager.broadcast({"type": "SimulationStopped", "data": {}})
                elif msg_type == "SimulationReset":
                    await live_ws_manager.stop_simulation()
                    await live_ws_manager.broadcast({"type": "SimulationReset", "data": {}})
                elif msg_type == "SimulationPause":
                    live_ws_manager.demo_paused = True
                    await live_ws_manager.broadcast({"type": "SimulationPaused", "data": {}})
                elif msg_type == "SimulationResume":
                    await live_ws_manager.start_simulation()
                    await live_ws_manager.broadcast({"type": "SimulationResumed", "data": {}})
                elif msg_type == "SimulationSpeedChanged":
                    new_speed = msg.get("data", {}).get("speed", 1.0)
                    live_ws_manager.demo_speed = float(new_speed)
                    await live_ws_manager.broadcast({"type": "SimulationSpeedUpdated", "data": {"speed": live_ws_manager.demo_speed}})
            except Exception:
                await websocket.send_json({"pong": True, "received": data})
    except WebSocketDisconnect:
        await live_ws_manager.disconnect(websocket)
        logger.info("Live WebSocket client disconnected")
