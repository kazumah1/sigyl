#!/usr/bin/env python3
"""
MCP CLI - FastAPI to MCP Server Generator

A Python CLI tool that scans FastAPI applications and generates MCP servers
with tools that map to your FastAPI endpoints.
"""

import argparse
import os
import sys
import subprocess
import json
import yaml
from pathlib import Path
from typing import List, Dict, Any, Optional
import ast
import astroid
from astroid import nodes
from rich.console import Console
from rich.prompt import Prompt, Confirm
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.panel import Panel

from .fastapi_scanner import FastAPIScanner
from .mcp_generator import MCPGenerator
from .inspector import MCPInspector

console = Console()

class MCPCLI:
    def __init__(self):
        self.scanner = FastAPIScanner()
        self.generator = MCPGenerator()
        self.inspector = MCPInspector()
    
    def scan(self, app_path: str, out_dir: str = ".mcp-generated", port: int = 8000):
        """Scan FastAPI app and generate MCP server"""
        console.print(f"[bold blue]🔍 Scanning FastAPI app at: {app_path}[/bold blue]")
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:
            # Scan FastAPI endpoints
            task = progress.add_task("Scanning FastAPI endpoints...", total=None)
            endpoints = self.scanner.scan_fastapi_app(app_path)
            progress.update(task, description=f"Found {len(endpoints)} endpoints")
            
            # Generate MCP server
            task = progress.add_task("Generating MCP server...", total=None)
            self.generator.generate_from_endpoints(endpoints, out_dir, port)
            progress.update(task, description="MCP server generated successfully")
        
        console.print(f"\n[bold green]✅ Generated MCP server in: {out_dir}[/bold green]")
        console.print("\n[bold blue]🚀 Next steps:[/bold blue]")
        console.print(f"  cd {out_dir}")
        console.print("  pip install -r requirements.txt")
        console.print("  python server.py")
        console.print("  mcp-scan inspect")
    
    def init(self, out_dir: str = ".mcp-generated", name: str = "my-mcp-server"):
        """Create a blank MCP server template"""
        console.print(f"[bold blue]🎯 Creating blank MCP server template...[/bold blue]")
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:
            task = progress.add_task("Generating template files...", total=None)
            self.generator.generate_blank_template(out_dir, name)
            progress.update(task, description="Template created successfully")
        
        console.print(f"\n[bold green]✅ Created blank MCP server in: {out_dir}[/bold green]")
        console.print("\n[bold blue]🚀 Next steps:[/bold blue]")
        console.print(f"  cd {out_dir}")
        console.print("  pip install -r requirements.txt")
        console.print("  python server.py")
        console.print("  mcp-scan inspect")
    
    def dev(self, app_path: str, out_dir: str = ".mcp-generated", port: int = 8000):
        """Development mode with hot reload"""
        console.print(f"[bold blue]🚀 Starting development mode...[/bold blue]")
        console.print(f"FastAPI app: {app_path}")
        console.print(f"MCP server: {out_dir}")
        console.print(f"Port: {port}")
        
        # Generate initial MCP server
        self.scan(app_path, out_dir, port)
        
        # Start FastAPI app in background
        console.print("\n[bold yellow]Starting FastAPI app...[/bold yellow]")
        try:
            # Start FastAPI app
            fastapi_process = subprocess.Popen(
                ["uvicorn", "main:app", "--reload", "--port", str(port)],
                cwd=app_path,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            console.print(f"[green]✅ FastAPI app started on port {port}[/green]")
            console.print("[yellow]Press Ctrl+C to stop[/yellow]")
            
            # Keep running until interrupted
            try:
                fastapi_process.wait()
            except KeyboardInterrupt:
                console.print("\n[red]Stopping development mode...[/red]")
                fastapi_process.terminate()
                fastapi_process.wait()
                
        except Exception as e:
            console.print(f"[red]❌ Failed to start FastAPI app: {e}[/red]")
    
    def inspect(self, out_dir: str = ".mcp-generated"):
        """Launch MCP Inspector"""
        console.print(f"[bold blue]🕵️  Launching MCP Inspector...[/bold blue]")
        
        server_path = Path(out_dir) / "server.py"
        if not server_path.exists():
            console.print(f"[red]❌ MCP server not found at: {server_path}[/red]")
            console.print("Run 'mcp-scan scan' or 'mcp-scan init' first")
            return
        
        try:
            self.inspector.launch_inspector(out_dir)
        except Exception as e:
            console.print(f"[red]❌ Failed to launch inspector: {e}[/red]")
    
    def clean(self, out_dir: str = ".mcp-generated"):
        """Clean generated files"""
        import shutil
        
        if Confirm.ask(f"Remove directory '{out_dir}'?"):
            try:
                shutil.rmtree(out_dir)
                console.print(f"[green]✅ Removed {out_dir}[/green]")
            except Exception as e:
                console.print(f"[red]❌ Failed to remove {out_dir}: {e}[/red]")
        else:
            console.print("[yellow]Operation cancelled[/yellow]")

def main():
    parser = argparse.ArgumentParser(
        description="MCP CLI - FastAPI to MCP Server Generator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  mcp-scan scan ./my-fastapi-app          # Scan FastAPI app and generate MCP server
  mcp-scan init --out ./my-mcp-server     # Create blank MCP server template
  mcp-scan dev ./my-fastapi-app           # Development mode with hot reload
  mcp-scan inspect                        # Launch MCP Inspector
  mcp-scan clean                          # Remove generated files
  mcp-scan                                # Interactive mode
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Scan command
    scan_parser = subparsers.add_parser("scan", help="Scan FastAPI app and generate MCP server")
    scan_parser.add_argument("app_path", help="Path to FastAPI application directory")
    scan_parser.add_argument("--out", default=".mcp-generated", help="Output directory for generated MCP server")
    scan_parser.add_argument("--port", type=int, default=8000, help="Port for FastAPI app (default: 8000)")
    
    # Init command
    init_parser = subparsers.add_parser("init", help="Create a blank MCP server template")
    init_parser.add_argument("--out", default=".mcp-generated", help="Output directory for generated MCP server")
    init_parser.add_argument("--name", default="my-mcp-server", help="Name for the MCP server")
    
    # Dev command
    dev_parser = subparsers.add_parser("dev", help="Development mode with hot reload")
    dev_parser.add_argument("app_path", help="Path to FastAPI application directory")
    dev_parser.add_argument("--out", default=".mcp-generated", help="Output directory for generated MCP server")
    dev_parser.add_argument("--port", type=int, default=8000, help="Port for FastAPI app (default: 8000)")
    
    # Inspect command
    inspect_parser = subparsers.add_parser("inspect", help="Launch MCP Inspector")
    inspect_parser.add_argument("--out", default=".mcp-generated", help="MCP server directory")
    
    # Clean command
    clean_parser = subparsers.add_parser("clean", help="Remove generated files")
    clean_parser.add_argument("--out", default=".mcp-generated", help="Directory to remove")
    
    args = parser.parse_args()
    
    cli = MCPCLI()
    
    # If no command provided, run interactive mode
    if not args.command:
        interactive_mode(cli)
        return
    
    try:
        if args.command == "scan":
            cli.scan(args.app_path, args.out, args.port)
        elif args.command == "init":
            cli.init(args.out, args.name)
        elif args.command == "dev":
            cli.dev(args.app_path, args.out, args.port)
        elif args.command == "inspect":
            cli.inspect(args.out)
        elif args.command == "clean":
            cli.clean(args.out)
    except Exception as e:
        console.print(f"[red]❌ Error: {e}[/red]")
        sys.exit(1)

def interactive_mode(cli: MCPCLI):
    """Interactive CLI mode with menu options"""
    console.print(Panel.fit(
        "[bold blue]MCP CLI - FastAPI to MCP Server Generator[/bold blue]\n"
        "[dim]Interactive Mode[/dim]",
        border_style="blue"
    ))
    
    while True:
        console.print("\n[bold]Available options:[/bold]")
        options = [
            ("1", "Scan FastAPI app and generate MCP server"),
            ("2", "Create blank MCP server template"),
            ("3", "Development mode with hot reload"),
            ("4", "Launch MCP Inspector"),
            ("5", "Clean generated files"),
            ("q", "Quit")
        ]
        
        for key, description in options:
            console.print(f"  [cyan]{key}[/cyan] - {description}")
        
        choice = Prompt.ask("\n[bold]Choose an option[/bold]", choices=["1", "2", "3", "4", "5", "q"])
        
        if choice == "q":
            console.print("[yellow]Goodbye![/yellow]")
            break
        elif choice == "1":
            handle_scan(cli)
        elif choice == "2":
            handle_init(cli)
        elif choice == "3":
            handle_dev(cli)
        elif choice == "4":
            handle_inspect(cli)
        elif choice == "5":
            handle_clean(cli)

def handle_scan(cli: MCPCLI):
    """Handle scan option in interactive mode"""
    console.print("\n[bold blue]🔍 Scan FastAPI App[/bold blue]")
    
    # Get FastAPI app path
    app_path = Prompt.ask("Enter path to FastAPI application directory")
    if not os.path.exists(app_path):
        console.print(f"[red]❌ Directory not found: {app_path}[/red]")
        return
    
    # Get output directory
    out_dir = Prompt.ask("Enter output directory", default="my-server")
    
    # Get port
    port_str = Prompt.ask("Enter FastAPI app port", default="8000")
    try:
        port = int(port_str)
    except ValueError:
        console.print("[red]❌ Invalid port number[/red]")
        return
    
    try:
        cli.scan(app_path, out_dir, port)
    except Exception as e:
        console.print(f"[red]❌ Error: {e}[/red]")

def handle_init(cli: MCPCLI):
    """Handle init option in interactive mode"""
    console.print("\n[bold blue]🎯 Create Blank MCP Server[/bold blue]")
    
    # Get output directory
    out_dir = Prompt.ask("Enter output directory", default="my-blank-server")
    
    # Get server name
    name = Prompt.ask("Enter server name", default="my-mcp-server")
    
    try:
        cli.init(out_dir, name)
    except Exception as e:
        console.print(f"[red]❌ Error: {e}[/red]")

def handle_dev(cli: MCPCLI):
    """Handle dev option in interactive mode"""
    console.print("\n[bold blue]🚀 Development Mode[/bold blue]")
    
    # Get FastAPI app path
    app_path = Prompt.ask("Enter path to FastAPI application directory")
    if not os.path.exists(app_path):
        console.print(f"[red]❌ Directory not found: {app_path}[/red]")
        return
    
    # Get output directory
    out_dir = Prompt.ask("Enter output directory", default=".mcp-generated")
    
    # Get port
    port_str = Prompt.ask("Enter FastAPI app port", default="8000")
    try:
        port = int(port_str)
    except ValueError:
        console.print("[red]❌ Invalid port number[/red]")
        return
    
    try:
        cli.dev(app_path, out_dir, port)
    except Exception as e:
        console.print(f"[red]❌ Error: {e}[/red]")

def handle_inspect(cli: MCPCLI):
    """Handle inspect option in interactive mode"""
    console.print("\n[bold blue]🕵️  MCP Inspector[/bold blue]")
    
    # Get server directory
    out_dir = Prompt.ask("Enter MCP server directory", default=".mcp-generated")
    
    try:
        cli.inspect(out_dir)
    except Exception as e:
        console.print(f"[red]❌ Error: {e}[/red]")

def handle_clean(cli: MCPCLI):
    """Handle clean option in interactive mode"""
    console.print("\n[bold blue]🧹 Clean Generated Files[/bold blue]")
    
    # Get directory to clean
    out_dir = Prompt.ask("Enter directory to remove", default=".mcp-generated")
    
    try:
        cli.clean(out_dir)
    except Exception as e:
        console.print(f"[red]❌ Error: {e}[/red]")

if __name__ == "__main__":
    main() 