# Generated MCP Server

This MCP server was automatically generated from your FastAPI application.

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Start the MCP server:
   ```bash
   python server.py
   ```

3. Test with MCP Inspector:
   ```bash
   mcp-scan inspect
   ```

## Tools

This server provides tools that map to your FastAPI endpoints. Each tool makes HTTP requests to your FastAPI application and returns the responses.

## Customization

To add custom tools, edit the `server.py` file and follow the template at the bottom.

## Development

For development mode with hot reload:
```bash
mcp-scan dev ./your-fastapi-app
```

## Configuration

The MCP server configuration is in `mcp.yaml`. You can modify this file to customize tool names, descriptions, and schemas.
