"""
MCP Generator - Generate Python MCP servers from FastAPI endpoints

This module generates Python MCP servers with tools that map to FastAPI endpoints.
"""

import os
import yaml
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from .fastapi_scanner import FastAPIEndpoint
import asyncio
from mcp.server.fastmcp import FastMCP
from mcp.types import Tool
from mcp.server.stdio import stdio_server
import httpx

class MCPGenerator:
    def __init__(self):
        pass
    
    def generate_from_endpoints(self, endpoints: List[FastAPIEndpoint], out_dir: str, port: int = 8000):
        """Generate MCP server from FastAPI endpoints"""
        out_path = Path(out_dir)
        out_path.mkdir(parents=True, exist_ok=True)
        
        # Generate MCP configuration
        self._generate_mcp_config(endpoints, out_path)
        
        # Generate Python server
        self._generate_python_server(endpoints, out_path, port)
        
        # Generate requirements.txt
        self._generate_requirements(out_path)
        
        # Generate README
        self._generate_readme(out_path)
        
        # Generate demo FastAPI app if it doesn't exist
        self._generate_demo_fastapi_app(out_path)
    
    def generate_blank_template(self, out_dir: str, name: str = "my-mcp-server"):
        """Generate a blank MCP server template"""
        out_path = Path(out_dir)
        out_path.mkdir(parents=True, exist_ok=True)
        
        # Generate MCP configuration
        self._generate_blank_mcp_config(name, out_path)
        
        # Generate Python server
        self._generate_blank_python_server(name, out_path)
        
        # Generate requirements.txt
        self._generate_requirements(out_path)
        
        # Generate README
        self._generate_readme(out_path)
    
    def _generate_mcp_config(self, endpoints: List[FastAPIEndpoint], out_path: Path):
        """Generate MCP configuration file"""
        config = {
            "name": "generated-mcp-server",
            "description": "Auto-generated MCP server from FastAPI endpoints",
            "version": "1.0.0",
            "tools": []
        }
        
        for endpoint in endpoints:
            tool_config = {
                "name": self._generate_tool_name(endpoint),
                "description": endpoint.description or f"{endpoint.method} {endpoint.path}",
                "inputSchema": {
                    "type": "object",
                    "properties": self._generate_tool_schema(endpoint),
                    "required": [p["name"] for p in endpoint.parameters if p.get("required", True)]
                }
            }
            
            if endpoint.response_type:
                tool_config["outputSchema"] = {
                    "type": self._map_type_to_json_schema(endpoint.response_type),
                    "description": f"Response from {endpoint.method} {endpoint.path}"
                }
            
            config["tools"].append(tool_config)
        
        # Write as JSON instead of YAML
        with open(out_path / "mcp.json", 'w') as f:
            json.dump(config, f, indent=2)
    
    def _generate_blank_mcp_config(self, name: str, out_path: Path):
        """Generate blank MCP configuration"""
        config = {
            "name": name,
            "description": "Template MCP server with sample tools",
            "version": "1.0.0",
            "tools": [
                {
                    "name": "hello_world",
                    "description": "Say hello to someone",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "name": {
                                "type": "string",
                                "description": "The name of the person to greet"
                            }
                        },
                        "required": ["name"]
                    }
                },
                {
                    "name": "get_user_info",
                    "description": "Get user information from a mock API",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "userId": {
                                "type": "number",
                                "description": "The user ID to fetch information for"
                            }
                        },
                        "required": ["userId"]
                    }
                }
            ]
        }
        
        # Write as JSON instead of YAML
        with open(out_path / "mcp.json", 'w') as f:
            json.dump(config, f, indent=2)
    
    def _generate_python_server(self, endpoints: List[FastAPIEndpoint], out_path: Path, port: int):
        """Generate Python MCP server"""
        server_code = f'''"""
Auto-generated MCP Server from FastAPI endpoints

This server provides tools that map to your FastAPI API endpoints.
Each tool makes HTTP requests to your FastAPI application and returns the responses.

To add a new tool manually, follow the template at the bottom of this file.
"""

import asyncio
import json
import httpx
from typing import Any, Dict, List
from mcp.server.fastmcp import FastMCP
from mcp.types import Tool

# ============================================================================
# SERVER CONFIGURATION
# ============================================================================

# Create FastMCP server
server = FastMCP("generated-mcp-server")

# ============================================================================
# AUTO-GENERATED TOOLS FROM FASTAPI ENDPOINTS
# ============================================================================
# These tools were automatically generated from your FastAPI application.
# Each tool corresponds to an endpoint in your FastAPI app.

'''
        
        for endpoint in endpoints:
            tool_name = self._generate_tool_name(endpoint)
            server_code += f'''# ===== {endpoint.method} {endpoint.path} =====
@server.tool()
async def {tool_name}(args: Dict[str, Any]) -> str:
    """{endpoint.description or f"{endpoint.method} {endpoint.path}"}"""
    try:
        # ===== REQUEST CONFIGURATION =====
        url = f"http://localhost:{port}{endpoint.path}"
        method = "{endpoint.method}"
        
        # ===== PARAMETER HANDLING =====
        query_params = {{}}
        body_params = {{}}
        
{self._generate_parameter_handling(endpoint)}
        
        # ===== URL CONSTRUCTION =====
        # Replace path parameters first
{self._generate_path_parameter_replacement(endpoint)}
        
        # Add query parameters
        if query_params:
            query_string = "&".join([f"{{k}}={{v}}" for k, v in query_params.items() if v is not None])
            url += "?" + query_string
        
        # ===== HTTP REQUEST & RESPONSE =====
        async with httpx.AsyncClient() as client:
            if method in ["POST", "PUT", "PATCH"] and body_params:
                response = await client.request(method, url, json=body_params)
            else:
                response = await client.request(method, url)
            
            data = response.json() if response.headers.get("content-type", "").startswith("application/json") else response.text
            
            return json.dumps({{
                "request": f"{{method}} {{url}}",
                "response": data,
                "status_code": response.status_code
            }}, indent=2)
            
    except Exception as error:
        return json.dumps({{
            "error": f"Error calling {{method}} {endpoint.path}: {{str(error)}}"
        }}, indent=2)

'''
        
        # Add manual tool template
        server_code += '''# ============================================================================
# MANUAL TOOL TEMPLATE
# ============================================================================
# To add a new tool manually, uncomment and modify the template below:
'''
        
        server_code += '''
# @server.tool()
# async def my_custom_tool(args: Dict[str, Any]) -> str:
#     """Description of what this tool does"""
#     try:
#         # ===== REQUEST CONFIGURATION =====
#         url = "https://api.example.com/endpoint"
#         method = "POST"
#         
#         # ===== PARAMETER HANDLING =====
#         # Example: Extract parameters from args
#         param1 = args.get("param1")
#         param2 = args.get("param2")
#         
#         # ===== CUSTOM LOGIC & HTTP REQUEST =====
#         async with httpx.AsyncClient() as client:
#             response = await client.request(method, url, json={"param1": param1, "param2": param2})
#             data = response.json()
#             
#             return json.dumps({
#                 "message": "Custom tool executed successfully",
#                 "data": data,
#                 "parameters": args
#             }, indent=2)
#             
#     except Exception as error:
#         return json.dumps({
#             "error": f"Error in custom tool: {str(error)}"
#         }, indent=2)
'''
        
        # Add server startup code
        server_code += '''
# ============================================================================
# SERVER STARTUP
# ============================================================================

if __name__ == "__main__":
    print("🚀 MCP Server starting...")
    print(f"📡 Connecting to FastAPI app on port {port}")
    asyncio.run(server.run())
    print("✅ MCP Server connected and ready")
'''
        
        with open(out_path / "server.py", 'w') as f:
            f.write(server_code)
    
    def _generate_blank_python_server(self, name: str, out_path: Path):
        """Generate blank Python MCP server"""
        server_code = f'''"""
Template MCP Server

This is a blank MCP server template with example tools.
Modify the tools below to match your needs.
"""

import asyncio
import json
from typing import Any, Dict, List
from mcp.server.fastmcp import FastMCP

# ============================================================================
# SERVER CONFIGURATION
# ============================================================================

# Create FastMCP server
server = FastMCP("{name}")

# ============================================================================
# SAMPLE TOOLS
# ============================================================================

@server.tool()
async def hello_world(args: Dict[str, Any]) -> str:
    """Say hello to someone"""
    try:
        name = args.get("name", "World")
        return json.dumps({{
            "message": f"Hello, {{name}}!",
            "timestamp": asyncio.get_event_loop().time()
        }}, indent=2)
    except Exception as error:
        return json.dumps({{
            "error": f"Error in hello_world: {{str(error)}}"
        }}, indent=2)

@server.tool()
async def get_user_info(args: Dict[str, Any]) -> str:
    """Get user information from a mock API"""
    try:
        user_id = args.get("userId")
        if not user_id:
            return json.dumps({{
                "error": "userId is required"
            }}, indent=2)
        
        # Mock user data
        mock_users = {{
            1: {{"id": 1, "name": "John Doe", "email": "john@example.com"}},
            2: {{"id": 2, "name": "Jane Smith", "email": "jane@example.com"}},
            3: {{"id": 3, "name": "Bob Johnson", "email": "bob@example.com"}}
        }}
        
        user = mock_users.get(user_id)
        if user:
            return json.dumps({{
                "user": user,
                "found": True
            }}, indent=2)
        else:
            return json.dumps({{
                "error": f"User with ID {{user_id}} not found",
                "found": False
            }}, indent=2)
            
    except Exception as error:
        return json.dumps({{
            "error": f"Error in get_user_info: {{str(error)}}"
        }}, indent=2)

# ============================================================================
# MANUAL TOOL TEMPLATE
# ============================================================================
# To add a new tool manually, uncomment and modify the template below:
'''
        
        server_code += '''
# @server.tool()
# async def my_custom_tool(args: Dict[str, Any]) -> str:
#     """Description of what this tool does"""
#     try:
#         # Extract parameters from args
#         param1 = args.get("param1")
#         param2 = args.get("param2")
#         
#         # Your custom logic here
#         result = {
#             "message": "Custom tool executed successfully",
#             "parameters": args,
#             "timestamp": asyncio.get_event_loop().time()
#         }
#         
#         return json.dumps(result, indent=2)
#         
#     except Exception as error:
#         return json.dumps({
#             "error": f"Error in custom tool: {str(error)}"
#         }, indent=2)
'''
        
        # Add server startup code
        server_code += '''
# ============================================================================
# SERVER STARTUP
# ============================================================================

if __name__ == "__main__":
    print("🚀 MCP Server starting...")
    asyncio.run(server.run())
    print("✅ MCP Server connected and ready")
'''
        
        with open(out_path / "server.py", 'w') as f:
            f.write(server_code)
    
    def _generate_parameter_handling(self, endpoint: FastAPIEndpoint) -> str:
        """Generate parameter handling code for an endpoint"""
        lines = []
        
        # Handle path parameters
        for param in endpoint.parameters:
            if param["location"] == "path":
                lines.append(f'        # Replace path parameter {{{param["name"]}}}')
                lines.append(f'        if "{param["name"]}" in args:')
                lines.append(f'            url = url.replace("{{{param["name"]}}}", str(args["{param["name"]}"]))')
            elif param["location"] == "query":
                lines.append(f'        # Add query parameter {param["name"]}')
                lines.append(f'        if "{param["name"]}" in args and args["{param["name"]}"] is not None:')
                lines.append(f'            query_params["{param["name"]}"] = args["{param["name"]}"]')
            elif param["location"] == "body":
                lines.append(f'        # Add body parameter {param["name"]}')
                lines.append(f'        if "{param["name"]}" in args and args["{param["name"]}"] is not None:')
                lines.append(f'            body_params["{param["name"]}"] = args["{param["name"]}"]')
        
        # Handle request body for POST/PUT/PATCH requests
        if endpoint.method in ["POST", "PUT", "PATCH"]:
            lines.append('        # Add request body')
            lines.append('        if "body" in args and args["body"] is not None:')
            lines.append('            body_params.update(args["body"])')
        
        return '\n'.join(lines)
    
    def _generate_tool_schema(self, endpoint: FastAPIEndpoint) -> Dict[str, Any]:
        """Generate JSON schema for tool parameters"""
        schema = {}
        
        # Add path and query parameters
        for param in endpoint.parameters:
            schema[param["name"]] = {
                "type": self._map_type_to_json_schema(param["type"]),
                "description": param.get("description", f"{param['location']} parameter")
            }
        
        # Add request body for POST/PUT/PATCH requests
        if endpoint.method in ["POST", "PUT", "PATCH"]:
            if endpoint.request_body:
                if endpoint.request_body.get("properties"):
                    schema["body"] = {
                        "type": "object",
                        "description": "Request body data",
                        "properties": endpoint.request_body["properties"],
                        "required": endpoint.request_body.get("required", [])
                    }
                else:
                    schema["body"] = {
                        "type": self._map_type_to_json_schema(endpoint.request_body.get("type", "object")),
                        "description": "Request body data"
                    }
            else:
                schema["body"] = {
                    "type": "object",
                    "description": "Request body data"
                }
        
        return schema
    
    def _map_type_to_json_schema(self, type_name: str) -> str:
        """Map Python type names to JSON Schema types"""
        type_mapping = {
            "str": "string",
            "string": "string",
            "int": "number",
            "float": "number",
            "number": "number",
            "bool": "boolean",
            "boolean": "boolean",
            "list": "array",
            "array": "array",
            "dict": "object",
            "object": "object",
            "any": "object",
            "unknown": "object"
        }
        
        return type_mapping.get(type_name.lower(), "object")
    
    def _generate_tool_name(self, endpoint: FastAPIEndpoint) -> str:
        """Generate a tool name from endpoint path and method"""
        method = endpoint.method.lower()
        path_parts = endpoint.path.split('/')
        
        # Filter out empty parts and convert to camelCase
        name_parts = []
        for part in path_parts:
            if part and part != '':
                # Remove path parameters (e.g., {id} -> ById)
                if part.startswith('{') and part.endswith('}'):
                    param_name = part[1:-1]
                    name_parts.append('By' + param_name.capitalize())
                else:
                    # Convert kebab-case or snake_case to camelCase
                    words = part.replace('-', '_').split('_')
                    camel_case = ''.join(word.capitalize() for word in words)
                    name_parts.append(camel_case)
        
        return method + ''.join(name_parts)
    
    def _generate_requirements(self, out_path: Path):
        """Generate requirements.txt file"""
        requirements = """# MCP Server Requirements
# Core MCP dependencies
mcp>=1.0.0
fastmcp>=1.0.0

# HTTP client for making requests to FastAPI
httpx>=0.24.0

# JSON handling
pydantic>=2.0.0

# Async support
asyncio-compat>=0.1.0
"""
        
        with open(out_path / "requirements.txt", 'w') as f:
            f.write(requirements)
    
    def _generate_readme(self, out_path: Path):
        """Generate README.md file"""
        readme = """# Generated MCP Server

This is an auto-generated MCP (Model Context Protocol) server that provides tools mapping to your FastAPI application endpoints.

## Features

- **Auto-generated tools**: Each FastAPI endpoint is converted to an MCP tool
- **Type safety**: Proper parameter validation and type checking
- **Error handling**: Comprehensive error handling and reporting
- **Async support**: Full async/await support for high performance

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Start the MCP server:
```bash
python server.py
```

## Usage

The MCP server will connect to your FastAPI application and provide tools that map to your endpoints. Each tool:

- Makes HTTP requests to your FastAPI app
- Handles path parameters, query parameters, and request bodies
- Returns structured JSON responses
- Provides proper error handling

## Configuration

- **Port**: The server connects to your FastAPI app on the configured port (default: 8000)
- **Tools**: Each tool corresponds to an endpoint in your FastAPI application
- **Parameters**: Tool parameters are automatically mapped from your endpoint definitions

## Adding Custom Tools

To add custom tools manually:

1. Edit `server.py` and add new tool functions using the `@server.tool()` decorator
2. Update `mcp.json` to include the new tool definitions
3. Restart the server

## Development

This server is generated from your FastAPI application. To regenerate:

1. Run the scanner on your FastAPI app
2. Generate a new MCP server
3. Replace the existing files with the new ones

## Troubleshooting

- **Connection errors**: Make sure your FastAPI app is running on the correct port
- **Parameter errors**: Check that your tool parameters match your endpoint definitions
- **Type errors**: Verify that your FastAPI endpoint types are properly defined

## License

This is an auto-generated file. Modify as needed for your project.
"""
        
        with open(out_path / "README.md", 'w') as f:
            f.write(readme)
    
    def _generate_demo_fastapi_app(self, out_path: Path):
        """Generate a demo FastAPI app for testing"""
        demo_app = '''"""
Demo FastAPI Application

This is a demo FastAPI app with various endpoints for testing the MCP CLI.
"""

from fastapi import FastAPI, Path, Query, Body
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

# Create FastAPI app
app = FastAPI(
    title="Demo API",
    description="A demo FastAPI application for testing MCP server generation",
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
    {"id": 1, "name": "John Doe", "email": "john@example.com", "age": 30},
    {"id": 2, "name": "Jane Smith", "email": "jane@example.com", "age": 25},
    {"id": 3, "name": "Bob Johnson", "email": "bob@example.com", "age": 35}
]

# Endpoints
@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Hello World", "version": "1.0.0"}

@app.get("/users")
async def get_users(limit: Optional[int] = Query(None, description="Limit number of users")):
    """Get all users"""
    result = users[:limit] if limit else users
    return {"users": result, "count": len(result)}

@app.get("/users/{user_id}")
async def get_user(user_id: int = Path(..., description="User ID")):
    """Get user by ID"""
    user = next((u for u in users if u["id"] == user_id), None)
    if not user:
        return {"error": "User not found"}, 404
    return {"user": user}

@app.post("/users")
async def create_user(user: CreateUserRequest = Body(..., description="User data")):
    """Create a new user"""
    new_user = {
        "id": max(u["id"] for u in users) + 1,
        "name": user.name,
        "email": user.email,
        "age": user.age
    }
    users.append(new_user)
    return {"user": new_user, "message": "User created successfully"}

@app.put("/users/{user_id}")
async def update_user(
    user_id: int = Path(..., description="User ID"),
    user: UpdateUserRequest = Body(..., description="Updated user data")
):
    """Update user by ID"""
    user_index = next((i for i, u in enumerate(users) if u["id"] == user_id), None)
    if user_index is None:
        return {"error": "User not found"}, 404
    
    # Update user data
    for field, value in user.dict(exclude_unset=True).items():
        users[user_index][field] = value
    
    return {"user": users[user_index], "message": "User updated successfully"}

@app.delete("/users/{user_id}")
async def delete_user(user_id: int = Path(..., description="User ID")):
    """Delete user by ID"""
    user_index = next((i for i, u in enumerate(users) if u["id"] == user_id), None)
    if user_index is None:
        return {"error": "User not found"}, 404
    
    deleted_user = users.pop(user_index)
    return {"message": "User deleted successfully", "deleted_user": deleted_user}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": "2024-01-01T00:00:00Z"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
'''
        
        demo_path = out_path / "demo_app.py"
        if not demo_path.exists():
            with open(demo_path, 'w') as f:
                f.write(demo_app)

    def _generate_path_parameter_replacement(self, endpoint: FastAPIEndpoint) -> str:
        """Generate path parameter replacement code for an endpoint"""
        lines = []
        
        # Replace path parameters first
        for param in endpoint.parameters:
            if param["location"] == "path":
                lines.append(f'        # Replace path parameter {{{param["name"]}}}')
                lines.append(f'        if "{param["name"]}" in args:')
                lines.append(f'            url = url.replace("{{{param["name"]}}}", str(args["{param["name"]}"]))')
        
        return '\n'.join(lines) 