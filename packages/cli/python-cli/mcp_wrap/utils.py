import os

def detect_format(path):
    ext = os.path.splitext(path)[1]
    if ext == ".json":
        return "claude"
    if ext == ".py":
        with open(path) as f:
            content = f.read()
            if "Tool.from_function" in content:
                return "langchain"
            elif "functions =" in content:
                return "openai"
    return "unknown"