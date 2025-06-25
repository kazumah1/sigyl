"""
FastAPI Scanner - Parse FastAPI applications and extract endpoint information

This module scans FastAPI applications to extract route definitions, parameters,
and metadata for generating MCP tools.
"""

import ast
import astroid
from astroid import nodes
from pathlib import Path
from typing import List, Dict, Any, Optional
import re

class FastAPIEndpoint:
    def __init__(self, path: str, method: str, function_name: str, description: str = ""):
        self.path = path
        self.method = method.upper()
        self.function_name = function_name
        self.description = description
        self.parameters: List[Dict[str, Any]] = []
        self.request_body: Optional[Dict[str, Any]] = None
        self.response_type: Optional[str] = None
        self.tags: List[str] = []

class FastAPIScanner:
    def __init__(self):
        self.endpoints: List[FastAPIEndpoint] = []
    
    def scan_fastapi_app(self, app_path: str) -> List[FastAPIEndpoint]:
        """Scan a FastAPI application and extract all endpoints"""
        app_path = Path(app_path)
        
        if not app_path.exists():
            raise FileNotFoundError(f"FastAPI app path not found: {app_path}")
        
        # Look for main.py or app.py
        main_files = ["main.py", "app.py"]
        main_file = None
        
        for file_name in main_files:
            potential_file = app_path / file_name
            if potential_file.exists():
                main_file = potential_file
                break
        
        if not main_file:
            # Search for Python files that might contain FastAPI app
            python_files = list(app_path.glob("*.py"))
            if not python_files:
                raise FileNotFoundError(f"No Python files found in {app_path}")
            main_file = python_files[0]  # Use first Python file
        
        return self._scan_file(main_file)
    
    def _scan_file(self, file_path: Path) -> List[FastAPIEndpoint]:
        """Scan a single Python file for FastAPI endpoints"""
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        try:
            tree = astroid.parse(content)
        except Exception as e:
            print(f"Warning: Could not parse {file_path}: {e}")
            return []
        
        endpoints = []
        
        # Find FastAPI app instance
        app_node = self._find_fastapi_app(tree)
        if not app_node:
            return []
        
        # Find all route decorators
        for node in tree.body:
            if isinstance(node, nodes.FunctionDef) or isinstance(node, nodes.AsyncFunctionDef):
                endpoint = self._extract_endpoint_from_function(node)
                if endpoint:
                    endpoints.append(endpoint)
        
        return endpoints
    
    def _find_fastapi_app(self, tree: nodes.Module) -> Optional[nodes.Assign]:
        """Find the FastAPI app instance"""
        for node in tree.body:
            if isinstance(node, nodes.Assign):
                for target in node.targets:
                    if isinstance(target, nodes.AssignName):
                        # Check if this is a FastAPI app
                        if isinstance(node.value, nodes.Call):
                            if isinstance(node.value.func, nodes.Name):
                                if node.value.func.name == "FastAPI":
                                    return node
        return None
    
    def _extract_endpoint_from_function(self, func_node) -> Optional[FastAPIEndpoint]:
        """Extract endpoint information from a function with route decorators"""
        if not func_node.decorators:
            return None
        
        for decorator in func_node.decorators.nodes:
            endpoint = self._parse_route_decorator(decorator, func_node)
            if endpoint:
                return endpoint
        
        return None
    
    def _parse_route_decorator(self, decorator: nodes.NodeNG, func_node) -> Optional[FastAPIEndpoint]:
        """Parse a route decorator (app.get, app.post, etc.)"""
        if not isinstance(decorator, nodes.Call):
            return None
        
        # Check if this is a route decorator
        if not isinstance(decorator.func, nodes.Attribute):
            return None
        
        # Extract method and path
        method = decorator.func.attrname
        if method not in ["get", "post", "put", "delete", "patch"]:
            return None
        
        # Extract path from arguments
        path = "/"
        if decorator.args:
            path_arg = decorator.args[0]
            if isinstance(path_arg, nodes.Const):
                path = path_arg.value
        
        # Extract description from docstring
        description = ""
        if hasattr(func_node, 'doc') and func_node.doc:
            description = func_node.doc
        
        # Extract parameters
        parameters = self._extract_parameters(func_node)
        
        # Extract request body
        request_body = self._extract_request_body(func_node)
        
        # Extract response type
        response_type = self._extract_response_type(func_node)
        
        endpoint = FastAPIEndpoint(path, method, func_node.name, description)
        endpoint.parameters = parameters
        endpoint.request_body = request_body
        endpoint.response_type = response_type
        
        return endpoint
    
    def _extract_parameters(self, func_node) -> List[Dict[str, Any]]:
        """Extract parameters from function signature"""
        parameters = []
        
        for arg in func_node.args.args:
            try:
                # Only process arguments that have a 'name' attribute (skip AssignName, etc.)
                if not hasattr(arg, 'name') or arg.name in ["self", "cls"]:
                    continue
                
                param_info = {
                    "name": arg.name,
                    "type": "string",  # Default type
                    "required": True,
                    "location": "path"  # Default location
                }
                
                # Try to infer type from annotation
                if hasattr(arg, 'annotation') and arg.annotation:
                    param_info["type"] = self._extract_type_from_annotation(arg.annotation)
                
                # Check if parameter is optional (has default)
                if hasattr(arg, 'default') and arg.default:
                    param_info["required"] = False
                
                # Try to determine location from parameter name or type hints
                if "query" in arg.name.lower() or "param" in arg.name.lower():
                    param_info["location"] = "query"
                elif "body" in arg.name.lower() or "data" in arg.name.lower():
                    param_info["location"] = "body"
                
                parameters.append(param_info)
                
            except Exception as e:
                # Skip any arguments that cause issues
                print(f"Warning: Skipping argument due to parsing error: {e}")
                continue
        
        return parameters
    
    def _extract_request_body(self, func_node) -> Optional[Dict[str, Any]]:
        """Extract request body information"""
        try:
            # Look for Pydantic models in function parameters
            for arg in func_node.args.args:
                try:
                    if hasattr(arg, 'annotation') and arg.annotation:
                        type_name = self._extract_type_from_annotation(arg.annotation)
                        if "Model" in type_name or "Schema" in type_name or "Request" in type_name:
                            return {
                                "type": "object",
                                "properties": {},  # Would need to parse Pydantic model
                                "required": []
                            }
                except Exception as e:
                    print(f"Warning: Error processing argument annotation: {e}")
                    continue
        except Exception as e:
            print(f"Warning: Error extracting request body: {e}")
        return None
    
    def _extract_response_type(self, func_node) -> Optional[str]:
        """Extract response type from function"""
        try:
            # Look for return type annotation
            if hasattr(func_node, 'returns') and func_node.returns:
                return self._extract_type_from_annotation(func_node.returns)
        except Exception as e:
            print(f"Warning: Error extracting response type: {e}")
        return None
    
    def _extract_type_from_annotation(self, annotation: nodes.NodeNG) -> str:
        """Extract type name from annotation"""
        try:
            if isinstance(annotation, nodes.Name):
                return annotation.name
            elif isinstance(annotation, nodes.Attribute):
                return annotation.attrname
            elif isinstance(annotation, nodes.Subscript):
                if isinstance(annotation.value, nodes.Name):
                    return annotation.value.name
        except Exception as e:
            print(f"Warning: Error extracting type from annotation: {e}")
        return "any"
    
    def _generate_tool_name(self, endpoint: FastAPIEndpoint) -> str:
        """Generate a tool name from endpoint path and method"""
        # Convert path to snake_case
        path_parts = endpoint.path.strip("/").split("/")
        method = endpoint.method.lower()
        
        tool_name = method
        for part in path_parts:
            if part.startswith("{"):
                # Path parameter
                param_name = part.strip("{}")
                tool_name += "_by_" + param_name.lower()
            else:
                tool_name += "_" + part.lower()
        
        return tool_name 