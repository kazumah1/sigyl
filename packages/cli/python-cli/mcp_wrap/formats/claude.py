import json

def load_tools(path):
    with open(path) as f:
        data = json.load(f)

    return [
        {
            "name": t["name"],
            "description": t.get("description", ""),
            "parameters": t["input_schema"]
        }
        for t in data
    ]