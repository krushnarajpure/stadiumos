FROM python:3.12-slim

WORKDIR /workspace

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/fastapi-service/requirements.txt ./backend/fastapi-service/
RUN pip install --no-cache-dir -r backend/fastapi-service/requirements.txt

COPY backend/fastapi-service/ ./backend/fastapi-service/
COPY shared/ ./shared/
COPY ml/ ./ml/

WORKDIR /workspace/backend/fastapi-service

EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
