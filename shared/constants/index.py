CROWD_DENSITY_THRESHOLD = {
    "GREEN": 1.5, # people per sqm
    "AMBER": 3.0,
    "RED": 4.5
}

TRIAGE_LEVELS = {
    "RED": "RED",
    "AMBER": "AMBER",
    "GREEN": "GREEN"
}

KAFKA_TOPICS = {
    "CROWD_DETECTED": "stadiumos.crowd.detected",
    "QUEUE_HIGH": "stadiumos.queue.high",
    "FALL_DETECTED": "stadiumos.fall.detected",
    "SECURITY_ALERT": "stadiumos.security.alert"
}
