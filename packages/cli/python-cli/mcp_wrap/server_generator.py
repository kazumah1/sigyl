import yaml
import json
from typing import Dict, Any, List
import os

class MCPServerGenerator:
    def __init__(self, yaml_path: str):
        """Initialize with path to YAML config file"""
        self.yaml_path = yaml_path
        self.tools = self._load_yaml()
    
    def _load_yaml(self) -> List[Dict[str, Any]]:
        """Load tools from YAML file"""
        with open(self.yaml_path, 'r') as f:
            return yaml.safe_load(f)
    
    def _generate_python_handler(self, tool: Dict[str, Any]) -> str:
        """Generate Python handler function for a tool"""
        name = tool['name']
        description = tool.get('description', '')
        parameters = tool.get('parameters', {})
        
        # Generate function signature
        param_names = []
        param_docs = []
        
        if 'properties' in parameters:
            for param_name, param_schema in parameters['properties'].items():
                param_names.append(param_name)
                param_desc = param_schema.get('description', f'{param_name} parameter')
                param_docs.append(f"    {param_name}: {param_desc}")
        
        # Generate handler function
        handler_code = f'''async def {name}_handler({', '.join(param_names)}):
    """
    {description}
    
    Args:
{chr(10).join(param_docs)}
    """
    # TODO: Implement actual functionality
    result = f"Executed {name} with parameters: {', '.join([f'{p}={p}' for p in param_names])}"
    return {{
        "content": [{{"type": "text", "text": result}}]
    }}
'''
        return handler_code
    
    def _generate_python_server(self) -> str:
        """Generate complete Python MCP server using FastMCP"""
        import os
        yaml_filename = os.path.basename(self.yaml_path)
        
        server_code = f'''import asyncio
import os
from fastmcp import FastMCP
import yaml
from typing import Dict, Any

# Load config from YAML (using relative path)
yaml_path = os.path.join(os.path.dirname(__file__), "{yaml_filename}")
with open(yaml_path, "r") as f:
    config = yaml.safe_load(f)

# Create FastMCP server
server = FastMCP("Generated MCP Server")

# Generated tool handlers
'''
        
        # Add all handler functions
        for tool in self.tools:
            server_code += self._generate_python_handler(tool) + '\n'
        
        # Register each tool
        for tool in self.tools:
            name = tool['name']
            description = tool.get('description', '')
            parameters = tool.get('parameters', {})
            
            # Convert JSON Schema to Python dict for validation
            param_dict = json.dumps(parameters, indent=2)
            
            server_code += f'''
# Register {name} tool
@server.tool()
async def {name}(
    {', '.join([f'{p}: str' for p in parameters.get('properties', {}).keys()])}
) -> Dict[str, Any]:
    """
    {description}
    """
    return await {name}_handler({', '.join(parameters.get('properties', {}).keys())})
'''
        
        server_code += '''
if __name__ == "__main__":
    asyncio.run(server.run())
'''
        
        return server_code
    
    def _generate_typescript_server(self) -> str:
        """Generate TypeScript MCP server"""
        server_code = f'''import {{ McpServer }} from "@modelcontextprotocol/sdk/server/mcp.js";
import {{ z }} from "zod";
import yaml from "yaml";
import fs from "fs";

// Load config from YAML
const config = yaml.parse(fs.readFileSync("{self.yaml_path}", "utf8"));

export default function createStatelessServer() {{
  const server = new McpServer({{
    name: "Generated MCP Server",
    version: "1.0.0",
  }});

'''
        
        # Add each tool
        for tool in self.tools:
            name = tool['name']
            description = tool.get('description', '')
            parameters = tool.get('parameters', {})
            
            # Convert JSON Schema to Zod schema
            zod_schema = self._json_schema_to_zod(parameters)
            
            server_code += f'''
  // {description}
  server.tool(
    "{name}",
    "{description}",
    {zod_schema},
    async ({{ {', '.join(parameters.get('properties', {}).keys())} }}) => {{
      return {{
        content: [{{ type: "text", text: `Executed {name} with parameters: {', '.join([f'${{{p}}}' for p in parameters.get('properties', {}).keys()])}` }}],
      }};
    }}
  );
'''
        
        server_code += '''
  return server.server;
}
'''
        
        return server_code
    
    def _json_schema_to_zod(self, schema: Dict[str, Any]) -> str:
        """Convert JSON Schema to Zod schema string"""
        if not schema or 'properties' not in schema:
            return "z.object({})"
        
        zod_props = []
        for prop_name, prop_schema in schema['properties'].items():
            prop_type = prop_schema.get('type', 'string')
            
            if prop_type == 'string':
                zod_type = "z.string()"
            elif prop_type == 'integer':
                zod_type = "z.number().int()"
            elif prop_type == 'boolean':
                zod_type = "z.boolean()"
            elif prop_type == 'array':
                zod_type = "z.array(z.any())"  # Simplified for now
            elif prop_type == 'object':
                zod_type = "z.object({})"  # Simplified for now
            else:
                zod_type = "z.any()"
            
            # Add description if available
            if 'description' in prop_schema:
                zod_type += f'.describe("{prop_schema["description"]}")'
            
            zod_props.append(f'{prop_name}: {zod_type}')
        
        return f"z.object({{{', '.join(zod_props)}}})"
    
    def generate_server(self, language: str = "python", output_path: str = None) -> str:
        """Generate MCP server code"""
        if language.lower() == "python":
            code = self._generate_python_server()
        elif language.lower() == "typescript":
            code = self._generate_typescript_server()
        else:
            raise ValueError(f"Unsupported language: {language}")
        
        if output_path:
            with open(output_path, 'w') as f:
                f.write(code)
        
        return code

def main():
    """CLI entry point for server generation"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate MCP server from YAML config")
    parser.add_argument("yaml_path", help="Path to YAML config file")
    parser.add_argument("--language", choices=["python", "typescript"], default="python", 
                       help="Target language for server generation")
    parser.add_argument("--output", help="Output file path (defaults to server.{py|ts})")
    
    args = parser.parse_args()
    
    generator = MCPServerGenerator(args.yaml_path)
    
    if not args.output:
        ext = "py" if args.language == "python" else "ts"
        args.output = f"server.{ext}"
    
    code = generator.generate_server(args.language, args.output)
    print(f"Generated {args.language} MCP server: {args.output}")

if __name__ == "__main__":
    main() 