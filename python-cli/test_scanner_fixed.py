#!/usr/bin/env python3
"""
Test script for the fixed FastAPI scanner
"""

import sys
import os
from pathlib import Path

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from mcp_wrap.fastapi_scanner import FastAPIScanner

def main():
    """Test the fixed scanner"""
    print("🧪 Testing Fixed FastAPI Scanner...")
    
    # Test with the my-fastapi-app
    app_path = "./my-fastapi-app"
    
    if not Path(app_path).exists():
        print(f"❌ App path {app_path} does not exist")
        return
    
    try:
        scanner = FastAPIScanner()
        endpoints = scanner.scan_fastapi_app(app_path)
        
        print(f"\n✅ Scanner completed successfully!")
        print(f"📊 Found {len(endpoints)} endpoints:")
        
        if endpoints:
            for endpoint in endpoints:
                print(f"\n  🔗 {endpoint.method} {endpoint.path}")
                print(f"     Function: {endpoint.function_name}")
                print(f"     Description: {endpoint.description}")
                print(f"     Parameters: {len(endpoint.parameters)}")
                if endpoint.parameters:
                    for param in endpoint.parameters:
                        print(f"       - {param['name']}: {param['type']} ({param['location']})")
                if endpoint.request_body:
                    print(f"     Request body: {endpoint.request_body.get('type', 'unknown')}")
                if endpoint.response_type:
                    print(f"     Response type: {endpoint.response_type}")
        else:
            print("  ⚠️  No endpoints found")
            print("  💡 This might indicate an issue with the scanner")
        
        print(f"\n🎉 Test completed!")
        
    except Exception as e:
        print(f"❌ Scanner test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 