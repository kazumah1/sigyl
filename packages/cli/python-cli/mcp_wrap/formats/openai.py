import importlib.util

def load_tools(path):
    spec = importlib.util.spec_from_file_location("mod", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    tool_list = getattr(mod, "functions", [])

    return [
        {
            "name": t["name"],
            "description": t.get("description", ""),
            "parameters": t["parameters"]
        }
        for t in tool_list
    ]