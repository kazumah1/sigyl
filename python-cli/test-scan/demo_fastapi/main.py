"""
Demo FastAPI Application

This is a demo FastAPI app with various endpoints for testing the MCP CLI.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uvicorn

app = FastAPI(
    title="Demo FastAPI App",
    description="A demo FastAPI application for testing MCP CLI",
    version="1.0.0"
)

# Pydantic models
class User(BaseModel):
    id: int
    name: str
    email: str
    age: Optional[int] = None

class CreateUserRequest(BaseModel):
    name: str
    email: str
    age: Optional[int] = None

class UpdateUserRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    age: Optional[int] = None

# Mock data
users = [
    User(id=1, name="John Doe", email="john@example.com", age=30),
    User(id=2, name="Jane Smith", email="jane@example.com", age=25),
    User(id=3, name="Bob Johnson", email="bob@example.com", age=35)
]

# Endpoints
@app.get("/")
async def root():
    """Get root endpoint"""
    return {"message": "Hello from Demo FastAPI App!"}

@app.get("/users")
async def get_users():
    """Get all users"""
    return {"users": [user.dict() for user in users]}

@app.get("/users/{user_id}")
async def get_user(user_id: int):
    """Get user by ID"""
    user = next((u for u in users if u.id == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user.dict()

@app.post("/users")
async def create_user(user: CreateUserRequest):
    """Create a new user"""
    new_id = max(u.id for u in users) + 1
    new_user = User(id=new_id, **user.dict())
    users.append(new_user)
    return new_user.dict()

@app.put("/users/{user_id}")
async def update_user(user_id: int, user_update: UpdateUserRequest):
    """Update user by ID"""
    user = next((u for u in users if u.id == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    return user.dict()

@app.delete("/users/{user_id}")
async def delete_user(user_id: int):
    """Delete user by ID"""
    global users
    user = next((u for u in users if u.id == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    users = [u for u in users if u.id != user_id]
    return {"message": f"User {user_id} deleted successfully"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "users_count": len(users)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
