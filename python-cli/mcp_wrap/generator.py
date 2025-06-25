"""
MCP Generator - Generate MCP servers from FastAPI endpoints

This module generates MCP servers that provide tools mapping to FastAPI endpoints.
"""

from typing import List, Dict, Any
from pathlib import Path
import asyncio
import json
import httpx
import yaml

class MCPGenerator:
    def generate_server(self, endpoints: List[Any], out_dir: str, port: int = 8000):
        """Generate MCP server from FastAPI endpoints"""
        try:
            out_path = Path(out_dir)
            out_path.mkdir(parents=True, exist_ok=True)
            
            # Convert FastAPI endpoints to the format we need
            endpoint_dicts = []
            for endpoint in endpoints:
                endpoint_dict = {
                    'name': self._generate_tool_name(endpoint),
                    'path': endpoint.path,
                    'method': endpoint.method,
                    'description': endpoint.description or f"{endpoint.method} {endpoint.path}",
                    'parameters': self._convert_parameters(endpoint.parameters),
                    'request_body': endpoint.request_body,
                    'response_type': endpoint.response_type
                }
                endpoint_dicts.append(endpoint_dict)
            
            # Generate MCP configuration (YAML)
            self._generate_mcp_config(endpoint_dicts, out_path, port)
            
            # Generate server code
            self._generate_python_server(endpoint_dicts, out_path, port)
            
            # Generate requirements.txt
            self._generate_requirements(out_path)
            
            # Generate README
            self._generate_readme(endpoint_dicts, out_path, port)
            
            print(f"✅ MCP server generated in: {out_path}")
            print(f"📁 Files created:")
            print(f"   - mcp.yaml (MCP configuration)")
            print(f"   - server.py (MCP server implementation)")
            print(f"   - requirements.txt (dependencies)")
            print(f"   - README.md (documentation)")
        except Exception as e:
            print(f"Error generating MCP server: {e}")
            raise
    
    def _generate_mcp_config(self, endpoints: List[Dict], out_path: Path, port: int):
        """Generate MCP configuration YAML file"""
        config = {
            "name": "fastapi-mcp-server",
            "description": "Auto-generated MCP server from FastAPI endpoints",
            "version": "1.0.0",
            "tools": []
        }
        
        try:
            for endpoint in endpoints:
                tool_config = {
                    "name": endpoint['name'],
                    "description": endpoint['description'],
                    "inputSchema": {
                        "type": "object",
                        "properties": self._generate_tool_schema(endpoint),
                        "required": self._get_required_parameters(endpoint)
                    }
                }
                
                # Add output schema if we have response type information
                if endpoint.get('response_type'):
                    tool_config["outputSchema"] = {
                        "type": self._map_type_to_json_schema(endpoint['response_type']),
                        "description": f"Response from {endpoint['method']} {endpoint['path']}"
                    }
                
                config["tools"].append(tool_config)
        except Exception as e:
            print(f"Warning: Could not generate MCP config: {e}")
        
        # Create YAML content with proper comments
        yaml_header = f"""# Auto-generated MCP Server Configuration
# 
# This file defines the tools available in your MCP server.
# Each tool corresponds to an endpoint in your FastAPI application.
# 
# To add a new tool manually:
# 1. Add a new entry to the tools array below
# 2. Define the inputSchema with your tool's parameters
# 3. Optionally define outputSchema for the expected response
# 4. Update the corresponding tool handler in server.py

"""
        
        yaml_content = yaml_header + yaml.dump(config, default_flow_style=False, indent=2)
        
        # Add section comments
        tools_section_comment = """
# ============================================================================
# AUTO-GENERATED TOOLS FROM FASTAPI ENDPOINTS
# ============================================================================
# These tools were automatically generated from your FastAPI application.
# Each tool corresponds to an endpoint in your FastAPI app.
"""
        
        template_section_comment = """
# ============================================================================
# MANUAL TOOL TEMPLATE
# ============================================================================
# To add a new tool manually, uncomment and modify the template below:
"""
        
        # Insert section comments
        yaml_content = yaml_content.replace('tools:', 'tools:' + tools_section_comment)
        yaml_content = yaml_content + template_section_comment
        
        with open(out_path / "mcp.yaml", "w") as f:
            f.write(yaml_content)
    
    def _generate_python_server(self, endpoints: List[Dict], out_path: Path, port: int):
        """Generate Python MCP server"""
        try:
            server_content = f'''"""
Auto-generated MCP Server from FastAPI endpoints

This MCP server provides tools that map to your FastAPI application endpoints.
Generated automatically by MCP Wrap CLI.
"""

import asyncio
import json
import httpx
from typing import Any, Dict, List, Optional
from mcp.server import Server
from mcp.server.models import InitializationOptions
from mcp.server.stdio import stdio_server
from mcp.types import (
    CallToolRequest,
    CallToolResult,
    ListToolsRequest,
    ListToolsResult,
    Tool,
    TextContent,
    ImageContent,
    EmbeddedResource,
    LoggingLevel
)

# ============================================================================
# SERVER CONFIGURATION
# ============================================================================

# FastAPI app URL
FASTAPI_URL = "http://localhost:{port}"

# Create MCP server
server = Server("fastapi-mcp-server")

# ============================================================================
# TOOL IMPLEMENTATIONS
# ============================================================================

{self._generate_tool_implementations(endpoints)}

# ============================================================================
# SERVER HANDLERS
# ============================================================================

@server.list_tools()
async def handle_list_tools() -> ListToolsResult:
    """List available tools"""
    tools = [
        {self._generate_tool_definitions(endpoints)}
    ]
    return ListToolsResult(tools=tools)

@server.call_tool()
async def handle_call_tool(name: str, arguments: Dict[str, Any]) -> CallToolResult:
    """Handle tool calls"""
    try:
        # Find the tool function
        tool_function = globals().get(f"tool_{{name}}")
        if not tool_function:
            return CallToolResult(
                content=[TextContent(type="text", text=f"Tool '{{name}}' not found")]
            )
        
        # Call the tool
        result = await tool_function(arguments)
        
        return CallToolResult(
            content=[TextContent(type="text", text=result)]
        )
        
    except Exception as e:
        return CallToolResult(
            content=[TextContent(type="text", text=f"Error: {{str(e)}}")]
        )

# ============================================================================
# SERVER STARTUP
# ============================================================================

async def main():
    """Start the MCP server"""
    # Create a simple notification options object
    class SimpleNotificationOptions:
        def __init__(self):
            self.tools_changed = False
    
    # Run the server using stdio (for now)
    # Note: This server uses stdio, not HTTP
    # To use with MCP Inspector, you'll need to use the web inspector
    # at https://modelcontextprotocol.io/inspector
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="fastapi-mcp-server",
                server_version="1.0.0",
                capabilities=server.get_capabilities(
                    notification_options=SimpleNotificationOptions(),
                    experimental_capabilities=None
                )
            )
        )

if __name__ == "__main__":
    print("🚀 Starting MCP server (stdio mode)...")
    print("📋 To test with MCP Inspector:")
    print("1. Open https://modelcontextprotocol.io/inspector")
    print("2. Click 'Connect to Server'")
    print("3. Choose 'stdio' connection type")
    print("4. Run this server and connect to it")
    print()
    asyncio.run(main())
'''
            
            with open(out_path / "server.py", "w") as f:
                f.write(server_content)
        except Exception as e:
            print(f"Warning: Could not generate Python server: {e}")
    
    def _generate_requirements(self, out_path: Path):
        """Generate requirements.txt file"""
        try:
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
            
            with open(out_path / "requirements.txt", "w") as f:
                f.write(requirements)
        except Exception as e:
            print(f"Warning: Could not generate requirements.txt: {e}")
    
    def _generate_readme(self, endpoints: List[Dict], out_path: Path, port: int):
        """Generate README.md file"""
        try:
            readme_content = f"""# Generated MCP Server

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

- **Port**: The server connects to your FastAPI app on the configured port (default: {port})
- **Tools**: Each tool corresponds to an endpoint in your FastAPI application
- **Parameters**: Tool parameters are automatically mapped from your endpoint definitions

## Available Tools

{self._generate_tools_documentation(endpoints)}

## Adding Custom Tools

To add custom tools manually:

1. Edit `server.py` and add new tool functions using the `@server.tool()` decorator
2. Update `mcp.yaml` to include the new tool definitions
3. Restart the server

## Development

This server is generated from your FastAPI application. To regenerate:

1. Run the scanner on your FastAPI app
2. Generate a new MCP server
3. Replace the existing files with the new ones

## Troubleshooting

1. **Server won't start:** Make sure your FastAPI app is running on port {port}
2. **Tools not working:** Check that the FastAPI endpoints are accessible
3. **Connection issues:** Verify the FastAPI URL in server.py
"""
            
            with open(out_path / "README.md", "w") as f:
                f.write(readme_content)
        except Exception as e:
            print(f"Warning: Could not generate README.md: {e}")
    
    def _generate_tool_name(self, endpoint) -> str:
        """Generate a tool name from an endpoint"""
        # Convert path to camelCase
        path_parts = endpoint.path.strip('/').split('/')
        name_parts = []
        
        for part in path_parts:
            if part.startswith('{') and part.endswith('}'):
                # Path parameter
                param_name = part[1:-1]
                name_parts.append(param_name.capitalize())
            else:
                # Regular path segment
                name_parts.append(part.capitalize())
        
        # Add method prefix
        method_prefix = endpoint.method.lower()
        if method_prefix == 'get':
            method_prefix = 'get'
        elif method_prefix == 'post':
            method_prefix = 'create'
        elif method_prefix == 'put':
            method_prefix = 'update'
        elif method_prefix == 'delete':
            method_prefix = 'delete'
        else:
            method_prefix = method_prefix.lower()
        
        tool_name = method_prefix + ''.join(name_parts)
        return tool_name
    
    def _convert_parameters(self, parameters: List[Dict]) -> Dict[str, Any]:
        """Convert FastAPI parameters to our format"""
        if not parameters:
            return {}
        
        converted = {}
        try:
            for param in parameters:
                param_name = param.get('name', '')
                param_type = param.get('type', 'string')
                param_location = param.get('location', 'query')
                param_required = param.get('required', False)
                param_description = param.get('description', '')
                
                converted[param_name] = {
                    'type': self._map_type_to_json_schema(param_type),
                    'description': param_description,
                    'in': param_location,
                    'required': param_required
                }
        except Exception as e:
            print(f"Warning: Could not convert parameters: {e}")
        
        return converted
    
    def _generate_tool_schema(self, endpoint: Dict) -> Dict[str, Any]:
        """Generate JSON schema for a tool"""
        schema = {}
        
        try:
            # Add path parameters
            for param_name, param_info in endpoint.get('parameters', {}).items():
                if param_info.get('in') == 'path':
                    schema[param_name] = {
                        'type': param_info.get('type', 'string'),
                        'description': param_info.get('description', f'Path parameter: {param_name}')
                    }
            
            # Add query parameters
            for param_name, param_info in endpoint.get('parameters', {}).items():
                if param_info.get('in') == 'query':
                    schema[param_name] = {
                        'type': param_info.get('type', 'string'),
                        'description': param_info.get('description', f'Query parameter: {param_name}')
                    }
            
            # Add body parameters
            if endpoint.get('request_body'):
                body_schema = endpoint['request_body']
                if isinstance(body_schema, dict) and 'properties' in body_schema:
                    for prop_name, prop_info in body_schema['properties'].items():
                        schema[prop_name] = {
                            'type': prop_info.get('type', 'string'),
                            'description': prop_info.get('description', f'Body parameter: {prop_name}')
                        }
        except Exception as e:
            print(f"Warning: Could not generate tool schema: {e}")
        
        return schema
    
    def _get_required_parameters(self, endpoint: Dict) -> List[str]:
        """Get list of required parameters for a tool"""
        required = []
        
        try:
            for param_name, param_info in endpoint.get('parameters', {}).items():
                if param_info.get('required', False):
                    required.append(param_name)
            
            # Add required body parameters
            if endpoint.get('request_body'):
                body_schema = endpoint['request_body']
                if isinstance(body_schema, dict) and 'required' in body_schema:
                    required.extend(body_schema['required'])
        except Exception as e:
            print(f"Warning: Could not get required parameters: {e}")
        
        return required
    
    def _map_type_to_json_schema(self, type_name: str) -> str:
        """Map Python/FastAPI types to JSON schema types"""
        try:
            if not type_name:
                return "string"
            
            type_mapping = {
                'str': 'string',
                'string': 'string',
                'int': 'integer',
                'integer': 'integer',
                'float': 'number',
                'number': 'number',
                'bool': 'boolean',
                'boolean': 'boolean',
                'list': 'array',
                'array': 'array',
                'dict': 'object',
                'object': 'object',
                'Any': 'string'
            }
            
            return type_mapping.get(type_name.lower(), 'string')
        except Exception as e:
            print(f"Warning: Could not map type {type_name}: {e}")
            return "string"
    
    def _generate_tool_definitions(self, endpoints: List[Dict]) -> str:
        """Generate tool definitions for the server"""
        definitions = []
        
        try:
            for endpoint in endpoints:
                name = endpoint['name']
                description = endpoint['description']
                schema = self._generate_tool_schema(endpoint)
                
                tool_def = f'''Tool(
    name="{name}",
    description="{description}",
    inputSchema={json.dumps(schema, indent=4)}
)'''
                definitions.append(tool_def)
        except Exception as e:
            print(f"Warning: Could not generate tool definitions: {e}")
        
        return ',\n        '.join(definitions)
    
    def _generate_tool_implementations(self, endpoints: List[Dict]) -> str:
        """Generate tool implementations"""
        implementations = []
        
        try:
            for endpoint in endpoints:
                name = endpoint['name']
                path = endpoint['path']
                method = endpoint['method']
                description = endpoint['description']
                parameters = endpoint.get('parameters', {})
                
                # Create parameter handling code
                path_param_handling = []
                query_body_handling = []
                
                for param_name, param_info in parameters.items():
                    if param_info.get("in") == "path":
                        path_param_handling.append(f'        if "{param_name}" in args:\n            url = url.replace("{{{{{param_name}}}}}", str(args["{param_name}"]))')
                    elif param_info.get("in") in ["body", "query"]:
                        query_body_handling.append(f'        if "{param_name}" in args:\n            request_data["{param_name}"] = args["{param_name}"]')
                
                path_param_code = '\n'.join(path_param_handling)
                query_body_code = '\n'.join(query_body_handling)
                
                impl = f'''async def tool_{name}(args: Dict[str, Any]) -> str:
    """{description}"""
    try:
        # Prepare request
        url = f"{{FASTAPI_URL}}{path}"
{path_param_code if path_param_code else ''}
        # Prepare request data
        request_data = {{}}
{query_body_code if query_body_code else ''}
        # Make request
        async with httpx.AsyncClient() as client:
            if "{method.upper()}" == "GET":
                response = await client.get(url, params=request_data)
            elif "{method.upper()}" == "POST":
                response = await client.post(url, json=request_data)
            elif "{method.upper()}" == "PUT":
                response = await client.put(url, json=request_data)
            elif "{method.upper()}" == "DELETE":
                response = await client.delete(url)
            else:
                return f"Unsupported method: {{method}}"
            
            response.raise_for_status()
            result = response.json()
            
            return json.dumps(result, indent=2)
            
    except httpx.HTTPStatusError as e:
        return f"HTTP Error {{e.response.status_code}}: {{e.response.text}}"
    except Exception as e:
        return f"Error calling {{path}}: {{str(e)}}"
'''
                implementations.append(impl)
        except Exception as e:
            print(f"Warning: Could not generate tool implementations: {e}")
        
        return '\n\n'.join(implementations)
    
    def _generate_tools_documentation(self, endpoints: List[Dict]) -> str:
        """Generate documentation for available tools"""
        docs = []
        
        try:
            for endpoint in endpoints:
                name = endpoint['name']
                path = endpoint['path']
                method = endpoint['method']
                description = endpoint['description']
                parameters = endpoint.get('parameters', {})
                
                doc = f"""### {name}
- **Path:** {method.upper()} {path}
- **Description:** {description}
- **Parameters:** {json.dumps(parameters, indent=2)}"""
                docs.append(doc)
        except Exception as e:
            print(f"Warning: Could not generate tools documentation: {e}")
        
        return '\n\n'.join(docs) 