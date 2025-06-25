"""
MCP Inspector - Launch MCP Inspector for testing generated servers

This module provides functionality to launch the MCP Inspector for testing
generated MCP servers.
"""

import subprocess
import sys
import os
import shutil
from pathlib import Path
from typing import Optional, List
import webbrowser
import time

class MCPInspector:
    def __init__(self):
        self.inspector_available = False
        self.inspector_path = None
    
    def launch_inspector(self, server_dir: str):
        """Launch MCP Inspector for the given server directory"""
        server_path = Path(server_dir)
        
        if not server_path.exists():
            raise FileNotFoundError(f"Server directory not found: {server_dir}")
        
        server_file = server_path / "server.py"
        if not server_file.exists():
            raise FileNotFoundError(f"MCP server not found at: {server_file}")
        
        # Create MCP Inspector config file (same as TypeScript CLI)
        self._create_inspector_config(server_path)
        
        # Try multiple approaches to launch inspector
        approaches = [
            self._try_npx_inspector,
            self._try_web_inspector,
            self._provide_manual_instructions
        ]
        
        for approach in approaches:
            try:
                if approach(server_path):
                    return
            except Exception as e:
                print(f"Approach failed: {e}")
                continue
        
        # If all approaches fail, provide manual instructions
        self._provide_manual_instructions(server_path)
    
    def _create_inspector_config(self, server_path: Path):
        """Create MCP Inspector config file (same as TypeScript CLI)"""
        import json
        
        # Always use the correct .mcp-generated directory and server.py
        mcp_generated = server_path.resolve()
        server_py = mcp_generated / "server.py"
        config = {
            "mcpServers": {
                "demo-server": {
                    "command": "python",
                    "args": ["server.py"],
                    "cwd": str(mcp_generated)
                }
            }
        }
        
        config_file = Path.cwd() / ".mcp-inspector-config.json"
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)
        
        print(f"✅ Created MCP Inspector config: {config_file}")
    
    def _try_npx_inspector(self, server_path: Path) -> bool:
        """Try using npx to run MCP Inspector (same as TypeScript CLI)"""
        try:
            # Check if npx is available
            result = subprocess.run(
                ["npx", "--version"], 
                capture_output=True, 
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                print("✅ Using npx to run MCP Inspector")
                
                # Run inspector without config/server flags (same as TypeScript CLI)
                try:
                    print("🚀 Starting MCP Inspector...")
                    inspector_process = subprocess.Popen([
                        "npx", "@modelcontextprotocol/inspector"
                    ], cwd=Path.cwd(), stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                    
                    # Wait for the inspector to print the tokenized URL
                    url_found = False
                    for _ in range(20):  # Wait up to ~10 seconds
                        line = inspector_process.stdout.readline()
                        if not line:
                            time.sleep(0.5)
                            continue
                        print(line.strip())
                        if "http://localhost:6274" in line and "MCP_PROXY_AUTH_TOKEN" in line:
                            print(f"\n[Inspector Link] {line.strip()}")
                            url_found = True
                            break
                    if not url_found:
                        print("🌐 Inspector should be available at: http://localhost:6274")
                        print("💡 If you see a connection error, check the Inspector logs for the tokenized URL.")
                    print("💡 Press Ctrl+C to stop the inspector")
                    
                    # Keep inspector running
                    try:
                        inspector_process.wait()
                    except KeyboardInterrupt:
                        print("\n🛑 Stopping MCP Inspector...")
                        inspector_process.terminate()
                        inspector_process.wait()
                    
                    return True
                    
                except subprocess.TimeoutExpired:
                    print("⏰ Inspector timed out, continuing...")
                except subprocess.CalledProcessError as e:
                    print(f"⚠️  Inspector failed: {e}")
                    print("🔄 Falling back to web inspector...")
                
                return True
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            pass
        return False
    
    def _try_web_inspector(self, server_path: Path) -> bool:
        """Try to open web-based MCP Inspector"""
        try:
            print("🌐 Opening MCP Inspector...")
            
            # Try to start the local MCP Inspector (same as TypeScript CLI)
            try:
                print("🚀 Starting local MCP Inspector...")
                inspector_process = subprocess.Popen([
                    "npx", "@modelcontextprotocol/inspector"
                ], cwd=Path.cwd(), stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                
                # Wait a moment for the inspector to start
                time.sleep(3)
                
                if inspector_process.poll() is not None:
                    stdout, stderr = inspector_process.communicate()
                    print(f"❌ MCP Inspector failed to start: {stderr}")
                    return False
                
                print("✅ MCP Inspector started successfully")
                print("🌐 Inspector available at: http://localhost:6274")
                
                # Try to open browser
                inspector_url = "http://localhost:6274"
                try:
                    print(f"🌐 Opening: {inspector_url}")
                    webbrowser.open(inspector_url)
                    print("✅ MCP Inspector opened in browser")
                    print("\n📋 The inspector is now running locally!")
                    print("💡 Press Ctrl+C to stop the inspector")
                    
                    # Keep inspector running
                    try:
                        inspector_process.wait()
                    except KeyboardInterrupt:
                        print("\n🛑 Stopping MCP Inspector...")
                        inspector_process.terminate()
                        inspector_process.wait()
                    
                    return True
                except Exception as e:
                    print(f"⚠️  Failed to open browser: {e}")
                    print(f"📋 Manual steps:")
                    print(f"1. Open your browser and go to: {inspector_url}")
                    print("2. The inspector should be ready to use")
                    print("\n💡 Press Ctrl+C to stop the inspector when done")
                    
                    # Keep inspector running for manual connection
                    try:
                        inspector_process.wait()
                    except KeyboardInterrupt:
                        print("\n🛑 Stopping MCP Inspector...")
                        inspector_process.terminate()
                        inspector_process.wait()
                    
                    return True
                
            except Exception as e:
                print(f"⚠️  Failed to start local inspector: {e}")
                print("📋 Manual steps:")
                print("1. Install MCP Inspector: npm install -g @modelcontextprotocol/inspector")
                print(f"2. Run: cd {server_path}")
                print("3. Run: npx @modelcontextprotocol/inspector")
                print("4. Open: http://localhost:6274")
                
                return True
            
        except Exception as e:
            print(f"Web inspector approach failed: {e}")
        
        return False
    
    def _provide_manual_instructions(self, server_path: Path):
        """Provide manual instructions for using MCP Inspector"""
        print("\n" + "="*60)
        print("🔧 MANUAL MCP INSPECTOR SETUP")
        print("="*60)
        print()
        print("MCP Inspector is not available. Here are your options:")
        print()
        print("1. 📦 Install MCP Inspector:")
        print("   npm install -g @modelcontextprotocol/inspector")
        print(f"   Then run: cd {server_path} && npx @modelcontextprotocol/inspector")
        print()
        print("2. 🌐 Use local MCP Inspector:")
        print("   a) Install: npm install -g @modelcontextprotocol/inspector")
        print(f"   b) Run: cd {server_path}")
        print("   c) Run: npx @modelcontextprotocol/inspector")
        print("   d) Open: http://localhost:6274")
        print()
        print("3. 🧪 Test manually:")
        print(f"   a) cd {server_path}")
        print("   b) python server.py")
        print("   c) Use any MCP client to connect via stdio")
        print()
        print("4. 🚀 Quick test:")
        print(f"   cd {server_path}")
        print("   npx @modelcontextprotocol/inspector")
        print("   # Then open http://localhost:6274")
        print()
        print(f"📁 Your MCP server is ready at: {server_path}")
        print("="*60)
    
    def _is_npm_available(self) -> bool:
        """Check if npm is available"""
        try:
            result = subprocess.run(
                ["npm", "--version"], 
                capture_output=True, 
                text=True,
                timeout=5
            )
            return result.returncode == 0
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            return False
    
    def _is_node_available(self) -> bool:
        """Check if Node.js is available"""
        try:
            result = subprocess.run(
                ["node", "--version"], 
                capture_output=True, 
                text=True,
                timeout=5
            )
            return result.returncode == 0
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            return False 