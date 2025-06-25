#!/usr/bin/env python3
"""
Debug script for FastAPI scanner
"""

import sys
import os
from pathlib import Path

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from mcp_wrap.fastapi_scanner import FastAPIScanner

def main():
    """Test the scanner with debugging"""
    print("🔍 Testing FastAPI Scanner with debugging...")
    
    # Test with the my-fastapi-app
    app_path = "./my-fastapi-app"
    
    if not Path(app_path).exists():
        print(f"❌ App path {app_path} does not exist")
        return
    
    try:
        scanner = FastAPIScanner()
        endpoints = scanner.scan_fastapi_app(app_path)
        
        print(f"\n✅ Scanner completed!")
        print(f"📊 Found {len(endpoints)} endpoints:")
        
        for endpoint in endpoints:
            print(f"  - {endpoint.method} {endpoint.path} ({endpoint.function_name})")
            print(f"    Description: {endpoint.description}")
            print(f"    Parameters: {len(endpoint.parameters)}")
            if endpoint.parameters:
                for param in endpoint.parameters:
                    print(f"      * {param['name']}: {param['type']} ({param['location']})")
            if endpoint.request_body:
                print(f"    Request body: {endpoint.request_body.get('type', 'unknown')}")
            print()
        
    except Exception as e:
        print(f"❌ Scanner test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 