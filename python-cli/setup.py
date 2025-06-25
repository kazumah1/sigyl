#!/usr/bin/env python3
"""
Setup script for mcp-wrap CLI tool
"""
from setuptools import setup, find_packages
import os

# Read README
def read_readme():
    readme_path = os.path.join(os.path.dirname(__file__), "mcp_wrap", "README.md")
    if os.path.exists(readme_path):
        with open(readme_path, "r", encoding="utf-8") as f:
            return f.read()
    return "Convert tool definitions to MCP format and generate servers"

setup(
    name="mcp-scan",
    version="0.2.0",
    author="MCP CLI Team",
    author_email="mcp-cli@example.com",
    description="FastAPI to MCP Server Generator",
    long_description=read_readme(),
    long_description_content_type="text/markdown",
    url="https://github.com/your-username/mcp-scan",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    python_requires=">=3.8",
    install_requires=[
        "rich>=13.0.0",
        "pyyaml>=6.0",
        "astroid>=2.14.0",
        "httpx>=0.24.0",
        "mcp>=1.0.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "black>=22.0.0",
            "flake8>=5.0.0",
            "mypy>=1.0.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "mcp-scan=mcp_wrap.cli:main",
        ],
    },
    include_package_data=True,
    zip_safe=False,
) 