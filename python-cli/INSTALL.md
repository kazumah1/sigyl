# Installation Guide

## Quick Install

### From PyPI (Recommended)
```bash
pip install mcp-wrap
```

### From Source
```bash
# Clone the repository
git clone https://github.com/yourusername/mcp-wrap.git
cd mcp-wrap

# Install in development mode
pip install -e .
```

## Usage After Installation

Once installed, you can use `mcp-wrap` from anywhere:

```bash
# Basic conversion
mcp-wrap my_tools.py --out tools.yaml

# Convert and generate server
mcp-wrap my_tools.py --generate-server --server-language python

# Full example
mcp-wrap demo/openai_tools.py --out tools.yaml --generate-server --server-language typescript
```

## Development Installation

For development and testing:

```bash
# Clone and setup
git clone https://github.com/yourusername/mcp-wrap.git
cd mcp-wrap

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install in editable mode
pip install -e .

# Test installation
mcp-wrap --help
```

## Building for Distribution

```bash
# Build package
python -m build

# Upload to PyPI (requires PyPI account)
python -m twine upload dist/*
```

## Package Structure

```
mcp-wrap/
├── pyproject.toml      # Modern Python packaging
├── setup.py           # Alternative setup script
├── mcp_wrap/          # Main package
│   ├── __init__.py
│   ├── mcp_wrap.py    # CLI entry point
│   ├── formats/       # Format converters
│   ├── server_generator.py
│   ├── schema_writer.py
│   ├── utils.py
│   └── demo/          # Example files
└── README.md
```

## Benefits of Installable CLI

✅ **Global availability**: Use `mcp-wrap` from any directory
✅ **Easy installation**: One command to install
✅ **Dependency management**: Automatic dependency installation
✅ **Version control**: Easy updates with `pip install --upgrade`
✅ **Professional distribution**: Can be published to PyPI
✅ **IDE integration**: Better autocomplete and tooling support 