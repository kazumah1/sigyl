import argparse
import sys
from mcp_wrap.formats import openai, langchain, claude
from mcp_wrap.schema_writer import write_yaml
from mcp_wrap.utils import detect_format
from mcp_wrap.server_generator import MCPServerGenerator

# Try to import questionary for interactive wizard
try:
    import questionary
except ImportError:
    questionary = None

def run_wizard():
    if not questionary:
        print("\n❌ 'questionary' is not installed. Please install it with: pip install questionary\n")
        sys.exit(1)

    print("\n✨ Welcome to the MCP Wrap Setup Wizard! ✨\n")

    # 1. Tool file path
    tool_path = questionary.text(
        "Path to your existing tools file (.py or .json):",
        default="my_tools.py"
    ).ask()
    if not tool_path:
        print("Aborted.")
        sys.exit(1)

    # 2. Output YAML path
    out_yaml = questionary.text(
        "Output YAML file:",
        default="tools.yaml"
    ).ask()
    if not out_yaml:
        print("Aborted.")
        sys.exit(1)

    # 3. Generate server?
    gen_server = questionary.confirm(
        "Do you want to generate an MCP server?",
        default=True
    ).ask()

    server_lang = None
    server_out = None
    if gen_server:
        # 4. Server language
        server_lang = questionary.select(
            "Server language:",
            choices=["python", "typescript"],
            default="python"
        ).ask()
        # 5. Server output file
        default_server_out = f"server.{'py' if server_lang == 'python' else 'ts'}"
        server_out = questionary.text(
            "Server output file:",
            default=default_server_out
        ).ask()

    return {
        "path": tool_path,
        "out": out_yaml,
        "generate_server": gen_server,
        "server_language": server_lang,
        "server_output": server_out,
    }

def main():
    # If no arguments (other than script name), launch wizard
    if len(sys.argv) == 1:
        args = run_wizard()
    else:
        parser = argparse.ArgumentParser(description="Convert tool definitions to MCP format and generate servers")
        parser.add_argument("path", help="Path to tools file (.py or .json)")
        parser.add_argument("--out", default="tools.yaml", help="Output YAML file path")
        parser.add_argument("--generate-server", action="store_true", help="Generate MCP server after conversion")
        parser.add_argument("--server-language", choices=["python", "typescript"], default="python", 
                           help="Language for server generation")
        parser.add_argument("--server-output", help="Server output file path")
        args = vars(parser.parse_args())

    # Convert tools to YAML
    fmt = detect_format(args["path"])
    if fmt == "openai":
        tools = openai.load_tools(args["path"])
    elif fmt == "langchain":
        tools = langchain.load_tools(args["path"])
    elif fmt == "claude":
        tools = claude.load_tools(args["path"])
    else:
        raise Exception("Unsupported tool format")

    write_yaml(tools, args["out"])
    print(f"✅ Converted tools to: {args['out']}")

    # Generate server if requested
    if args.get("generate_server"):
        generator = MCPServerGenerator(args["out"])
        server_output = args.get("server_output") or f"server.{'py' if args.get('server_language', 'python') == 'python' else 'ts'}"
        generator.generate_server(args.get("server_language", "python"), server_output)
        print(f"✅ Generated {args.get('server_language', 'python')} MCP server: {server_output}")

if __name__ == "__main__":
    main()