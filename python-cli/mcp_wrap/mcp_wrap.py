import argparse
from mcp_wrap.formats import openai, langchain, claude
from mcp_wrap.schema_writer import write_yaml
from mcp_wrap.utils import detect_format
from mcp_wrap.server_generator import MCPServerGenerator

def main():
    parser = argparse.ArgumentParser(description="Convert tool definitions to MCP format and generate servers")
    parser.add_argument("path", help="Path to tools file (.py or .json)")
    parser.add_argument("--out", default="tools.yaml", help="Output YAML file path")
    parser.add_argument("--generate-server", action="store_true", help="Generate MCP server after conversion")
    parser.add_argument("--server-language", choices=["python", "typescript"], default="python", 
                       help="Language for server generation")
    parser.add_argument("--server-output", help="Server output file path")
    
    args = parser.parse_args()

    # Convert tools to YAML
    fmt = detect_format(args.path)
    if fmt == "openai":
        tools = openai.load_tools(args.path)
    elif fmt == "langchain":
        tools = langchain.load_tools(args.path)
    elif fmt == "claude":
        tools = claude.load_tools(args.path)
    else:
        raise Exception("Unsupported tool format")

    write_yaml(tools, args.out)
    print(f"✅ Converted tools to: {args.out}")

    # Generate server if requested
    if args.generate_server:
        generator = MCPServerGenerator(args.out)
        server_output = args.server_output or f"server.{'py' if args.server_language == 'python' else 'ts'}"
        generator.generate_server(args.server_language, server_output)
        print(f"✅ Generated {args.server_language} MCP server: {server_output}")

if __name__ == "__main__":
    main()