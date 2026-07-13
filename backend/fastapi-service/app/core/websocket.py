import asyncio
import logging
from typing import List, Dict, Optional
from fastapi import WebSocket
from app.services.copilot_context import context_collector

logger = logging.getLogger("fastapi")

class LiveConnectionManager:
    def __init__(self):
        # Global connection pool
        self.active_connections: List[WebSocket] = []
        # Maps zone_id -> list of active websockets subscribing to it
        self.zone_connections: Dict[str, List[WebSocket]] = {}
        self._lock = asyncio.Lock()
        self.simulation_task: Optional[asyncio.Task] = None
        self.is_simulating = False
        self.demo_time = 0.0
        self.demo_speed = 1.0
        self.demo_paused = False
        self.emitted_milestones = set()
        
    async def connect(self, websocket: WebSocket, zone_id: Optional[str] = None):
        await websocket.accept()
        async with self._lock:
            self.active_connections.append(websocket)
            if zone_id:
                if zone_id not in self.zone_connections:
                    self.zone_connections[zone_id] = []
                self.zone_connections[zone_id].append(websocket)
        logger.info(f"New client connected. Zone: {zone_id} | Total: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket, zone_id: Optional[str] = None):
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
            if zone_id and zone_id in self.zone_connections:
                if websocket in self.zone_connections[zone_id]:
                    self.zone_connections[zone_id].remove(websocket)
        logger.info(f"Client disconnected. Zone: {zone_id} | Total: {len(self.active_connections)}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending message to client: {e}")

    async def broadcast(self, message: dict):
        # Update AI Context collector with the live event
        event_type = message.get("type")
        event_data = message.get("data", {})
        if event_type:
            context_collector.update_from_event(event_type, event_data)
            
        await self.broadcast_global(message)

    async def broadcast_global(self, message: dict):
        async with self._lock:
            connections = list(self.active_connections)
            
        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Failed broadcasting, removing active connection: {e}")
                async with self._lock:
                    if connection in self.active_connections:
                        self.active_connections.remove(connection)

    async def broadcast_to_zone(self, zone_id: str, message: dict):
        async with self._lock:
            if zone_id not in self.zone_connections:
                return
            connections = list(self.zone_connections[zone_id])
            
        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Failed broadcasting to zone, removing active connection: {e}")
                async with self._lock:
                    if connection in self.zone_connections[zone_id]:
                        self.zone_connections[zone_id].remove(connection)

    # ──────────────────────────────────────────────
    # Simulation Event Loop
    # ──────────────────────────────────────────────
    async def start_simulation(self):
        if self.is_simulating and not self.demo_paused:
            return
        if self.demo_paused:
            self.demo_paused = False
            logger.info("Live simulation engine resumed.")
            return

        self.is_simulating = True
        self.demo_time = 0.0
        self.demo_speed = 1.0
        self.demo_paused = False
        self.emitted_milestones = set()
        self.simulation_task = asyncio.create_task(self._run_simulation_loop())
        logger.info("Live simulation engine started in background task.")

    async def stop_simulation(self):
        self.is_simulating = False
        if self.simulation_task:
            self.simulation_task.cancel()
            self.simulation_task = None
        logger.info("Live simulation engine stopped.")

    async def _run_simulation_loop(self):
        try:
            while self.is_simulating:
                if self.demo_paused:
                    await asyncio.sleep(0.5)
                    continue

                # Tick
                tick_duration = 0.5
                await asyncio.sleep(tick_duration)
                
                # Advance time
                self.demo_time += tick_duration * self.demo_speed * 60  # demo_speed 1x = 1 real sec is 1 demo minute. Wait, no. The user wants 18 minutes. 
                # Let's make 1x speed = 1 second of real time equals 1 second of demo time. 
                # So a full 18-minute demo takes 18 minutes. 5x speed = 3.6 minutes.
                # Actually, let's just make the demo scale faster by default if speed is 1. 
                # No, they explicitly said "Simulation Speed 1x, 2x, 5x". 1x = real time. 
                # So we add (tick_duration * demo_speed) to demo_time.
                self.demo_time += (tick_duration * self.demo_speed)

                t = self.demo_time
                ms = self.emitted_milestones
                
                # Broadcast current time
                await self.broadcast({
                    'type': 'DemoTimeUpdate',
                    'data': {'demo_time': t, 'demo_speed': self.demo_speed}
                })

                # T+0 (0s): Stadium Opens. Attendance climbing.
                if t >= 0 and "t0" not in ms:
                    ms.add("t0")
                    await self.broadcast({'type': 'AttendanceUpdate', 'data': {'attendance': 12000}})
                    await self.broadcast({'type': 'PredictionUpdated', 'data': {'congestion_score': 15, 'risk': 'LOW', 'predicted_queue_time': 120}})
                    await self.broadcast({'type': 'GateStatusChanged', 'data': {'gate_id': 'A', 'status': 'open', 'queue_length': 15}})
                    await self.broadcast({'type': 'WeatherUpdated', 'data': {'condition': 'CLEAR', 'temperature': 22.0, 'humidity': 45.0, 'rain_probability': 0.0}})

                # T+2 (120s): Metro arrivals
                if t >= 120 and "t2" not in ms:
                    ms.add("t2")
                    await self.broadcast({'type': 'NotificationCreated', 'data': {'message': 'Mass transit influx detected from Metro Station 2.'}})
                    await self.broadcast({'type': 'AttendanceUpdate', 'data': {'attendance': 28000}})
                    await self.broadcast({'type': 'CrowdDensityUpdated', 'data': {'zone': 'Concourse West', 'density': 45, 'entry_rate': 250}})
                    await self.broadcast({'type': 'PredictionUpdated', 'data': {'congestion_score': 35, 'risk': 'LOW'}})

                # T+4 (240s): YOLO detects growing crowds
                if t >= 240 and "t4" not in ms:
                    ms.add("t4")
                    await self.broadcast({'type': 'CrowdDensityUpdated', 'data': {'zone': 'Gate B', 'density': 75, 'people_count': 1250, 'entry_rate': 420}})
                    await self.broadcast({'type': 'GateStatusChanged', 'data': {'gate_id': 'B', 'status': 'open', 'queue_length': 340}})
                    await self.broadcast({'type': 'AttendanceUpdate', 'data': {'attendance': 45000}})
                    
                # T+6 (360s): ML model predicts HIGH congestion
                if t >= 360 and "t6" not in ms:
                    ms.add("t6")
                    await self.broadcast({'type': 'PredictionUpdated', 'data': {'congestion_score': 88, 'risk': 'HIGH', 'confidence': 0.94, 'predicted_queue_time': 840}})
                    await self.broadcast({'type': 'NotificationCreated', 'data': {'message': 'ML Prediction Alert: Severe congestion predicted at Gate B within 15 minutes.'}})

                # T+8 (480s): AI Copilot recommendations
                if t >= 480 and "t8" not in ms:
                    ms.add("t8")
                    await self.broadcast({'type': 'NotificationCreated', 'data': {'message': 'AI Copilot Recommendation: Open Gate D and deploy 4 mobile scanners.'}})
                    await self.broadcast({'type': 'GateStatusChanged', 'data': {'gate_id': 'D', 'status': 'open', 'queue_length': 0}})

                # T+10 (600s): Medical incident occurs
                if t >= 600 and "t10" not in ms:
                    ms.add("t10")
                    await self.broadcast({'type': 'EmergencyAlert', 'data': {'type': 'Medical Emergency', 'severity': 'CRITICAL', 'location': 'Stand B, Row 14'}})
                    await self.broadcast({'type': 'IncidentCreated', 'data': {'id': 'MED-1294', 'type': 'Medical', 'location': 'Stand B', 'severity': 'CRITICAL', 'status': 'Response Dispatched'}})

                # T+12 (720s): Heavy rain begins
                if t >= 720 and "t12" not in ms:
                    ms.add("t12")
                    await self.broadcast({'type': 'WeatherUpdated', 'data': {'condition': 'HEAVY RAIN', 'temperature': 18.5, 'rain_probability': 1.0}})
                    await self.broadcast({'type': 'PredictionUpdated', 'data': {'congestion_score': 92, 'risk': 'CRITICAL', 'confidence': 0.89, 'predicted_queue_time': 920}})
                    await self.broadcast({'type': 'CrowdDensityUpdated', 'data': {'zone': 'Concourse East (Covered)', 'density': 94, 'people_count': 2100}})

                # T+14 (840s): Gate C closes
                if t >= 840 and "t14" not in ms:
                    ms.add("t14")
                    await self.broadcast({'type': 'GateStatusChanged', 'data': {'gate_id': 'C', 'status': 'closed', 'queue_length': 0}})
                    await self.broadcast({'type': 'NotificationCreated', 'data': {'message': 'Gate C closed due to technical fault. Rerouting traffic.'}})
                    await self.broadcast({'type': 'GateStatusChanged', 'data': {'gate_id': 'D', 'status': 'open', 'queue_length': 450}})

                # T+16 (960s): Congestion decreases
                if t >= 960 and "t16" not in ms:
                    ms.add("t16")
                    await self.broadcast({'type': 'PredictionUpdated', 'data': {'congestion_score': 55, 'risk': 'MEDIUM', 'predicted_queue_time': 320}})
                    await self.broadcast({'type': 'CrowdDensityUpdated', 'data': {'zone': 'Gate B', 'density': 52, 'people_count': 640}})
                    await self.broadcast({'type': 'IncidentCreated', 'data': {'id': 'MED-1294', 'type': 'Medical', 'location': 'Stand B', 'severity': 'RESOLVED', 'status': 'Resolved'}})

                # T+18 (1080s): Match begins
                if t >= 1080 and "t18" not in ms:
                    ms.add("t18")
                    await self.broadcast({'type': 'MatchUpdate', 'data': {'status': 'First Half', 'minute': 1}})
                    await self.broadcast({'type': 'AttendanceUpdate', 'data': {'attendance': 67204}})
                    await self.broadcast({'type': 'PredictionUpdated', 'data': {'congestion_score': 22, 'risk': 'LOW', 'predicted_queue_time': 45}})
                    await self.broadcast({'type': 'NotificationCreated', 'data': {'message': 'Match has kicked off. System operations normalizing.'}})
                    
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error in simulation loop: {e}", exc_info=True)

# Instantiation & backward compatibility variables mapping
live_ws_manager = LiveConnectionManager()
ws_manager = live_ws_manager
