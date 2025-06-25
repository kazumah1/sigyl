# MCP CLI - FastAPI to MCP Server Generator

A Python CLI tool that scans FastAPI applications and generates MCP (Model Context Protocol) servers with tools that map to your FastAPI endpoints.

## Features

- 🔍 **FastAPI Scanning**: Automatically scans your FastAPI application and extracts endpoint information
- 🛠️ **MCP Server Generation**: Generates Python MCP servers with tools that map to your endpoints
- 🚀 **Development Mode**: Hot reload development workflow with FastAPI app and MCP server
- 🕵️ **MCP Inspector Integration**: Built-in MCP Inspector for testing generated servers
- 📝 **Template Generation**: Create blank MCP server templates for custom development
- 🎯 **Type Inference**: Extracts Pydantic models and type annotations for better tool schemas

## Installation

### From Source

```bash
# Clone the repository
git clone <repository-url>
cd python-cli

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install the CLI
pip install -e .
```

### Using pip

```bash
pip install mcp-scan
```

## Usage

### Basic Commands

```bash
# Scan FastAPI app and generate MCP server
mcp-scan scan ./my-fastapi-app

# Create blank MCP server template
mcp-scan init --out ./my-mcp-server

# Development mode with hot reload
mcp-scan dev ./my-fastapi-app

# Launch MCP Inspector
mcp-scan inspect

# Clean generated files
mcp-scan clean

# Interactive mode
mcp-scan
```

### Command Options

#### Scan Command
```bash
mcp-scan scan <app_path> [options]
```

Options:
- `--out <directory>`: Output directory for generated MCP server (default: `.mcp-generated`)
- `--port <port>`: Port for FastAPI app (default: 8000)
- `--verbose`: Show detailed output

#### Init Command
```bash
mcp-scan init [options]
```

Options:
- `--out <directory>`: Output directory for generated MCP server (default: `.mcp-generated`)
- `--name <name>`: Name for the MCP server (default: `my-mcp-server`)

#### Dev Command
```bash
mcp-scan dev <app_path> [options]
```

Options:
- `--out <directory>`: Output directory for generated MCP server (default: `.mcp-generated`)
- `--port <port>`: Port for FastAPI app (default: 8000)
- `--mcp-port <port>`: Port for MCP server (default: 8181)

#### Inspect Command
```bash
mcp-scan inspect [options]
```

Options:
- `--out <directory>`: MCP server directory (default: `.mcp-generated`)

#### Clean Command
```bash
mcp-scan clean [options]
```

Options:
- `--out <directory>`: Directory to remove (default: `.mcp-generated`)

## Examples

### 1. Scan a FastAPI Application

```bash
# Scan your FastAPI app
mcp-scan scan ./my-fastapi-app --verbose

# This will:
# - Scan all Python files in your FastAPI app
# - Extract endpoint information (routes, parameters, types)
# - Generate an MCP server with tools for each endpoint
# - Create mcp.yaml configuration
# - Generate server.py with tool implementations
```

### 2. Development Mode

```bash
# Start development mode
mcp-scan dev ./my-fastapi-app --port 8000 --mcp-port 8181

# This will:
# - Generate MCP server from your FastAPI app
# - Start your FastAPI app on port 8000
# - Start the MCP server on port 8181
# - Keep both running until you stop with Ctrl+C
```

### 3. Create a Blank Template

```bash
# Create a blank MCP server template
mcp-scan init --out ./my-custom-server --name "my-custom-server"

# This will create:
# - mcp.yaml with example tools
# - server.py with template code
# - requirements.txt
# - README.md
```

### 4. Test with MCP Inspector

```bash
# Launch MCP Inspector to test your server
mcp-scan inspect

# This will:
# - Start the MCP Inspector web UI
# - Connect to your generated MCP server
# - Allow you to test tools interactively
```

## Generated Files

When you run `mcp-scan scan`, it generates the following files:

```
.mcp-generated/
├── mcp.yaml          # MCP server configuration
├── server.py         # Python MCP server implementation
├── requirements.txt  # Python dependencies
├── README.md         # Usage instructions
└── demo_fastapi/     # Demo FastAPI app (if generated)
    ├── main.py
    └── requirements.txt
```

### mcp.yaml
Contains the MCP server configuration with tool definitions:

```yaml
name: generated-mcp-server
description: Auto-generated MCP server from FastAPI endpoints
version: 1.0.0
tools:
  - name: get_users
    description: GET /users
    inputSchema:
      type: object
      properties: {}
      required: []
```

### server.py
Contains the Python MCP server implementation:

```python
from mcp.server.fastmcp import FastMCP
import httpx

server = FastMCP("generated-mcp-server")

@server.tool()
async def get_users(args: Dict[str, Any]) -> str:
    """GET /users"""
    try:
        url = "http://localhost:8000/users"
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            return json.dumps(data, indent=2)
    except Exception as error:
        return f"Error calling GET /users: {str(error)}"
```

## FastAPI Application Requirements

Your FastAPI application should follow these patterns for best results:

### Route Decorators
```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/users")
async def get_users():
    """Get all users"""
    return {"users": []}

@app.post("/users")
async def create_user(user: User):
    """Create a new user"""
    return user.dict()
```

### Pydantic Models
```python
from pydantic import BaseModel
from typing import Optional

class User(BaseModel):
    id: int
    name: str
    email: str
    age: Optional[int] = None
```

### Type Annotations
```python
@app.get("/users/{user_id}")
async def get_user(user_id: int) -> User:
    """Get user by ID"""
    return User(id=user_id, name="John", email="john@example.com")
```

## Development

### Project Structure
```
python-cli/
├── main.py              # CLI entry point
├── mcp_wrap/           # Core modules
│   ├── __init__.py
│   ├── fastapi_scanner.py  # FastAPI AST parsing
│   ├── mcp_generator.py    # MCP server generation
│   └── inspector.py        # MCP Inspector integration
├── setup.py            # Package configuration
├── requirements.txt    # Dependencies
└── README.md          # This file
```

### Running Tests
```bash
# Install development dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Run with coverage
pytest --cov=mcp_wrap
```

### Code Formatting
```bash
# Format code
black .

# Sort imports
isort .

# Lint code
flake8 .
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Related Projects

- [TypeScript MCP CLI](../ts-cli) - Express.js to MCP Server Generator
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector) - MCP Server Testing Tool
- [Model Context Protocol](https://modelcontextprotocol.io/) - Official MCP Documentation 