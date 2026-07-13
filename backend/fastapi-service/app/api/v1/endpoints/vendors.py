from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, status, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, PermissionChecker
from app.models.auth import User
from app.schemas.vendor import (
    VendorCreate,
    VendorResponse,
    InventoryCreate,
    InventoryResponse,
    InventoryUpdate,
    RestockRequest,
    RestockOrderResponse,
    VendorAnalyticsResponse,
    ProductAnalyticsResponse
)
from app.services.vendor import VendorService
from app.core.websocket import ws_manager
from typing import List
import logging
from datetime import datetime

logger = logging.getLogger("fastapi")

router = APIRouter()

# RBAC permission groups
ops_or_admin = PermissionChecker(["Operations Manager", "Administrator"])
vendor_or_ops = PermissionChecker(["Vendor", "Operations Manager", "Administrator"])

@router.get("/", response_model=List[VendorResponse])
def list_vendors(db: Session = Depends(get_db)):
    """
    List all vendors.
    
    Lists names, types, and zones of all registered stadium concessions.
    """
    service = VendorService(db)
    return service.repo.get_all_vendors()

@router.post("/", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
def register_vendor(vendor_in: VendorCreate, current_user: User = Depends(ops_or_admin), db: Session = Depends(get_db)):
    """
    Register a new vendor.
    
    Creates a new vendor profile linked to a specific stadium zone area.
    """
    service = VendorService(db)
    return service.register_vendor(vendor_in)

@router.get("/inventory", response_model=List[InventoryResponse])
def list_inventory(current_user: User = Depends(vendor_or_ops), db: Session = Depends(get_db)):
    """
    List vendor inventories.
    
    Lists stock levels, capacities, and warning thresholds across all products.
    """
    service = VendorService(db)
    return service.repo.get_all_inventory()

@router.post("/inventory", response_model=InventoryResponse, status_code=status.HTTP_201_CREATED)
def link_inventory(
    inv_in: InventoryCreate,
    current_user: User = Depends(ops_or_admin),
    db: Session = Depends(get_db)
):
    """
    Link product inventory to vendor.
    
    Assigns a product with custom stock bounds to a specific vendor concessions profile.
    """
    service = VendorService(db)
    return service.link_inventory(inv_in)

@router.patch("/inventory/{id}", response_model=InventoryResponse)
async def update_inventory_stock(
    id: str,
    update_in: InventoryUpdate,
    current_user: User = Depends(vendor_or_ops),
    db: Session = Depends(get_db)
):
    """
    Update vendor inventory stock.
    
    Modifies active counts for the specified inventory record and triggers WebSocket updates.
    """
    service = VendorService(db)
    return await service.update_stock(id, update_in.current_stock)

@router.get("/inventory/low-stock", response_model=List[InventoryResponse])
def get_low_stock(current_user: User = Depends(vendor_or_ops), db: Session = Depends(get_db)):
    """
    Get low stock inventory.
    
    Returns lists of active inventories where the current stock falls below warning thresholds.
    """
    service = VendorService(db)
    return service.get_low_stock()

@router.post("/restock", response_model=RestockOrderResponse, status_code=status.HTTP_201_CREATED)
async def trigger_restock(
    req: RestockRequest,
    current_user: User = Depends(vendor_or_ops),
    db: Session = Depends(get_db)
):
    """
    Trigger restocking order.
    
    Creates a new pending supply restock request for a vendor product.
    """
    service = VendorService(db)
    return await service.trigger_restock_order(req)

@router.post("/restock/{id}/complete", response_model=RestockOrderResponse)
async def complete_restock(
    id: str,
    current_user: User = Depends(ops_or_admin),
    db: Session = Depends(get_db)
):
    """
    Complete restocking order.
    
    Confirms delivery arrival and updates current inventory stock numbers.
    """
    service = VendorService(db)
    return await service.complete_restock_order(id)

@router.get("/analytics/vendor", response_model=VendorAnalyticsResponse)
def get_vendor_analytics(
    vendor_id: str = Query(..., description="Target Vendor ID"),
    current_user: User = Depends(vendor_or_ops),
    db: Session = Depends(get_db)
):
    """
    Get vendor sales analytics.
    
    Returns total revenues, costs, and popular product counts for the vendor.
    """
    service = VendorService(db)
    return service.get_vendor_analytics(vendor_id)

@router.get("/analytics/products", response_model=ProductAnalyticsResponse)
def get_products_analytics(current_user: User = Depends(vendor_or_ops), db: Session = Depends(get_db)):
    """
    Get product-wide sales analytics.
    
    Calculates average hourly sales, predicted demand spikes, and top-purchased categories.
    """
    service = VendorService(db)
    inventories = service.repo.get_all_inventory()
    products = []
    category_counts: dict[str, int] = {}
    total_revenue = 0.0

    for inv in inventories:
        product = service.repo.get_product(inv.product_id)
        if product:
            products.append(product)
            category_counts[product.category] = category_counts.get(product.category, 0) + 1
            sold = max(0, inv.max_capacity - inv.current_stock)
            total_revenue += sold * product.price

    most_purchased = max(category_counts, key=category_counts.get) if category_counts else "N/A"
    hourly_avg = round(total_revenue / max(len(inventories), 1), 2)

    return {
        "most_purchased_category": most_purchased,
        "hourly_sales_average_usd": hourly_avg,
        "predicted_demand_spike_time": datetime.utcnow().strftime("%H:%M:%SZ"),
    }

@router.get("/{id}", response_model=VendorResponse)
def get_vendor_by_id(id: str, db: Session = Depends(get_db)):
    """
    Get vendor by ID.
    
    Returns details of the specified vendor concessions profile.
    """
    service = VendorService(db)
    vendor = service.repo.get_vendor(id)
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor profile not found")
    return vendor

# WebSocket channel for live stock and restocking updates
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket stream for live vendor inventory updates.
    
    Connects clients to receive real-time updates regarding inventory adjustments and restocking confirmations.
    """
    await ws_manager.connect(websocket, None)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({"ping": "received", "data": data})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, None)
        logger.info("WebSocket client disconnected from vendor updates channel")
