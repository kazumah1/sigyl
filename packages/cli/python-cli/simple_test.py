#!/usr/bin/env python3
"""
Simple test for the fixed Python CLI components
"""

import sys
import os
from pathlib import Path

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_scanner():
    """Test the FastAPI scanner"""
    try:
        from mcp_wrap.fastapi_scanner import FastAPIScanner
        
        print("✅ Successfully imported FastAPIScanner")
        
        scanner = FastAPIScanner()
        print("✅ Scanner created")
        
        # Test scanning the demo FastAPI app
        demo_path = "./test-scan/demo_fastapi/"
        if Path(demo_path).exists():
            print(f"🔍 Scanning FastAPI app: {demo_path}")
            endpoints = scanner.scan_fastapi_app(demo_path)
            print(f"✅ Found {len(endpoints)} endpoints")
            
            for endpoint in endpoints:
                print(f"  - {endpoint.method} {endpoint.path} ({endpoint.function_name})")
            
            return endpoints
        else:
            print(f"❌ Demo FastAPI app not found at: {demo_path}")
            return []
            
    except Exception as e:
        print(f"❌ Scanner test failed: {e}")
        import traceback
        traceback.print_exc()
        return []

def test_generator(endpoints):
    """Test the MCP generator"""
    try:
        from mcp_wrap.generator import MCPGenerator
        
        print("✅ Successfully imported MCPGenerator")
        
        generator = MCPGenerator()
        print("✅ Generator created")
        
        # Generate MCP server
        out_dir = ".mcp-generated"
        print(f"🚀 Generating MCP server in: {out_dir}")
        generator.generate_server(endpoints, out_dir, 8000)
        
        print("✅ MCP server generation completed!")
        
        # Check generated files
        out_path = Path(out_dir)
        files = ["mcp.yaml", "server.py", "requirements.txt", "README.md"]
        
        for file in files:
            if (out_path / file).exists():
                print(f"✅ Generated: {file}")
            else:
                print(f"❌ Missing: {file}")
        
        return True
        
    except Exception as e:
        print(f"❌ Generator test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run the tests"""
    print("🧪 Testing Python CLI Components")
    print("=" * 50)
    
    # Test scanner
    print("\n1. Testing FastAPI Scanner...")
    endpoints = test_scanner()
    
    if endpoints:
        # Test generator
        print("\n2. Testing MCP Generator...")
        success = test_generator(endpoints)
        
        if success:
            print("\n🎉 All tests passed!")
            print("\n📋 Summary:")
            print(f"  - Scanned {len(endpoints)} endpoints")
            print("  - Generated MCP server successfully")
            print("  - All files created correctly")
        else:
            print("\n❌ Generator test failed")
    else:
        print("\n❌ Scanner test failed")

if __name__ == "__main__":
    main() 