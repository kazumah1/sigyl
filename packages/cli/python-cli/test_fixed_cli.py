#!/usr/bin/env python3
"""
Test script for the fixed Python CLI
"""

import sys
import os
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from mcp_wrap.scanner import FastAPIScanner
    from mcp_wrap.generator import MCPGenerator
    
    print("✅ Successfully imported modules")
    
    # Test scanner
    scanner = FastAPIScanner()
    print("✅ Scanner created")
    
    # Test scanning a demo FastAPI app
    demo_path = "./test-scan/demo_fastapi/"
    if Path(demo_path).exists():
        print(f"🔍 Scanning FastAPI app: {demo_path}")
        endpoints = scanner.scan_fastapi_app(demo_path)
        print(f"✅ Found {len(endpoints)} endpoints")
        
        for endpoint in endpoints:
            print(f"  - {endpoint.method} {endpoint.path} ({endpoint.function_name})")
        
        # Test generator
        generator = MCPGenerator()
        print("✅ Generator created")
        
        # Generate MCP server
        out_dir = ".mcp-generated"
        print(f"🚀 Generating MCP server in: {out_dir}")
        generator.generate_server(endpoints, out_dir, 8000)
        
        print("✅ MCP server generation completed!")
        
    else:
        print(f"❌ Demo FastAPI app not found at: {demo_path}")
        print("Creating a simple test FastAPI app...")
        
        # Create a simple test FastAPI app
        test_app_dir = Path("./test-app")
        test_app_dir.mkdir(exist_ok=True)
        
        main_py_content = '''from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List

app = FastAPI(title="Test FastAPI App", version="1.0.0")

class User(BaseModel):
    id: int
    name: str
    email: str

class CreateUserRequest(BaseModel):
    name: str
    email: str

users = [
    User(id=1, name="John Doe", email="john@example.com"),
    User(id=2, name="Jane Smith", email="jane@example.com")
]

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Hello World"}

@app.get("/users", response_model=List[User])
async def get_users():
    """Get all users"""
    return users

@app.get("/users/{user_id}", response_model=User)
async def get_user(user_id: int):
    """Get user by ID"""
    user = next((u for u in users if u.id == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.post("/users", response_model=User)
async def create_user(user: CreateUserRequest):
    """Create a new user"""
    new_user = User(id=len(users) + 1, name=user.name, email=user.email)
    users.append(new_user)
    return new_user

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
'''
        
        with open(test_app_dir / "main.py", "w") as f:
            f.write(main_py_content)
        
        print(f"✅ Created test FastAPI app at: {test_app_dir}")
        
        # Test scanning the test app
        print(f"🔍 Scanning test FastAPI app: {test_app_dir}")
        endpoints = scanner.scan_fastapi_app(str(test_app_dir))
        print(f"✅ Found {len(endpoints)} endpoints")
        
        for endpoint in endpoints:
            print(f"  - {endpoint.method} {endpoint.path} ({endpoint.function_name})")
        
        # Test generator
        generator = MCPGenerator()
        print("✅ Generator created")
        
        # Generate MCP server
        out_dir = ".mcp-generated"
        print(f"🚀 Generating MCP server in: {out_dir}")
        generator.generate_server(endpoints, out_dir, 8000)
        
        print("✅ MCP server generation completed!")
        
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure all dependencies are installed:")
    print("pip install rich pyyaml astroid httpx mcp questionary fastapi uvicorn pydantic")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc() 