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
    name="mcp-wrap",
    version="0.1.0",
    description="Convert tool definitions from OpenAI, LangChain, and Claude formats to MCP-compatible YAML and generate MCP servers",
    long_description=read_readme(),
    long_description_content_type="text/markdown",
    author="Your Name",
    author_email="your.email@example.com",
    url="https://github.com/yourusername/mcp-wrap",
    packages=find_packages(),
    include_package_data=True,
    package_data={
        "mcp_wrap": ["demo/*", "README.md"],
    },
    install_requires=[
        "pyyaml>=6.0",
        "langchain>=0.3.0", 
        "pydantic>=2.0.0",
        "fastmcp>=0.1.0",
    ],
    entry_points={
        "console_scripts": [
            "mcp-wrap=mcp_wrap.mcp_wrap:main",
        ],
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9", 
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Software Development :: Code Generators",
    ],
    python_requires=">=3.8",
    keywords="mcp, model-context-protocol, tools, openai, langchain, claude, server-generation",
) 