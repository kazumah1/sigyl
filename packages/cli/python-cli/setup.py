#!/usr/bin/env python3
"""
Setup script for MCP CLI - FastAPI to MCP Server Generator
"""

from setuptools import setup, find_packages
import os

# Read the README file
def read_readme():
    readme_path = os.path.join(os.path.dirname(__file__), "README.md")
    if os.path.exists(readme_path):
        with open(readme_path, "r", encoding="utf-8") as f:
            return f.read()
    return "MCP CLI - FastAPI to MCP Server Generator"

# Read requirements
def read_requirements():
    requirements_path = os.path.join(os.path.dirname(__file__), "requirements.txt")
    if os.path.exists(requirements_path):
        with open(requirements_path, "r", encoding="utf-8") as f:
            return [line.strip() for line in f if line.strip() and not line.startswith("#")]
    return []

setup(
    name="mcp-scan",
    version="0.1.0",
    description="FastAPI to MCP Server Generator CLI",
    long_description=read_readme(),
    long_description_content_type="text/markdown",
    author="MCP CLI Team",
    author_email="team@example.com",
    url="https://github.com/your-org/mcp-cli",
    packages=find_packages(),
    include_package_data=True,
    install_requires=read_requirements(),
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-asyncio>=0.21.0",
            "black>=22.0.0",
            "isort>=5.0.0",
            "flake8>=4.0.0",
        ]
    },
    entry_points={
        "console_scripts": [
            "mcp-wrap=mcp_wrap.main:main",
        ],
    },
    python_requires=">=3.8",
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
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Software Development :: Code Generators",
    ],
    keywords="mcp fastapi cli code-generation",
    project_urls={
        "Bug Reports": "https://github.com/your-org/mcp-cli/issues",
        "Source": "https://github.com/your-org/mcp-cli",
        "Documentation": "https://github.com/your-org/mcp-cli#readme",
    },
) 