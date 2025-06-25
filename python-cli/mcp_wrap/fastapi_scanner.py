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
import os

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
        self.file_path: Optional[str] = None
        self.line_number: Optional[int] = None

class FastAPIScanner:
    def __init__(self):
        self.endpoints: List[FastAPIEndpoint] = []
        self.type_cache: Dict[str, Dict[str, Any]] = {}
        self.imported_types: Dict[str, str] = {}
    
    def scan_fastapi_app(self, app_path: str) -> List[FastAPIEndpoint]:
        """Scan a FastAPI application and extract all endpoints"""
        app_path = Path(app_path)
        
        if not app_path.exists():
            raise FileNotFoundError(f"FastAPI app path not found: {app_path}")
        
        # Reset state
        self.endpoints = []
        self.type_cache = {}
        self.imported_types = {}
        
        # Find all Python files in the app directory
        python_files = list(app_path.rglob("*.py"))
        if not python_files:
            raise FileNotFoundError(f"No Python files found in {app_path}")
        
        # First pass: collect all types and imports
        for file_path in python_files:
            self._collect_types_and_imports(file_path)
        
        # Second pass: scan for endpoints
        for file_path in python_files:
            endpoints = self._scan_file_for_endpoints(file_path)
            self.endpoints.extend(endpoints)
        
        return self.endpoints
    
    def _collect_types_and_imports(self, file_path: Path):
        """Collect type definitions and imports from a file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            tree = astroid.parse(content)
            
            # Extract imports
            for node in tree.body:
                if isinstance(node, nodes.Import):
                    for alias in node.names:
                        self.imported_types[alias.asname or alias.name] = alias.name
                elif isinstance(node, nodes.ImportFrom):
                    module = node.modname
                    for alias in node.names:
                        full_name = f"{module}.{alias.name}"
                        self.imported_types[alias.asname or alias.name] = full_name
            
            # Extract type definitions (Pydantic models, etc.)
            for node in tree.body:
                if isinstance(node, nodes.ClassDef):
                    if self._is_pydantic_model(node):
                        self._extract_pydantic_model(node)
                        
        except Exception as e:
            print(f"Warning: Could not parse types from {file_path}: {e}")
    
    def _is_pydantic_model(self, class_node: nodes.ClassDef) -> bool:
        """Check if a class is a Pydantic model"""
        try:
            # Check for BaseModel inheritance
            for base in class_node.bases:
                if isinstance(base, nodes.Name) and base.name == "BaseModel":
                    return True
                elif isinstance(base, nodes.Attribute):
                    if base.attrname == "BaseModel":
                        return True
            
            # Check for Pydantic imports
            if hasattr(class_node, 'decorators') and class_node.decorators:
                for decorator in class_node.decorators.nodes:
                    if isinstance(decorator, nodes.Call):
                        if isinstance(decorator.func, nodes.Name) and decorator.func.name in ["dataclass", "model"]:
                            return True
        except Exception as e:
            print(f"Warning: Could not check if class {getattr(class_node, 'name', 'unknown')} is Pydantic model: {e}")
        
        return False
    
    def _extract_pydantic_model(self, class_node: nodes.ClassDef):
        """Extract schema from a Pydantic model"""
        try:
            model_name = class_node.name
            properties = {}
            required = []
            
            for node in class_node.body:
                if isinstance(node, nodes.AnnAssign):
                    if isinstance(node.target, nodes.AssignName):
                        field_name = node.target.name
                        field_type = self._extract_type_from_annotation(node.annotation)
                        
                        properties[field_name] = {
                            "type": field_type,
                            "description": self._extract_docstring(node)
                        }
                        
                        # Check if field is required (no default value)
                        if not node.value:
                            required.append(field_name)
            
            self.type_cache[model_name] = {
                "type": "object",
                "properties": properties,
                "required": required
            }
        except Exception as e:
            print(f"Warning: Could not extract Pydantic model {getattr(class_node, 'name', 'unknown')}: {e}")
    
    def _scan_file_for_endpoints(self, file_path: Path) -> List[FastAPIEndpoint]:
        """Scan a single Python file for FastAPI endpoints"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            tree = astroid.parse(content)
            endpoints = []
            
            # Scan for route decorators on functions
            for node in tree.body:
                if isinstance(node, (nodes.FunctionDef, nodes.AsyncFunctionDef)):
                    endpoint = self._extract_endpoint_from_function(node, file_path)
                    if endpoint:
                        endpoints.append(endpoint)
            
            return endpoints
            
        except Exception as e:
            print(f"Warning: Could not parse {file_path}: {e}")
            return []
    
    def _extract_endpoint_from_function(self, func_node, file_path: Path) -> Optional[FastAPIEndpoint]:
        """Extract endpoint information from a function with route decorators"""
        try:
            if not hasattr(func_node, 'decorators') or not func_node.decorators:
                return None
            
            for decorator in func_node.decorators.nodes:
                endpoint = self._parse_route_decorator(decorator, func_node, file_path)
                if endpoint:
                    return endpoint
            
            return None
        except Exception as e:
            print(f"Warning: Could not extract endpoint from function {getattr(func_node, 'name', 'unknown')}: {e}")
            return None
    
    def _parse_route_decorator(self, decorator: nodes.NodeNG, func_node, file_path: Path) -> Optional[FastAPIEndpoint]:
        """Parse a route decorator (app.get, app.post, etc.)"""
        try:
            if not isinstance(decorator, nodes.Call):
                return None
            
            # Check if this is a route decorator
            if not isinstance(decorator.func, nodes.Attribute):
                return None
            
            # Extract method and path
            method = decorator.func.attrname
            if method not in ["get", "post", "put", "delete", "patch", "head", "options"]:
                return None
            
            # Extract path from decorator arguments
            path = self._extract_path_from_decorator(decorator)
            if not path:
                return None
            
            # Create endpoint
            endpoint = FastAPIEndpoint(
                path=path,
                method=method,
                function_name=func_node.name,
                description=self._extract_docstring(func_node)
            )
            
            # Extract parameters from function signature
            endpoint.parameters = self._extract_parameters(func_node)
            
            # Extract request body
            endpoint.request_body = self._extract_request_body(func_node)
            
            # Extract response type
            endpoint.response_type = self._extract_response_type(func_node)
            
            # Extract tags
            endpoint.tags = self._extract_tags_from_decorator(decorator)
            
            # Set file information
            endpoint.file_path = str(file_path)
            endpoint.line_number = func_node.lineno
            
            return endpoint
        except Exception as e:
            print(f"Warning: Could not parse route decorator: {e}")
            return None
    
    def _extract_path_from_decorator(self, decorator: nodes.Call) -> Optional[str]:
        """Extract path from route decorator arguments"""
        try:
            if not decorator.args:
                return None
            
            # First argument should be the path
            path_arg = decorator.args[0]
            
            if isinstance(path_arg, nodes.Const):
                return path_arg.value
            elif isinstance(path_arg, nodes.JoinedStr):
                return self._extract_f_string(path_arg)
            elif isinstance(path_arg, nodes.BinOp):
                # Handle string concatenation
                return self._extract_string_concatenation(path_arg)
            elif isinstance(path_arg, nodes.Name):
                # Handle variable references (e.g., path = "/users"; @app.get(path))
                # For now, return a placeholder
                return f"/{{{path_arg.name}}}"
            elif isinstance(path_arg, (list, tuple)):
                # Handle tuple/list arguments (e.g., @app.get("/users", response_model=User))
                # The first element should be the path
                if path_arg and hasattr(path_arg[0], 'value'):
                    return path_arg[0].value
                return None
            elif hasattr(path_arg, 'value'):
                # Handle other node types that might have a value attribute
                return path_arg.value
            
            return None
        except Exception as e:
            print(f"Warning: Could not extract path from decorator: {e}")
            return None
    
    def _extract_string_concatenation(self, bin_op: nodes.BinOp) -> str:
        """Extract string from binary operation (concatenation)"""
        try:
            if isinstance(bin_op.op, nodes.Add):
                left = self._extract_string_value(bin_op.left)
                right = self._extract_string_value(bin_op.right)
                if left and right:
                    return left + right
        except Exception as e:
            print(f"Warning: Could not extract string concatenation: {e}")
        return ""
    
    def _extract_string_value(self, node: nodes.NodeNG) -> Optional[str]:
        """Extract string value from various node types"""
        try:
            if isinstance(node, nodes.Const):
                return str(node.value)
            elif isinstance(node, nodes.JoinedStr):
                return self._extract_f_string(node)
            elif isinstance(node, nodes.BinOp):
                return self._extract_string_concatenation(node)
        except Exception as e:
            print(f"Warning: Could not extract string value: {e}")
        return None
    
    def _extract_f_string(self, joined_str_node: nodes.JoinedStr) -> str:
        """Extract string from f-string"""
        result = ""
        try:
            for value in joined_str_node.values:
                if isinstance(value, nodes.Const):
                    result += str(value.value)
                elif isinstance(value, nodes.FormattedValue):
                    # For f-string variables, use a placeholder
                    try:
                        if hasattr(value, 'value') and hasattr(value.value, 'as_string'):
                            result += "{" + value.value.as_string() + "}"
                        else:
                            result += "{variable}"
                    except Exception:
                        result += "{variable}"
        except Exception as e:
            print(f"Warning: Could not extract f-string: {e}")
            result = "{variable}"
        return result
    
    def _extract_parameters(self, func_node) -> List[Dict[str, Any]]:
        """Extract parameters from function signature"""
        parameters = []
        
        try:
            # Handle astroid function arguments properly
            if hasattr(func_node, 'args') and func_node.args:
                for arg in func_node.args.args:
                    # Get argument name safely
                    arg_name = getattr(arg, 'name', None)
                    if not arg_name or arg_name in ["self", "cls"]:
                        continue
                    
                    param_info = {
                        "name": arg_name,
                        "type": "string",  # Default type
                        "required": True,
                        "location": "path",  # Default location
                        "description": f"Parameter: {arg_name}"
                    }
                    
                    # Extract type annotation safely
                    if hasattr(arg, 'annotation') and arg.annotation:
                        param_info["type"] = self._extract_type_from_annotation(arg.annotation)
                    
                    # Check if parameter is optional (has default value)
                    if hasattr(arg, 'default') and arg.default:
                        param_info["required"] = False
                    
                    # Try to infer location from type hints or parameter name
                    if param_info["type"].lower() in ["dict", "object", "any"]:
                        param_info["location"] = "body"
                    elif arg_name.lower() in ["query", "params", "path"]:
                        param_info["location"] = arg_name.lower()
                    
                    parameters.append(param_info)
        except Exception as e:
            print(f"Warning: Could not extract parameters from function {getattr(func_node, 'name', 'unknown')}: {e}")
        
        return parameters
    
    def _extract_request_body(self, func_node) -> Optional[Dict[str, Any]]:
        """Extract request body information from function parameters"""
        try:
            if hasattr(func_node, 'args') and func_node.args:
                for arg in func_node.args.args:
                    # Get argument name safely
                    arg_name = getattr(arg, 'name', None)
                    if not arg_name or arg_name in ["self", "cls"]:
                        continue
                    
                    if hasattr(arg, 'annotation') and arg.annotation:
                        type_name = self._extract_type_from_annotation(arg.annotation)
                        if type_name.lower() in ["dict", "object", "any"]:
                            # Look for Pydantic model types
                            if type_name in self.type_cache:
                                return self.type_cache[type_name]
                            else:
                                return {
                                    "type": "object",
                                    "description": f"Request body: {arg_name}"
                                }
        except Exception as e:
            print(f"Warning: Could not extract request body from function {getattr(func_node, 'name', 'unknown')}: {e}")
        
        return None
    
    def _extract_response_type(self, func_node) -> Optional[str]:
        """Extract response type from function return annotation"""
        try:
            if hasattr(func_node, 'returns') and func_node.returns:
                return self._extract_type_from_annotation(func_node.returns)
            
            # Try to infer from function body
            return self._infer_response_type_from_body(func_node)
        except Exception as e:
            print(f"Warning: Could not extract response type from function {getattr(func_node, 'name', 'unknown')}: {e}")
            return None
    
    def _infer_response_type_from_body(self, func_node) -> Optional[str]:
        """Infer response type from function body"""
        try:
            # Use astroid's walk method instead of ast.walk
            for node in func_node.nodes_of_class(nodes.Return):
                if hasattr(node, 'value') and node.value:
                    if isinstance(node.value, nodes.Dict):
                        return "object"
                    elif isinstance(node.value, nodes.List):
                        return "array"
                    elif isinstance(node.value, nodes.Const):
                        if isinstance(node.value.value, str):
                            return "string"
                        elif isinstance(node.value.value, (int, float)):
                            return "number"
                        elif isinstance(node.value.value, bool):
                            return "boolean"
        except Exception as e:
            print(f"Warning: Could not infer response type from function body: {e}")
        return None
    
    def _extract_tags_from_decorator(self, decorator: nodes.Call) -> List[str]:
        """Extract tags from route decorator"""
        tags = []
        
        try:
            # Look for tags in keyword arguments
            if hasattr(decorator, 'keywords'):
                for keyword in decorator.keywords:
                    if hasattr(keyword, 'arg') and keyword.arg == "tags":
                        if hasattr(keyword, 'value') and isinstance(keyword.value, nodes.List):
                            if hasattr(keyword.value, 'elts'):
                                for item in keyword.value.elts:
                                    if isinstance(item, nodes.Const):
                                        tags.append(str(item.value))
        except Exception as e:
            print(f"Warning: Could not extract tags from decorator: {e}")
        
        return tags
    
    def _extract_type_from_annotation(self, annotation: nodes.NodeNG) -> str:
        """Extract type name from type annotation"""
        try:
            if annotation is None:
                return "object"
            
            if isinstance(annotation, nodes.Name):
                return annotation.name
            elif isinstance(annotation, nodes.Attribute):
                return annotation.attrname
            elif isinstance(annotation, nodes.Subscript):
                # Handle generic types like List[str], Dict[str, int]
                if hasattr(annotation, 'value') and isinstance(annotation.value, nodes.Name):
                    base_type = annotation.value.name
                    if base_type.lower() in ["list", "array"]:
                        return "array"
                    elif base_type.lower() in ["dict", "object"]:
                        return "object"
                    else:
                        return base_type.lower()
            elif isinstance(annotation, nodes.Constant):
                return str(annotation.value)
            elif isinstance(annotation, nodes.Tuple):
                # Handle tuple types like (str, int)
                return "object"
            elif isinstance(annotation, nodes.Call):
                # Handle callable types
                return "object"
        except Exception as e:
            print(f"Warning: Could not extract type from annotation: {e}")
        
        return "object"  # Default fallback
    
    def _extract_docstring(self, node) -> str:
        """Extract docstring from a node"""
        try:
            if hasattr(node, 'doc_node') and node.doc_node:
                return node.doc_node.value
            elif hasattr(node, 'doc') and node.doc:
                return node.doc
        except Exception as e:
            print(f"Warning: Could not extract docstring: {e}")
        return ""
    
    def _generate_tool_name(self, endpoint: FastAPIEndpoint) -> str:
        """Generate a tool name from endpoint path and method"""
        try:
            method = endpoint.method.lower()
            path_parts = endpoint.path.split('/')
            
            # Filter out empty parts and convert to camelCase
            name_parts = []
            for part in path_parts:
                if part and part != '':
                    # Remove path parameters (e.g., {id} -> ById)
                    if part.startswith('{') and part.endswith('}'):
                        param_name = part[1:-1]
                        name_parts.append('By' + param_name.capitalize())
                    else:
                        # Convert kebab-case or snake_case to camelCase
                        words = part.replace('-', '_').split('_')
                        camel_case = ''.join(word.capitalize() for word in words)
                        name_parts.append(camel_case)
            
            return method + ''.join(name_parts)
        except Exception as e:
            print(f"Warning: Could not generate tool name for endpoint {getattr(endpoint, 'path', 'unknown')}: {e}")
            return "unknown_tool" 