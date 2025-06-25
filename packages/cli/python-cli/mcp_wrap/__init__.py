"""
MCP Wrap - Convert FastAPI applications to MCP servers

A Python CLI tool that scans FastAPI applications and generates MCP servers
with tools that map to your FastAPI endpoints.
"""

__version__ = "0.2.0"
__author__ = "MCP CLI Team"
__email__ = "mcp-cli@example.com"

from .cli import main, MCPCLI
from .fastapi_scanner import FastAPIScanner, FastAPIEndpoint
from .mcp_generator import MCPGenerator
from .inspector import MCPInspector

__all__ = [
    "main",
    "MCPCLI",
    "FastAPIScanner", 
    "FastAPIEndpoint",
    "MCPGenerator",
    "MCPInspector",
] 