from sqlalchemy.orm import Session
from app.models.vendor import Vendor, Product, VendorInventory, RestockOrder
from typing import List, Optional

class VendorRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_vendor(self, id: str) -> Optional[Vendor]:
        return self.db.query(Vendor).filter(Vendor.id == id).first()

    def get_all_vendors(self) -> List[Vendor]:
        return self.db.query(Vendor).all()

    def create_vendor(self, vendor: Vendor) -> Vendor:
        self.db.add(vendor)
        self.db.commit()
        self.db.refresh(vendor)
        return vendor

    def get_product(self, id: str) -> Optional[Product]:
        return self.db.query(Product).filter(Product.id == id).first()

    def create_product(self, product: Product) -> Product:
        self.db.add(product)
        self.db.commit()
        self.db.refresh(product)
        return product

    def get_inventory(self, id: str) -> Optional[VendorInventory]:
        return self.db.query(VendorInventory).filter(VendorInventory.id == id).first()

    def get_vendor_product_inventory(self, vendor_id: str, product_id: str) -> Optional[VendorInventory]:
        return self.db.query(VendorInventory).filter(
            VendorInventory.vendor_id == vendor_id,
            VendorInventory.product_id == product_id
        ).first()

    def get_all_inventory(self) -> List[VendorInventory]:
        return self.db.query(VendorInventory).all()

    def get_vendor_inventories(self, vendor_id: str) -> List[VendorInventory]:
        return self.db.query(VendorInventory).filter(VendorInventory.vendor_id == vendor_id).all()

    def create_inventory(self, inventory: VendorInventory) -> VendorInventory:
        self.db.add(inventory)
        self.db.commit()
        self.db.refresh(inventory)
        return inventory

    def update_inventory(self) -> None:
        self.db.commit()

    def get_low_stock_records(self) -> List[VendorInventory]:
        return self.db.query(VendorInventory).filter(
            VendorInventory.current_stock <= VendorInventory.min_threshold
        ).all()

    def create_restock_order(self, order: RestockOrder) -> RestockOrder:
        self.db.add(order)
        self.db.commit()
        self.db.refresh(order)
        return order

    def get_restock_order(self, order_id: str) -> Optional[RestockOrder]:
        return self.db.query(RestockOrder).filter(RestockOrder.id == order_id).first()
