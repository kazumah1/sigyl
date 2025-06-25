# MCP Wrap - Python CLI

A Python CLI tool that converts tool definitions from various formats (OpenAI, LangChain, Claude) to MCP-compatible YAML and generates MCP servers.

## Installation

```bash
# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Usage

### Basic Conversion

```bash
python mcp_wrap.py <path-to-tools-file> [--out output.yaml]
```

### Convert and Generate Server

```bash
# Generate Python MCP server
python mcp_wrap.py <path-to-tools-file> --generate-server --server-language python

# Generate TypeScript MCP server
python mcp_wrap.py <path-to-tools-file> --generate-server --server-language typescript

# Custom output paths
python mcp_wrap.py <path-to-tools-file> --out tools.yaml --generate-server --server-output my_server.py
```

### Supported Formats

1. **OpenAI Format** - Python files with `functions` array
2. **LangChain Format** - Python files with `Tool` objects
3. **Claude Format** - JSON files with `input_schema`

### Examples

```bash
# Convert OpenAI format to YAML
python mcp_wrap.py demo/openai_tools.py --out tools.yaml

# Convert and generate Python server
python mcp_wrap.py demo/openai_tools.py --generate-server --server-language python

# Convert and generate TypeScript server
python mcp_wrap.py demo/langchain_tools.py --generate-server --server-language typescript
```

## Generated Servers

The tool generates ready-to-use MCP servers that:

- **Load configuration from YAML** - Uses the converted YAML as the single source of truth
- **Register all tools** - Automatically creates server.tool() calls for each tool
- **Generate handler stubs** - Creates placeholder functions for actual implementation
- **Support both Python and TypeScript** - Choose your preferred language

### Python Server Features
- Uses `fastmcp` library
- Async handler functions
- Type hints and documentation
- Ready to run with `python server.py`

### TypeScript Server Features
- Uses `@modelcontextprotocol/sdk`
- Zod schema validation
- YAML config loading
- Exportable server function

## Demo Files

Check the `demo/` directory for example tool definitions in each supported format.

## Generated Examples

The `results/` directory contains examples of:
- Converted YAML files
- Generated Python servers
- Generated TypeScript servers 