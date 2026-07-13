from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime

class VendorCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=255)
    type: str = Field(..., pattern="^(Food|Beverage|Merchandise)$")
    zone_id: str

class VendorResponse(VendorCreate):
    id: str
    status: str

    model_config = ConfigDict(from_attributes=True)

class ProductCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=255)
    category: str
    price: float = Field(..., ge=0.0)
    cost: float = Field(..., ge=0.0)

class ProductResponse(ProductCreate):
    id: str

    model_config = ConfigDict(from_attributes=True)

class InventoryCreate(BaseModel):
    vendor_id: str
    product_id: str
    current_stock: int = Field(0, ge=0)
    min_threshold: int = Field(10, ge=0)
    max_capacity: int = Field(500, ge=1)

class InventoryUpdate(BaseModel):
    current_stock: int = Field(..., ge=0)

class InventoryResponse(BaseModel):
    id: str
    vendor_id: str
    product_id: str
    current_stock: int
    min_threshold: int
    max_capacity: int

    model_config = ConfigDict(from_attributes=True)

class RestockRequest(BaseModel):
    vendor_id: str
    product_id: str
    quantity: int = Field(..., ge=1)

class RestockOrderResponse(RestockRequest):
    id: str
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class VendorAnalyticsResponse(BaseModel):
    vendor_id: str
    sales_volume_units: int
    revenue_usd: float
    cost_usd: float
    net_profit_usd: float
    popular_products: List[str]

class ProductAnalyticsResponse(BaseModel):
    most_purchased_category: str = Field(..., description="Top purchased product category name", json_schema_extra={"example": "Food"})
    hourly_sales_average_usd: float = Field(..., description="Average hourly product sales in USD", json_schema_extra={"example": 124.50})
    predicted_demand_spike_time: str = Field(..., description="ISO 8601 formatted time of predicted peak product demand", json_schema_extra={"example": "16:30:00Z"})

