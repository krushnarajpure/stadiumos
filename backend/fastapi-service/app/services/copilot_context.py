"""
Stadium Context Collector.
Continuously gathers live operational data from all StadiumOS subsystems
and composes a structured context snapshot for LLM consumption.
"""
import time
import logging
# No imports needed from typing
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone

logger = logging.getLogger("copilot")


@dataclass
class StadiumSnapshot:
    """Point-in-time snapshot of all observable stadium state."""
    timestamp: str = ""

    # Crowd & Attendance
    current_attendance: int = 0
    stadium_capacity: int = 80000
    occupancy_pct: float = 0.0
    crowd_density_pct: float = 0.0

    # ML Prediction
    ml_congestion_score: float = 0.0
    ml_risk_level: str = "LOW"
    ml_predicted_queue_time: float = 0.0
    ml_confidence: float = 0.0

    # Gates
    gates: list[dict] = field(default_factory=list)
    gates_open: int = 0
    gates_total: int = 0

    # Weather
    weather_temp: float = 0.0
    weather_humidity: float = 0.0
    weather_condition: str = "Clear"
    rain_probability: float = 0.0

    # Incidents
    active_incidents: list[dict] = field(default_factory=list)
    incident_count: int = 0

    # Queues
    security_queue_length: float = 0.0
    avg_queue_wait_minutes: float = 0.0

    # Medical
    medical_incidents: int = 0
    medical_teams_deployed: int = 0

    # Simulation
    simulation_active: bool = False
    simulation_scenario: str = ""

    # Match
    match_minute: int = 0
    match_status: str = "Pre-Match"

    def to_context_block(self) -> str:
        """Format as a structured text block for LLM system prompt injection."""
        lines = [
            f"=== LIVE STADIUM DATA (as of {self.timestamp}) ===",
            "",
            f"ATTENDANCE: {self.current_attendance:,} / {self.stadium_capacity:,} ({self.occupancy_pct:.1f}%)",
            f"CROWD DENSITY: {self.crowd_density_pct:.1f}%",
            "",
            "── ML PREDICTION ──",
            f"  Congestion Score: {self.ml_congestion_score:.1f}/100",
            f"  Risk Level: {self.ml_risk_level}",
            f"  Predicted Queue Time: {self.ml_predicted_queue_time:.0f}s",
            f"  Model Confidence: {self.ml_confidence:.0%}",

            "",
            "── GATES ──",
            f"  Open: {self.gates_open} / {self.gates_total}",
        ]
        for g in self.gates[:8]:
            status = g.get("status", "unknown")
            name = g.get("name", "Gate")
            queue = g.get("queue_length", 0)
            lines.append(f"  {name}: {status} (queue: {queue})")

        lines += [
            "",
            "── WEATHER ──",
            f"  Temperature: {self.weather_temp}°C",
            f"  Humidity: {self.weather_humidity}%",
            f"  Condition: {self.weather_condition}",
            f"  Rain Probability: {self.rain_probability:.0%}",
            "",
            "── MATCH ──",
            f"  Minute: {self.match_minute}'",
            f"  Status: {self.match_status}",
            "",
            "── SECURITY & QUEUES ──",
            f"  Security Queue: {self.security_queue_length:.0f} people",
            f"  Avg Wait: {self.avg_queue_wait_minutes:.1f} min",
            "",
            "── MEDICAL ──",
            f"  Active Incidents: {self.medical_incidents}",
            f"  Teams Deployed: {self.medical_teams_deployed}",
        ]

        if self.active_incidents:
            lines.append("")
            lines.append("── ACTIVE INCIDENTS ──")
            for inc in self.active_incidents[:10]:
                sev = inc.get("severity", "MEDIUM")
                typ = inc.get("type", "Unknown")
                loc = inc.get("location", "Unknown")
                lines.append(f"  [{sev}] {typ} — {loc}")

        if self.simulation_active:
            lines.append("")
            lines.append("── SIMULATION MODE ──")
            lines.append(f"  Scenario: {self.simulation_scenario}")

        lines.append("")
        lines.append("=== END LIVE DATA ===")
        return "\n".join(lines)

    def to_dict(self) -> dict:
        return asdict(self)


class StadiumContextCollector:
    """
    Collects and merges state from the unified event bus into a StadiumSnapshot.
    In production, this subscribes to the WebSocket event bus.
    For now, it accepts pushed state updates and maintains a merged view.
    """

    def __init__(self):
        self._snapshot = StadiumSnapshot()
        self._last_update = 0.0

    def get_snapshot(self) -> StadiumSnapshot:
        self._snapshot.timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        return self._snapshot

    def update_from_event(self, event_type: str, data: dict) -> None:
        """Process a single event from the unified event bus."""
        s = self._snapshot
        self._last_update = time.time()

        if event_type == "CrowdDensityUpdated":
            s.crowd_density_pct = data.get("crowd_density", s.crowd_density_pct)

        elif event_type == "PredictionUpdated":
            s.ml_congestion_score = data.get("congestion_score", s.ml_congestion_score)
            s.ml_risk_level = data.get("risk_level", data.get("risk", s.ml_risk_level))
            s.ml_predicted_queue_time = data.get("predicted_queue_time", s.ml_predicted_queue_time)
            s.ml_confidence = data.get("confidence", s.ml_confidence)

        elif event_type == "GateStatusChanged":
            gate_id = data.get("gate_id", "")
            # Update or insert gate record
            found = False
            for g in s.gates:
                if g.get("id") == gate_id:
                    g.update(data)
                    found = True
                    break
            if not found and gate_id:
                s.gates.append(data)
            s.gates_open = sum(1 for g in s.gates if g.get("status") == "open")
            s.gates_total = len(s.gates) if s.gates else 6

        elif event_type == "WeatherUpdated":
            s.weather_temp = data.get("temperature", s.weather_temp)
            s.weather_humidity = data.get("humidity", s.weather_humidity)
            s.weather_condition = data.get("condition", s.weather_condition)
            s.rain_probability = data.get("rain_probability", s.rain_probability)

        elif event_type == "IncidentCreated":
            s.active_incidents.append(data)
            s.incident_count = len(s.active_incidents)

        elif event_type == "EmergencyAlert":
            s.active_incidents.append({
                "type": data.get("type", "Emergency"),
                "severity": "CRITICAL",
                "location": data.get("camera", data.get("zone", "Unknown")),
                **data,
            })

        elif event_type == "SimulationStarted":
            s.simulation_active = True
            s.simulation_scenario = data.get("scenario", "Active")

        elif event_type == "SimulationStopped":
            s.simulation_active = False

        elif event_type == "SimulationReset":
            s.simulation_active = False
            s.active_incidents.clear()

        elif event_type == "AttendanceUpdate":
            s.current_attendance = data.get("attendance", s.current_attendance)
            s.occupancy_pct = (s.current_attendance / s.stadium_capacity) * 100

        elif event_type == "MatchUpdate":
            s.match_minute = data.get("minute", s.match_minute)
            s.match_status = data.get("status", s.match_status)

    def update_bulk(self, state: dict) -> None:
        """Accept a bulk state dict from the frontend or simulation engine."""
        s = self._snapshot
        self._last_update = time.time()

        if "attendance" in state:
            s.current_attendance = state["attendance"]
            s.occupancy_pct = (s.current_attendance / s.stadium_capacity) * 100
        if "crowdDensity" in state or "crowd_density" in state:
            s.crowd_density_pct = state.get("crowdDensity", state.get("crowd_density", 0))
        if "congestionScore" in state or "congestion_score" in state:
            s.ml_congestion_score = state.get("congestionScore", state.get("congestion_score", 0))
        if "riskLevel" in state or "risk_level" in state:
            s.ml_risk_level = state.get("riskLevel", state.get("risk_level", "LOW"))
        if "confidence" in state:
            s.ml_confidence = state["confidence"]
        if "queueTime" in state or "predicted_queue_time" in state:
            s.ml_predicted_queue_time = state.get("queueTime", state.get("predicted_queue_time", 0))
        if "weather" in state:
            w = state["weather"]
            if isinstance(w, dict):
                s.weather_temp = w.get("temperature", s.weather_temp)
                s.weather_humidity = w.get("humidity", s.weather_humidity)
                s.weather_condition = w.get("condition", s.weather_condition)
        if "gates" in state:
            s.gates = state["gates"]
            s.gates_open = sum(1 for g in s.gates if g.get("status") == "open")
            s.gates_total = len(s.gates) if s.gates else 6
        if "incidents" in state:
            s.active_incidents = state["incidents"]
            s.incident_count = len(s.active_incidents)
        if "matchMinute" in state or "match_minute" in state:
            s.match_minute = state.get("matchMinute", state.get("match_minute", 0))
        if "securityQueueLength" in state or "security_queue_length" in state:
            s.security_queue_length = state.get("securityQueueLength", state.get("security_queue_length", 0))
        if "medicalIncidents" in state or "medical_incidents" in state:
            s.medical_incidents = state.get("medicalIncidents", state.get("medical_incidents", 0))
        if "simulation" in state:
            sim = state["simulation"]
            if isinstance(sim, dict):
                s.simulation_active = sim.get("active", False)
                s.simulation_scenario = sim.get("scenario", "")


# Singleton
context_collector = StadiumContextCollector()
