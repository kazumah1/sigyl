"""
MCP Inspector - Launch MCP Inspector for testing generated servers

This module provides functionality to launch the MCP Inspector for testing
generated MCP servers.
"""

import subprocess
import sys
import os
from pathlib import Path
from typing import Optional

class MCPInspector:
    def __init__(self):
        pass
    
    def launch_inspector(self, server_dir: str):
        """Launch MCP Inspector for the given server directory"""
        server_path = Path(server_dir)
        
        if not server_path.exists():
            raise FileNotFoundError(f"Server directory not found: {server_dir}")
        
        # Check if MCP Inspector is available
        if not self._is_mcp_inspector_available():
            print("MCP Inspector not found. Installing...")
            self._install_mcp_inspector()
        
        # Launch inspector
        print(f"Launching MCP Inspector for server in: {server_dir}")
        
        try:
            # Change to server directory and launch inspector
            subprocess.run([
                "mcp-inspector",
                "--server",
                str(server_path / "server.py")
            ], cwd=server_path, check=True)
        except subprocess.CalledProcessError as e:
            print(f"Failed to launch MCP Inspector: {e}")
            raise
        except FileNotFoundError:
            print("MCP Inspector not found. Please install it manually:")
            print("npm install -g @modelcontextprotocol/inspector")
            raise
    
    def _is_mcp_inspector_available(self) -> bool:
        """Check if MCP Inspector is available"""
        try:
            subprocess.run(["mcp-inspector", "--version"], 
                         capture_output=True, check=True)
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False
    
    def _install_mcp_inspector(self):
        """Install MCP Inspector"""
        try:
            print("Installing MCP Inspector...")
            subprocess.run([
                "npm", "install", "-g", "@modelcontextprotocol/inspector"
            ], check=True)
            print("MCP Inspector installed successfully!")
        except subprocess.CalledProcessError as e:
            print(f"Failed to install MCP Inspector: {e}")
            print("Please install it manually:")
            print("npm install -g @modelcontextprotocol/inspector")
            raise
        except FileNotFoundError:
            print("npm not found. Please install Node.js and npm first.")
            raise 