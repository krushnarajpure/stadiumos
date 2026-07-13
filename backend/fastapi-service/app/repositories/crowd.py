from sqlalchemy.orm import Session
from app.models.crowd import Stadium, Zone, CrowdSnapshot, CrowdAlert, OccupancyThreshold, CrowdHistory
from typing import List, Optional

class CrowdRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_stadium(self, stadium_id: str) -> Optional[Stadium]:
        return self.db.query(Stadium).filter(Stadium.id == stadium_id).first()

    def get_zones(self, stadium_id: Optional[str] = None) -> List[Zone]:
        query = self.db.query(Zone)
        if stadium_id:
            query = query.filter(Zone.stadium_id == stadium_id)
        return query.all()

    def get_zone_by_id(self, zone_id: str) -> Optional[Zone]:
        return self.db.query(Zone).filter(Zone.id == zone_id).first()

    def create_snapshot(self, snapshot: CrowdSnapshot) -> CrowdSnapshot:
        self.db.add(snapshot)
        self.db.commit()
        self.db.refresh(snapshot)
        return snapshot

    def create_alert(self, alert: CrowdAlert) -> CrowdAlert:
        self.db.add(alert)
        self.db.commit()
        self.db.refresh(alert)
        return alert

    def get_active_alerts(self, zone_id: Optional[str] = None) -> List[CrowdAlert]:
        query = self.db.query(CrowdAlert).filter(CrowdAlert.is_active == True)
        if zone_id:
            query = query.filter(CrowdAlert.zone_id == zone_id)
        return query.order_by(CrowdAlert.created_at.desc()).all()

    def get_zone_thresholds(self, zone_id: str) -> Optional[OccupancyThreshold]:
        return self.db.query(OccupancyThreshold).filter(OccupancyThreshold.zone_id == zone_id).first()

    def update_thresholds(self, thresholds: OccupancyThreshold) -> OccupancyThreshold:
        self.db.add(thresholds)
        self.db.commit()
        self.db.refresh(thresholds)
        return thresholds

    def write_history(self, history: CrowdHistory) -> CrowdHistory:
        self.db.add(history)
        self.db.commit()
        self.db.refresh(history)
        return history

    def get_zone_history(self, zone_id: str, limit: int = 100) -> List[CrowdHistory]:
        return self.db.query(CrowdHistory)\
            .filter(CrowdHistory.zone_id == zone_id)\
            .order_by(CrowdHistory.recorded_at.desc())\
            .limit(limit).all()
