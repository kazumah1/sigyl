import importlib.util
from langchain.tools import Tool

def load_tools(path):
    spec = importlib.util.spec_from_file_location("mod", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

    tools = []
    for name in dir(mod):
        obj = getattr(mod, name)
        if isinstance(obj, Tool):
            tools.append({
                "name": obj.name,
                "description": obj.description,
                "parameters": obj.args_schema.schema()
            })
    return tools