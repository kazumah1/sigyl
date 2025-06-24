"""
MCP Wrap - Convert tool definitions to MCP format and generate servers

A Python CLI tool that converts tool definitions from various formats 
(OpenAI, LangChain, Claude) to MCP-compatible YAML and generates MCP servers.
"""

__version__ = "0.1.0"
__author__ = "Your Name"
__email__ = "your.email@example.com"

from .mcp_wrap import main
from .server_generator import MCPServerGenerator
from .formats import openai, langchain, claude
from .schema_writer import write_yaml
from .utils import detect_format

__all__ = [
    "main",
    "MCPServerGenerator", 
    "openai",
    "langchain", 
    "claude",
    "write_yaml",
    "detect_format",
] 