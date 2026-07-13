import logging
import os

from app.db.session import SessionLocal
from app.models.auth import User, Role
from app.models.crowd import Stadium, Zone, OccupancyThreshold, CrowdSnapshot
from app.models.vendor import Vendor, Product, VendorInventory
from app.core.security import get_password_hash
from datetime import datetime, timedelta
import random

logger = logging.getLogger("fastapi")

DEFAULT_ROLES = [
    ("Administrator", "Full system administration access"),
    ("Operations Manager", "Stadium operations command console access"),
    ("Security Staff", "Security monitoring and incident response"),
    ("Medical Staff", "Medical emergency response access"),
    ("Vendor", "Concessions and vendor operations access"),
    ("Fan", "General fan spectator access"),
]

DEMO_OPERATOR = {
    "email": os.getenv("STADIUMOS_DEMO_OPERATOR_EMAIL", "operator@stadiumos.dev"),
    "password": os.getenv("STADIUMOS_DEMO_OPERATOR_PASSWORD", ""),
    "role": "Operations Manager",
}

DEMO_ZONES = [
    ("North Gate A", 2000, "Critical"),
    ("South Gate B", 2000, "Normal"),
    ("VIP Area", 1000, "Normal"),
    ("Food Court East", 2000, "Busy"),
    ("Parking Lot C", 2000, "Busy"),
    ("Emergency Exit 4", 1000, "Normal"),
]


def seed_database() -> None:
    db = SessionLocal()
    try:
        for name, description in DEFAULT_ROLES:
            if not db.query(Role).filter(Role.name == name).first():
                db.add(Role(name=name, description=description))

        db.commit()

        demo_role = db.query(Role).filter(Role.name == DEMO_OPERATOR["role"]).first()
        demo_user = db.query(User).filter(User.email == DEMO_OPERATOR["email"]).first()
        if demo_role and not demo_user and DEMO_OPERATOR["password"]:
            demo_user = User(
                email=DEMO_OPERATOR["email"],
                password_hash=get_password_hash(DEMO_OPERATOR["password"]),
                is_active=True,
                is_verified=True,
            )
            demo_user.roles.append(demo_role)
            db.add(demo_user)
            db.commit()
            logger.info("Seeded demo operator account: %s", DEMO_OPERATOR["email"])

        # Promote any existing @stadiumos.dev accounts stuck on Fan role
        fan_role = db.query(Role).filter(Role.name == "Fan").first()
        ops_role = db.query(Role).filter(Role.name == "Operations Manager").first()
        if fan_role and ops_role:
            dev_users = db.query(User).filter(User.email.like("%@stadiumos.dev")).all()
            for user in dev_users:
                role_names = [r.name for r in user.roles]
                if role_names == ["Fan"]:
                    user.roles = [ops_role]
            db.commit()

        if not db.query(Stadium).first():
            stadium = Stadium(
                name="Lusail Stadium",
                location="Lusail, Qatar",
                total_capacity=88000,
            )
            db.add(stadium)
            db.flush()

            for zone_name, capacity, status in DEMO_ZONES:
                zone = Zone(
                    name=zone_name,
                    stadium_id=stadium.id,
                    max_capacity=capacity,
                    status=status,
                )
                db.add(zone)
                db.flush()
                db.add(OccupancyThreshold(zone_id=zone.id, busy_pct=70.0, critical_pct=90.0))

                # Seed crowd snapshots for history charts
                base_headcount = int(capacity * (0.3 if status == "Normal" else 0.7 if status == "Busy" else 0.92))
                for hours_ago in range(6, 0, -1):
                    headcount = base_headcount + random.randint(-50, 50)
                    occupancy = (headcount / capacity) * 100
                    db.add(CrowdSnapshot(
                        zone_id=zone.id,
                        headcount=max(0, headcount),
                        occupancy_pct=round(occupancy, 1),
                        recorded_at=datetime.utcnow() - timedelta(minutes=hours_ago * 15),
                    ))

            db.commit()
            logger.info("Seeded demo stadium zones for crowd monitoring")

        if not db.query(Vendor).first():
            zones = db.query(Zone).all()
            if zones:
                vendor = Vendor(name="Concourse Food Kiosk", type="Food", zone_id=zones[0].id, status="Active")
                db.add(vendor)
                db.flush()

                products = [
                    Product(name="Bottled Water", category="Beverage", price=4.0, cost=1.0),
                    Product(name="Hot Dogs", category="Food", price=8.0, cost=3.0),
                    Product(name="Stadium Poncho", category="Merchandise", price=15.0, cost=5.0),
                ]
                for p in products:
                    db.add(p)
                db.flush()

                for i, p in enumerate(products):
                    stock = 5 if i == 0 else 120
                    db.add(VendorInventory(
                        vendor_id=vendor.id,
                        product_id=p.id,
                        current_stock=stock,
                        min_threshold=20,
                        max_capacity=500,
                    ))

                db.commit()
                logger.info("Seeded demo vendor and inventory data")
    except Exception as exc:
        db.rollback()
        logger.warning("Database seed skipped: %s", exc)
    finally:
        db.close()
