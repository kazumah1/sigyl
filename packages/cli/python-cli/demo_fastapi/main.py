"""
Demo FastAPI Application

A comprehensive sample FastAPI application with various endpoints to test the MCP CLI scanner.
This app demonstrates different FastAPI patterns including path parameters, query parameters,
request bodies, Pydantic models, and various HTTP methods.
"""

from fastapi import FastAPI, Path, Query, Body, HTTPException, Depends
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from enum import Enum
import uvicorn
from datetime import datetime, date

app = FastAPI(
    title="Demo FastAPI App",
    description="A comprehensive demo FastAPI application for testing MCP CLI",
    version="1.0.0"
)

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"

class User(BaseModel):
    id: int = Field(..., description="Unique user identifier")
    name: str = Field(..., min_length=1, max_length=100, description="User's full name")
    email: EmailStr = Field(..., description="User's email address")
    age: Optional[int] = Field(None, ge=0, le=150, description="User's age")
    status: UserStatus = Field(default=UserStatus.ACTIVE, description="User's status")
    created_at: datetime = Field(default_factory=datetime.now, description="Account creation timestamp")

class CreateUserRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="User's full name")
    email: EmailStr = Field(..., description="User's email address")
    age: Optional[int] = Field(None, ge=0, le=150, description="User's age")
    status: UserStatus = Field(default=UserStatus.ACTIVE, description="User's status")

class UpdateUserRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="User's full name")
    email: Optional[EmailStr] = Field(None, description="User's email address")
    age: Optional[int] = Field(None, ge=0, le=150, description="User's age")
    status: Optional[UserStatus] = Field(None, description="User's status")

class Product(BaseModel):
    id: int = Field(..., description="Unique product identifier")
    name: str = Field(..., min_length=1, max_length=200, description="Product name")
    description: Optional[str] = Field(None, description="Product description")
    price: float = Field(..., gt=0, description="Product price")
    category: str = Field(..., description="Product category")
    in_stock: bool = Field(default=True, description="Product availability")
    tags: List[str] = Field(default=[], description="Product tags")

class CreateProductRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Product name")
    description: Optional[str] = Field(None, description="Product description")
    price: float = Field(..., gt=0, description="Product price")
    category: str = Field(..., description="Product category")
    in_stock: bool = Field(default=True, description="Product availability")
    tags: List[str] = Field(default=[], description="Product tags")

class SearchFilters(BaseModel):
    query: Optional[str] = Field(None, description="Search query")
    category: Optional[str] = Field(None, description="Filter by category")
    min_price: Optional[float] = Field(None, ge=0, description="Minimum price")
    max_price: Optional[float] = Field(None, ge=0, description="Maximum price")
    in_stock: Optional[bool] = Field(None, description="Filter by stock availability")

# ============================================================================
# SAMPLE DATA
# ============================================================================

users = [
    User(id=1, name="John Doe", email="john@example.com", age=30, status=UserStatus.ACTIVE),
    User(id=2, name="Jane Smith", email="jane@example.com", age=25, status=UserStatus.ACTIVE),
    User(id=3, name="Bob Johnson", email="bob@example.com", age=35, status=UserStatus.INACTIVE),
    User(id=4, name="Alice Brown", email="alice@example.com", age=28, status=UserStatus.PENDING),
]

products = [
    Product(id=1, name="Laptop", description="High-performance laptop", price=999.99, category="Electronics", tags=["computer", "tech"]),
    Product(id=2, name="Smartphone", description="Latest smartphone model", price=699.99, category="Electronics", tags=["mobile", "tech"]),
    Product(id=3, name="Coffee Mug", description="Ceramic coffee mug", price=12.99, category="Kitchen", tags=["drinkware", "kitchen"]),
    Product(id=4, name="Running Shoes", description="Comfortable running shoes", price=89.99, category="Sports", in_stock=False, tags=["footwear", "sports"]),
]

# ============================================================================
# USER ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    """Get root endpoint with API information"""
    return {
        "message": "Welcome to Demo FastAPI App!",
        "version": "1.0.0",
        "endpoints": {
            "users": "/users",
            "products": "/products",
            "health": "/health"
        }
    }

@app.get("/users")
async def get_users(
    limit: Optional[int] = Query(None, ge=1, le=100, description="Limit number of users returned"),
    offset: Optional[int] = Query(0, ge=0, description="Number of users to skip"),
    status: Optional[UserStatus] = Query(None, description="Filter users by status"),
    search: Optional[str] = Query(None, description="Search users by name or email")
):
    """Get all users with optional filtering and pagination"""
    filtered_users = users.copy()
    
    # Filter by status
    if status:
        filtered_users = [u for u in filtered_users if u.status == status]
    
    # Search by name or email
    if search:
        search_lower = search.lower()
        filtered_users = [
            u for u in filtered_users 
            if search_lower in u.name.lower() or search_lower in u.email.lower()
        ]
    
    # Apply pagination
    if offset:
        filtered_users = filtered_users[offset:]
    if limit:
        filtered_users = filtered_users[:limit]
    
    return {
        "users": filtered_users,
        "total": len(filtered_users),
        "limit": limit,
        "offset": offset
    }

@app.get("/users/{user_id}")
async def get_user(user_id: int = Path(..., ge=1, description="User ID to retrieve")):
    """Get a specific user by ID"""
    for user in users:
        if user.id == user_id:
            return user
    raise HTTPException(status_code=404, detail="User not found")

@app.post("/users")
async def create_user(user_data: CreateUserRequest = Body(..., description="User data to create")):
    """Create a new user"""
    # Check if email already exists
    for user in users:
        if user.email == user_data.email:
            raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = User(
        id=len(users) + 1,
        name=user_data.name,
        email=user_data.email,
        age=user_data.age,
        status=user_data.status
    )
    users.append(new_user)
    return new_user

@app.put("/users/{user_id}")
async def update_user(
    user_id: int = Path(..., ge=1, description="User ID to update"),
    user_data: UpdateUserRequest = Body(..., description="Updated user data")
):
    """Update an existing user"""
    for user in users:
        if user.id == user_id:
            if user_data.name:
                user.name = user_data.name
            if user_data.email:
                # Check if email already exists (excluding current user)
                for other_user in users:
                    if other_user.id != user_id and other_user.email == user_data.email:
                        raise HTTPException(status_code=400, detail="Email already registered")
                user.email = user_data.email
            if user_data.age is not None:
                user.age = user_data.age
            if user_data.status:
                user.status = user_data.status
            return user
    raise HTTPException(status_code=404, detail="User not found")

@app.delete("/users/{user_id}")
async def delete_user(user_id: int = Path(..., ge=1, description="User ID to delete")):
    """Delete a user"""
    for i, user in enumerate(users):
        if user.id == user_id:
            deleted_user = users.pop(i)
            return {"message": f"User {deleted_user.name} deleted successfully"}
    raise HTTPException(status_code=404, detail="User not found")

# ============================================================================
# PRODUCT ENDPOINTS
# ============================================================================

@app.get("/products")
async def get_products(
    category: Optional[str] = Query(None, description="Filter by product category"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price filter"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price filter"),
    in_stock: Optional[bool] = Query(None, description="Filter by stock availability"),
    sort_by: Optional[str] = Query("name", description="Sort field (name, price, category)"),
    limit: Optional[int] = Query(None, ge=1, le=100, description="Limit number of products")
):
    """Get all products with optional filtering and sorting"""
    filtered_products = products.copy()
    
    # Apply filters
    if category:
        filtered_products = [p for p in filtered_products if p.category.lower() == category.lower()]
    if min_price is not None:
        filtered_products = [p for p in filtered_products if p.price >= min_price]
    if max_price is not None:
        filtered_products = [p for p in filtered_products if p.price <= max_price]
    if in_stock is not None:
        filtered_products = [p for p in filtered_products if p.in_stock == in_stock]
    
    # Apply sorting
    if sort_by == "price":
        filtered_products.sort(key=lambda p: p.price)
    elif sort_by == "category":
        filtered_products.sort(key=lambda p: p.category)
    else:  # default to name
        filtered_products.sort(key=lambda p: p.name)
    
    # Apply limit
    if limit:
        filtered_products = filtered_products[:limit]
    
    return {
        "products": filtered_products,
        "total": len(filtered_products),
        "filters": {
            "category": category,
            "min_price": min_price,
            "max_price": max_price,
            "in_stock": in_stock
        }
    }

@app.get("/products/{product_id}")
async def get_product(product_id: int = Path(..., ge=1, description="Product ID to retrieve")):
    """Get a specific product by ID"""
    for product in products:
        if product.id == product_id:
            return product
    raise HTTPException(status_code=404, detail="Product not found")

@app.post("/products")
async def create_product(product_data: CreateProductRequest = Body(..., description="Product data to create")):
    """Create a new product"""
    new_product = Product(
        id=len(products) + 1,
        name=product_data.name,
        description=product_data.description,
        price=product_data.price,
        category=product_data.category,
        in_stock=product_data.in_stock,
        tags=product_data.tags
    )
    products.append(new_product)
    return new_product

@app.put("/products/{product_id}")
async def update_product(
    product_id: int = Path(..., ge=1, description="Product ID to update"),
    product_data: CreateProductRequest = Body(..., description="Updated product data")
):
    """Update an existing product"""
    for product in products:
        if product.id == product_id:
            product.name = product_data.name
            product.description = product_data.description
            product.price = product_data.price
            product.category = product_data.category
            product.in_stock = product_data.in_stock
            product.tags = product_data.tags
            return product
    raise HTTPException(status_code=404, detail="Product not found")

@app.delete("/products/{product_id}")
async def delete_product(product_id: int = Path(..., ge=1, description="Product ID to delete")):
    """Delete a product"""
    for i, product in enumerate(products):
        if product.id == product_id:
            deleted_product = products.pop(i)
            return {"message": f"Product {deleted_product.name} deleted successfully"}
    raise HTTPException(status_code=404, detail="Product not found")

# ============================================================================
# SEARCH ENDPOINTS
# ============================================================================

@app.post("/search")
async def search_products(filters: SearchFilters = Body(..., description="Search filters")):
    """Search products with advanced filters"""
    filtered_products = products.copy()
    
    # Apply search query
    if filters.query:
        query_lower = filters.query.lower()
        filtered_products = [
            p for p in filtered_products
            if (query_lower in p.name.lower() or 
                (p.description and query_lower in p.description.lower()) or
                any(query_lower in tag.lower() for tag in p.tags))
        ]
    
    # Apply other filters
    if filters.category:
        filtered_products = [p for p in filtered_products if p.category.lower() == filters.category.lower()]
    if filters.min_price is not None:
        filtered_products = [p for p in filtered_products if p.price >= filters.min_price]
    if filters.max_price is not None:
        filtered_products = [p for p in filtered_products if p.price <= filters.max_price]
    if filters.in_stock is not None:
        filtered_products = [p for p in filtered_products if p.in_stock == filters.in_stock]
    
    return {
        "products": filtered_products,
        "total": len(filtered_products),
        "filters": filters.dict()
    }

# ============================================================================
# UTILITY ENDPOINTS
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(),
        "stats": {
            "users_count": len(users),
            "products_count": len(products)
        }
    }

@app.get("/stats")
async def get_stats():
    """Get application statistics"""
    return {
        "users": {
            "total": len(users),
            "by_status": {
                status.value: len([u for u in users if u.status == status])
                for status in UserStatus
            }
        },
        "products": {
            "total": len(products),
            "by_category": {},
            "in_stock": len([p for p in products if p.in_stock]),
            "out_of_stock": len([p for p in products if not p.in_stock])
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 