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
        
        with open(out_path / "mcp.yaml", 'w') as f:
            yaml.dump(config, f, default_flow_style=False, indent=2)
    
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
        
        with open(out_path / "mcp.yaml", 'w') as f:
            yaml.dump(config, f, default_flow_style=False, indent=2)
    
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
from typing import Any, Dict, List
from mcp.server.fastmcp import FastMCP
import httpx

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
        params = {{}}
        json_data = None
        
        {self._generate_parameter_handling(endpoint)}
        
        # ===== HTTP REQUEST & RESPONSE =====
        async with httpx.AsyncClient() as client:
            if method == "GET":
                response = await client.get(url, params=params)
            elif method == "POST":
                response = await client.post(url, params=params, json=json_data)
            elif method == "PUT":
                response = await client.put(url, params=params, json=json_data)
            elif method == "DELETE":
                response = await client.delete(url, params=params)
            else:
                response = await client.request(method, url, params=params, json=json_data)
            
            response.raise_for_status()
            data = response.json()
            
            return json.dumps(data, indent=2)
            
    except Exception as error:
        return f"Error calling {{method}} {endpoint.path}: {{str(error)}}"

'''
        
        server_code += '''# ============================================================================
# MANUAL TOOL TEMPLATE
# ============================================================================
# To add a new tool manually, uncomment and modify the template below:

# @server.tool()
# async def my_custom_tool(args: Dict[str, Any]) -> str:
#     """Description of what this tool does"""
#     try:
#         # ===== YOUR CUSTOM LOGIC HERE =====
#         # This is where you implement your tool's functionality
#         
#         # Example: Make an HTTP request
#         # async with httpx.AsyncClient() as client:
#         #     response = await client.get("https://api.example.com/data")
#         #     data = response.json()
#         
#         # Example: Return custom response
#         result = {
#             "message": "Custom tool executed successfully",
#             "parameters": args,
#             "timestamp": "2024-01-01T00:00:00Z"
#         }
#         
#         return json.dumps(result, indent=2)
#         
#     except Exception as error:
#         return f"Error in custom tool: {str(error)}"

# ============================================================================
# SERVER STARTUP
# ============================================================================

if __name__ == "__main__":
    port = ''' + str(port) + '''
    print("🚀 MCP Server starting...")
    print(f"📡 Connecting to FastAPI app on port {port}")
    
    # Run the server using stdio transport
    server.run("stdio")
    print("✅ MCP Server connected and ready")
'''
        
        with open(out_path / "server.py", 'w') as f:
            f.write(server_code)
    
    def _generate_blank_python_server(self, name: str, out_path: Path):
        """Generate blank Python MCP server"""
        server_code = f'''"""
Template MCP Server

A template MCP server with example tools.
"""

import asyncio
import json
from typing import Any, Dict
from mcp.server.fastmcp import FastMCP
import httpx

# Create FastMCP server
server = FastMCP("{name}")

# Example tool 1: Simple greeting (no external API calls)
@server.tool()
async def hello_world(args: Dict[str, Any]) -> str:
    """Say hello to someone"""
    name = args.get("name", "World")
    return f"Hello, {{name}}!"

# Example tool 2: HTTP request to external API
@server.tool()
async def get_user_info(args: Dict[str, Any]) -> str:
    """Get user information from a mock API"""
    try:
        user_id = args.get("userId", 1)
        
        # Make HTTP request to external API
        async with httpx.AsyncClient() as client:
            response = await client.get(f"https://jsonplaceholder.typicode.com/users/{{user_id}}")
            response.raise_for_status()
            user_data = response.json()
        
        result = f"""User Information:

Name: {{user_data.get('name', 'N/A')}}
Email: {{user_data.get('email', 'N/A')}}
Company: {{user_data.get('company', {{}}).get('name', 'N/A')}}
Website: {{user_data.get('website', 'N/A')}}"""
        
        return result
        
    except Exception as error:
        return f"Error fetching user info: {{str(error)}}"

# Add more tools here...

if __name__ == "__main__":
    print("🚀 MCP Server starting...")
    
    # Run the server using stdio transport
    server.run("stdio")
    print("✅ MCP Server connected and ready")
'''
        
        with open(out_path / "server.py", 'w') as f:
            f.write(server_code)
    
    def _generate_parameter_handling(self, endpoint: 'FastAPIEndpoint') -> str:
        """Generate parameter handling code"""
        code_lines = []
        
        for param in endpoint.parameters:
            if param["location"] == "path":
                # Handle path parameters
                code_lines.append(f'        # Replace path parameter {param["name"]}')
                code_lines.append(f'        url = url.replace("{{{param["name"]}}}", str(args.get("{param["name"]}", "")))')
            elif param["location"] == "query":
                # Handle query parameters
                code_lines.append(f'        # Add query parameter {param["name"]}')
                code_lines.append(f'        if "{param["name"]}" in args:')
                code_lines.append(f'            params["{param["name"]}"] = args["{param["name"]}"]')
            elif param["location"] == "body":
                # Handle body parameters
                code_lines.append(f'        # Add body parameter {param["name"]}')
                code_lines.append(f'        if "{param["name"]}" in args:')
                code_lines.append(f'            json_data = args["{param["name"]}"]')
        
        # Handle request body for POST/PUT/PATCH
        if endpoint.method in ["POST", "PUT", "PATCH"] and endpoint.request_body:
            code_lines.append('        # Add request body')
            code_lines.append('        if "body" in args:')
            code_lines.append('            json_data = args["body"]')
        
        return '\n'.join(code_lines)
    
    def _generate_tool_schema(self, endpoint: FastAPIEndpoint) -> Dict[str, Any]:
        """Generate tool schema from endpoint parameters"""
        schema = {}
        
        for param in endpoint.parameters:
            schema[param["name"]] = {
                "type": self._map_type_to_json_schema(param["type"]),
                "description": f"{param['location']} parameter: {param['name']}"
            }
        
        # Add request body for POST/PUT/PATCH
        if endpoint.method in ["POST", "PUT", "PATCH"] and endpoint.request_body:
            schema["body"] = {
                "type": "object",
                "description": "Request body data"
            }
        
        return schema
    
    def _map_type_to_json_schema(self, type_name: str) -> str:
        """Map Python type to JSON Schema type"""
        type_mapping = {
            "str": "string",
            "string": "string",
            "int": "number",
            "integer": "number",
            "float": "number",
            "number": "number",
            "bool": "boolean",
            "boolean": "boolean",
            "list": "array",
            "array": "array",
            "dict": "object",
            "object": "object",
            "any": "object"
        }
        
        return type_mapping.get(type_name.lower(), "object")
    
    def _generate_tool_name(self, endpoint: FastAPIEndpoint) -> str:
        """Generate a tool name from endpoint path and method"""
        # Convert path to snake_case
        path_parts = endpoint.path.strip("/").split("/")
        method = endpoint.method.lower()
        
        tool_name = method
        for part in path_parts:
            if part.startswith("{"):
                # Path parameter
                param_name = part.strip("{}")
                tool_name += "_by_" + param_name.lower()
            else:
                tool_name += "_" + part.lower()
        
        return tool_name
    
    def _generate_requirements(self, out_path: Path):
        """Generate requirements.txt"""
        requirements = [
            "mcp>=1.0.0",
            "httpx>=0.24.0",
            "pyyaml>=6.0"
        ]
        
        with open(out_path / "requirements.txt", 'w') as f:
            f.write('\n'.join(requirements))
    
    def _generate_readme(self, out_path: Path):
        """Generate README.md"""
        readme = '''# Generated MCP Server

This MCP server was automatically generated from your FastAPI application.

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the server:
   ```bash
   python server.py
   ```

3. Test with MCP Inspector:
   ```bash
   mcp-scan inspect
   ```

## Adding Custom Tools

To add custom tools, edit `server.py` and follow the template at the bottom of the file.

## Configuration

The server configuration is in `mcp.yaml`. You can modify this file to customize tool descriptions and schemas.
'''
        
        with open(out_path / "README.md", 'w') as f:
            f.write(readme) 