from sqlalchemy.orm import Session
from app.repositories.crowd import CrowdRepository
from app.models.crowd import CrowdSnapshot, CrowdAlert, OccupancyThreshold, CrowdHistory
from app.schemas.crowd import CrowdSnapshotCreate, CrowdAlertCreate, ThresholdUpdate, HeatmapDataResponse
from app.core.redis_client import redis_client
from app.core.kafka_client import kafka_client
from app.core.websocket import ws_manager
from shared.utils.error_handlers import ValidationError
from typing import List, Optional
import logging

logger = logging.getLogger("fastapi")

class CrowdService:
    def __init__(self, db: Session):
        self.repo = CrowdRepository(db)

    def get_all_zones(self, stadium_id: Optional[str] = None):
        return self.repo.get_zones(stadium_id)

    def get_zone(self, zone_id: str):
        zone = self.repo.get_zone_by_id(zone_id)
        if not zone:
            raise ValidationError("Stadium zone profile not found.")
        return zone

    async def record_snapshot(self, snapshot_in: CrowdSnapshotCreate) -> CrowdSnapshot:
        zone = self.repo.get_zone_by_id(snapshot_in.zone_id)
        if not zone:
            raise ValidationError("Target zone profile not found.")

        # Compute zone occupancy percentage
        occupancy_pct = (snapshot_in.headcount / zone.max_capacity) * 100.0

        # Evaluate Occupancy Thresholds
        thresholds = self.repo.get_zone_thresholds(zone.id)
        if not thresholds:
            # Create default thresholds if missing
            thresholds = OccupancyThreshold(zone_id=zone.id, busy_pct=70.0, critical_pct=90.0)
            self.repo.update_thresholds(thresholds)

        # Determine zone status
        new_status = "Normal"
        if occupancy_pct >= thresholds.critical_pct:
            new_status = "Critical"
        elif occupancy_pct >= thresholds.busy_pct:
            new_status = "Busy"

        # Update Zone Status in Database
        if zone.status != new_status:
            zone.status = new_status
            
            # Emit Kafka event on threshold state transitions
            if new_status in ["Busy", "Critical"]:
                kafka_client.publish_event(
                    "stadiumos.crowd.threshold-exceeded",
                    key=zone.id,
                    payload={
                        "zone_id": zone.id,
                        "occupancy_pct": occupancy_pct,
                        "status": new_status,
                        "message": f"Zone '{zone.name}' has entered {new_status} state ({occupancy_pct:.1f}% occupied)."
                    }
                )

        # Write snapshot record to DB
        snapshot = CrowdSnapshot(
            zone_id=zone.id,
            headcount=snapshot_in.headcount,
            occupancy_pct=occupancy_pct
        )
        self.repo.create_snapshot(snapshot)

        # Write to historical logs
        history = CrowdHistory(
            zone_id=zone.id,
            headcount=snapshot_in.headcount
        )
        self.repo.write_history(history)

        # Cache live occupancy, headcount and status in Redis
        redis_client.set_cache(f"stadiumos:zone:{zone.id}:occupancy", occupancy_pct, ttl=300)
        redis_client.set_cache(f"stadiumos:zone:{zone.id}:headcount", snapshot_in.headcount, ttl=300)
        redis_client.set_cache(f"stadiumos:zone:{zone.id}:status", new_status, ttl=300)

        # Publish CrowdUpdated Kafka Event
        kafka_client.publish_event(
            "stadiumos.crowd.updated",
            key=zone.id,
            payload={
                "zone_id": zone.id,
                "headcount": snapshot_in.headcount,
                "occupancy_pct": occupancy_pct,
                "status": new_status
            }
        )

        # Broadcast live update to WebSockets
        await ws_manager.broadcast_to_zone(
            zone_id=zone.id,
            message={
                "event": "crowd_updated",
                "zone_id": zone.id,
                "headcount": snapshot_in.headcount,
                "occupancy_pct": occupancy_pct,
                "status": new_status
            }
        )

        # Also broadcast global heatmap updates
        await ws_manager.broadcast_global({
            "event": "heatmap_refresh",
            "zone_id": zone.id,
            "occupancy_pct": occupancy_pct,
            "status": new_status
        })

        return snapshot

    async def raise_custom_alert(self, alert_in: CrowdAlertCreate) -> CrowdAlert:
        new_alert = CrowdAlert(
            zone_id=alert_in.zone_id,
            severity=alert_in.severity,
            message=alert_in.message,
            is_active=True
        )
        self.repo.create_alert(new_alert)

        # Emit Kafka security alert event
        kafka_client.publish_event(
            "stadiumos.crowd.alert",
            key=alert_in.zone_id,
            payload={
                "alert_id": new_alert.id,
                "zone_id": alert_in.zone_id,
                "severity": alert_in.severity,
                "message": alert_in.message
            }
        )

        # Broadcast alert to all active WS clients
        await ws_manager.broadcast_global({
            "event": "crowd_alert",
            "alert_id": new_alert.id,
            "zone_id": alert_in.zone_id,
            "severity": alert_in.severity,
            "message": alert_in.message
        })

        return new_alert

    def get_live_alerts(self, zone_id: Optional[str] = None):
        return self.repo.get_active_alerts(zone_id)

    def modify_thresholds(self, zone_id: str, threshold_in: ThresholdUpdate):
        thresholds = self.repo.get_zone_thresholds(zone_id)
        if not thresholds:
            thresholds = OccupancyThreshold(zone_id=zone_id)

        thresholds.busy_pct = threshold_in.busy_pct
        thresholds.critical_pct = threshold_in.critical_pct
        
        self.repo.update_thresholds(thresholds)
        return thresholds

    def get_heatmap_metrics(self) -> List[HeatmapDataResponse]:
        # Try fetching metrics from Redis, fallback to DB
        zones = self.repo.get_zones()
        heatmap_data = []

        for zone in zones:
            occupancy = redis_client.get_cache(f"stadiumos:zone:{zone.id}:occupancy")
            headcount = redis_client.get_cache(f"stadiumos:zone:{zone.id}:headcount")
            status = redis_client.get_cache(f"stadiumos:zone:{zone.id}:status")

            if occupancy is None or headcount is None:
                # Fallback to last snapshot
                # Note: Defaulting to 0 if no snapshots exist yet
                occupancy = 0.0
                headcount = 0
                status = zone.status

            heatmap_data.append(
                HeatmapDataResponse(
                    zone_id=zone.id,
                    zone_name=zone.name,
                    occupancy_pct=float(occupancy),
                    headcount=int(headcount),
                    status=status
                )
            )
        return heatmap_data

    def get_historical_logs(self, zone_id: str, limit: int = 100):
        return self.repo.get_zone_history(zone_id, limit)
