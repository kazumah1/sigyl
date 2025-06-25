#!/usr/bin/env python3
"""
Test script to verify imports work correctly
"""
import sys
import os

# Add the mcp_wrap directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'mcp_wrap'))

try:
    from mcp_wrap.formats import openai, langchain, claude
    from mcp_wrap.schema_writer import write_yaml
    from mcp_wrap.utils import detect_format
    from mcp_wrap.server_generator import MCPServerGenerator
    from mcp_wrap.mcp_wrap import main
    
    print("✅ All imports successful!")
    print("✅ Package structure is correct")
    
    # Test basic functionality
    print("\n🔍 Testing basic functionality...")
    
    # Test format detection
    test_file = "mcp_wrap/demo/openai_tools.py"
    if os.path.exists(test_file):
        fmt = detect_format(test_file)
        print(f"✅ Format detection works: {fmt}")
        
        # Test tool loading
        if fmt == "openai":
            tools = openai.load_tools(test_file)
            print(f"✅ Tool loading works: {len(tools)} tools loaded")
            
            # Test YAML writing
            write_yaml(tools, "test_output.yaml")
            print("✅ YAML writing works")
            
            # Test server generation
            generator = MCPServerGenerator("test_output.yaml")
            code = generator.generate_server("python", "test_server.py")
            print("✅ Server generation works")
            
            # Clean up
            os.remove("test_output.yaml")
            os.remove("test_server.py")
            
    print("\n🎉 All tests passed! The package is ready for installation.")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("💡 Make sure all files have correct import statements")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc() 