* ✅ **Day 1: Python MVP** — usable CLI tool that supports OpenAI, LangChain, and Claude-style formats
* 🟡 **Day 2: TypeScript version** — replicates the same functionality using TypeScript + `ts-morph` or native parsing

---

# ✅ Day 1 – Python MVP Implementation Guide

## 🎯 Goal

Create a Python CLI tool (`mcp-wrap`) that:

* Accepts tool definitions in **OpenAI SDK**, **LangChain**, or **Claude** format
* Converts them to **MCP-compatible YAML**
* Detects format automatically
* (Optionally) generates stub handler files

---

## 📁 Folder Structure

```
mcp_wrap/
├── mcp_wrap.py            # CLI entrypoint
├── formats/
│   ├── openai.py          # OpenAI function spec support
│   ├── langchain.py       # LangChain Tool support
│   └── claude.py          # Claude-style input_schema support
├── schema_writer.py       # YAML output logic
├── utils.py               # Format detection
└── demo/
    ├── openai_tools.py
    ├── langchain_tools.py
    └── claude_tools.json
```

---

## 🕐 Hour-by-Hour Breakdown

### 🕐 Hour 1 – Project Bootstrap

```bash
mkdir mcp_wrap && cd mcp_wrap
python3 -m venv .venv && source .venv/bin/activate
pip install pyyaml langchain pydantic
```

Create initial files: `touch mcp_wrap.py formats/openai.py formats/langchain.py formats/claude.py schema_writer.py utils.py`

---

### 🕑 Hour 2 – CLI Entrypoint (`mcp_wrap.py`)

```python
import argparse
from formats import openai, langchain, claude
from schema_writer import write_yaml
from utils import detect_format

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("path", help="Path to tools file (.py or .json)")
    parser.add_argument("--out", default="tools.yaml")
    args = parser.parse_args()

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

if __name__ == "__main__":
    main()
```

---

### 🕒 Hour 3 – OpenAI Format (`formats/openai.py`)

```python
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
```

---

### 🕓 Hour 4 – LangChain Format (`formats/langchain.py`)

```python
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
```

---

### 🕔 Hour 5 – Claude Format (`formats/claude.py`)

```python
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
```

---

### 🕕 Hour 6 – Format Detection (`utils.py`)

```python
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
```

---

### 🕖 Hour 7 – YAML Output Writer (`schema_writer.py`)

```python
import yaml

def write_yaml(tools, path):
    with open(path, "w") as f:
        yaml.dump(tools, f, sort_keys=False)
```

---

### 🕗 Hour 8 – Testing + Demo Files

#### `demo/openai_tools.py`

```python
functions = [
    {
        "name": "search",
        "description": "Search the web",
        "parameters": {
            "type": "object",
            "properties": {
                "query": { "type": "string" }
            },
            "required": ["query"]
        }
    }
]
```

#### `demo/langchain_tools.py`

```python
from langchain.tools import Tool
from pydantic import BaseModel

class SearchInput(BaseModel):
    query: str

def search_func(query: str) -> str:
    return f"Searching for {query}"

search_tool = Tool.from_function(
    func=search_func,
    name="search",
    description="Search the web",
    args_schema=SearchInput
)
```

#### `demo/claude_tools.json`

```json
[
  {
    "name": "summarize",
    "description": "Summarize content",
    "input_schema": {
      "type": "object",
      "properties": {
        "url": { "type": "string" }
      },
      "required": ["url"]
    }
  }
]
```

---

# 🟡 Day 2 – TypeScript Version Implementation Guide

## 🎯 Goal

Replicate the Python CLI in **TypeScript**, using:

* `ts-node` or `esbuild` for CLI execution
* `ts-morph` to parse and analyze `.ts` files
* Outputs MCP-compatible **YAML or JSON**

---

## 📁 Folder Structure

```
mcp-wrap-ts/
├── cli.ts
├── formats/
│   ├── openai.ts
│   ├── langchain.ts
│   └── claude.ts
├── schemaWriter.ts
├── utils.ts
└── demo/
    ├── openaiTools.ts
    ├── langchainTools.ts
    └── claudeTools.json
```

---

## 🛠️ Tooling Setup

```bash
npm init -y
npm install ts-morph yaml
```

Run via:

```bash
npx ts-node cli.ts path/to/file.ts
```

---

## Key Logic

### ✅ Format Detection (`utils.ts`)

```ts
import fs from "fs";

export function detectFormat(path: string): "openai" | "langchain" | "claude" | "unknown" {
  if (path.endsWith(".json")) return "claude";
  const content = fs.readFileSync(path, "utf-8");
  if (content.includes("Tool.fromFunction")) return "langchain";
  if (content.includes("const functions =")) return "openai";
  return "unknown";
}
```

### ✅ Schema Output (`schemaWriter.ts`)

```ts
import fs from "fs";
import yaml from "yaml";

export function writeYaml(tools: any[], outPath: string) {
  fs.writeFileSync(outPath, yaml.stringify(tools));
}
```

### ✅ OpenAI Tools Parser (`formats/openai.ts`)

```ts
import { Project } from "ts-morph";

export function loadOpenAITools(filePath: string) {
  const project = new Project();
  const source = project.addSourceFileAtPath(filePath);
  const tools = source.getVariableDeclaration("functions")?.getInitializerIfKindOrThrow(ts.SyntaxKind.ArrayLiteralExpression);
  return tools?.getElements().map(el => JSON.parse(el.getText()));
}
```

---

## ⏳ Stretch Goals (Day 3+)

* Autogenerate `tool_handlers/*.ts` or `.py`
* Validate schemas against JSON Schema Draft 7
* Add CLI args for format override
* Build a web UI for uploading + converting tool files

---

## ✅ Summary

| Day       | Output                                                    |
| --------- | --------------------------------------------------------- |
| **Day 1** | Python CLI that handles OpenAI, LangChain, Claude         |
| **Day 2** | TypeScript CLI that mirrors Python logic using `ts-morph` |

Let me know if you'd like the starter code zipped or pushed to a GitHub repo.
