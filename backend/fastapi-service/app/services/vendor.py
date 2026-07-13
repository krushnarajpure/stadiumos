from sqlalchemy.orm import Session
from app.repositories.vendor import VendorRepository
from app.models.vendor import Vendor, Product, VendorInventory, RestockOrder
from app.schemas.vendor import VendorCreate, ProductCreate, InventoryCreate, RestockRequest, VendorAnalyticsResponse
from app.core.redis_client import redis_client
from app.core.kafka_client import kafka_client
from app.core.websocket import ws_manager
from shared.utils.error_handlers import ValidationError
from typing import List
from datetime import datetime

class VendorService:
    def __init__(self, db: Session):
        self.repo = VendorRepository(db)

    def register_vendor(self, vendor_in: VendorCreate) -> Vendor:
        vendor = Vendor(
            name=vendor_in.name,
            type=vendor_in.type,
            zone_id=vendor_in.zone_id,
            status="Active"
        )
        return self.repo.create_vendor(vendor)

    def create_product(self, product_in: ProductCreate) -> Product:
        product = Product(
            name=product_in.name,
            category=product_in.category,
            price=product_in.price,
            cost=product_in.cost
        )
        return self.repo.create_product(product)

    def link_inventory(self, inv_in: InventoryCreate) -> VendorInventory:
        # Check if already mapped
        existing = self.repo.get_vendor_product_inventory(inv_in.vendor_id, inv_in.product_id)
        if existing:
            raise ValidationError("Inventory mapping for this product and vendor already exists")
            
        inv = VendorInventory(
            vendor_id=inv_in.vendor_id,
            product_id=inv_in.product_id,
            current_stock=inv_in.current_stock,
            min_threshold=inv_in.min_threshold,
            max_capacity=inv_in.max_capacity
        )
        return self.repo.create_inventory(inv)

    async def update_stock(self, inventory_id: str, current_stock: int) -> VendorInventory:
        inv = self.repo.get_inventory(inventory_id)
        if not inv:
            raise ValidationError("Inventory record not found")

        inv.current_stock = current_stock
        self.repo.update_inventory()

        # Low Stock Detection Checks
        if inv.current_stock <= inv.min_threshold:
            # Publish InventoryLow Kafka event
            kafka_client.publish_event(
                "stadiumos.vendor.inventory-low",
                key=inv.id,
                payload={
                    "inventory_id": inv.id,
                    "vendor_id": inv.vendor_id,
                    "product_id": inv.product_id,
                    "current_stock": inv.current_stock,
                    "threshold": inv.min_threshold
                }
            )

            # Auto-Trigger Restocking Proposal
            auto_quantity = inv.max_capacity - inv.current_stock
            await self.trigger_restock_order(
                RestockRequest(vendor_id=inv.vendor_id, product_id=inv.product_id, quantity=auto_quantity)
            )

        return inv

    async def trigger_restock_order(self, req: RestockRequest) -> RestockOrder:
        order = RestockOrder(
            vendor_id=req.vendor_id,
            product_id=req.product_id,
            quantity=req.quantity,
            status="Requested"
        )
        self.repo.create_restock_order(order)

        # Publish RestockRequested Kafka event
        kafka_client.publish_event(
            "stadiumos.vendor.restock-requested",
            key=order.id,
            payload={
                "order_id": order.id,
                "vendor_id": order.vendor_id,
                "product_id": order.product_id,
                "quantity": order.quantity
            }
        )

        # Broadcast live updates to WebSockets
        await ws_manager.broadcast_global({
            "event": "restock_requested",
            "order_id": order.id,
            "vendor_id": order.vendor_id,
            "quantity": order.quantity
        })

        return order

    async def complete_restock_order(self, order_id: str) -> RestockOrder:
        order = self.repo.get_restock_order(order_id)
        if not order:
            raise ValidationError("Restock order not found")

        if order.status == "Completed":
            raise ValidationError("Order is already marked as completed")

        inv = self.repo.get_vendor_product_inventory(order.vendor_id, order.product_id)
        if inv:
            inv.current_stock += order.quantity
            self.repo.update_inventory()

        order.status = "Completed"
        order.completed_at = datetime.utcnow()
        self.repo.update_inventory()

        # Publish InventoryRestocked Kafka event
        kafka_client.publish_event(
            "stadiumos.vendor.inventory-restocked",
            key=order.id,
            payload={
                "order_id": order.id,
                "vendor_id": order.vendor_id,
                "product_id": order.product_id,
                "added_quantity": order.quantity
            }
        )

        return order

    def get_low_stock(self) -> List[VendorInventory]:
        return self.repo.get_low_stock_records()

    def get_vendor_analytics(self, vendor_id: str) -> VendorAnalyticsResponse:
        cache_key = f"vendor:analytics:{vendor_id}"
        cached = redis_client.get_cache(cache_key)
        if cached:
            return VendorAnalyticsResponse(**cached)

        vendor = self.repo.get_vendor(vendor_id)
        if not vendor:
            raise ValidationError("Vendor not found.")

        inventories = self.repo.get_vendor_inventories(vendor_id)
        products = []
        total_units = 0
        total_revenue = 0.0
        total_cost = 0.0

        for inv in inventories:
            product = self.repo.get_product(inv.product_id)
            if product:
                products.append(product.name)
                sold_estimate = max(0, inv.max_capacity - inv.current_stock)
                total_units += sold_estimate
                total_revenue += sold_estimate * product.price
                total_cost += sold_estimate * product.cost

        popular = products[:3] if products else []
        res = VendorAnalyticsResponse(
            vendor_id=vendor_id,
            sales_volume_units=total_units,
            revenue_usd=round(total_revenue, 2),
            cost_usd=round(total_cost, 2),
            net_profit_usd=round(total_revenue - total_cost, 2),
            popular_products=popular,
        )

        redis_client.set_cache(cache_key, res.dict(), ttl=600)
        kafka_client.publish_event(
            "stadiumos.vendor.performance-updated",
            key=vendor_id,
            payload=res.dict()
        )
        return res
