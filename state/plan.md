# MCP CLI Enhancement Plan

## Project Overview
Enhance the existing MCP CLI tool to make testing different demo scenarios easier and provide complete end-to-end workflow from Express/FastAPI app scanning to Claude Desktop integration.

## Architecture

### Monorepo Structure
```
├── ts-cli/                 # TypeScript CLI implementation (Express.js)
│   ├── src/
│   │   ├── index.ts        # CLI entry point with commander
│   │   ├── commands/       # Command implementations
│   │   └── lib/           # Core libraries
│   └── package.json       # CLI dependencies and scripts
├── python-cli/            # Python CLI implementation (FastAPI)
│   ├── mcp_wrap/          # Core CLI modules
│   │   ├── cli.py         # Main CLI entry point
│   │   ├── fastapi_scanner.py  # FastAPI AST parsing
│   │   ├── mcp_generator.py    # MCP server generation
│   │   └── inspector.py        # MCP Inspector integration
│   ├── demo_fastapi/      # Demo FastAPI app for testing
│   └── setup.py           # Python package configuration
├── demo/                  # Demo Express app for testing
├── state/                 # Project documentation and plans
└── package.json          # Workspace coordinator
```

### Key Components

#### TypeScript CLI (Express.js)
1. **Express Scanner** (`lib/express-scanner.ts`)
   - Uses ts-morph for AST parsing of Express applications
   - Detects route definitions and extracts metadata
   - Supports multiple Express patterns (app.get, router.use, etc.)
   - **Enhanced**: Extracts TypeScript types and interfaces
   - **Enhanced**: Analyzes request handler functions for parameter usage
   - **Enhanced**: Maps Express patterns (req.body, req.params, req.query) to proper types

2. **MCP Generator** (`lib/mcp-generator.ts`)
   - Converts Express endpoints to MCP tool definitions
   - Generates TypeScript MCP servers with SDK integration
   - Creates individual tool handlers for each endpoint
   - **Enhanced**: Maps TypeScript types to JSON Schema types
   - **Enhanced**: Generates proper TypeScript interfaces for tool arguments
   - **Enhanced**: Handles request body properties and validation

#### Python CLI (FastAPI)
1. **FastAPI Scanner** (`mcp_wrap/fastapi_scanner.py`)
   - Uses astroid for AST parsing of FastAPI applications
   - Detects route decorators and extracts endpoint metadata
   - Supports FastAPI patterns (@app.get, @app.post, etc.)
   - Extracts Pydantic models and type annotations
   - Analyzes function parameters and return types

2. **MCP Generator** (`mcp_wrap/mcp_generator.py`)
   - Converts FastAPI endpoints to MCP tool definitions
   - Generates Python MCP servers with MCP SDK integration
   - Creates inline tool definitions using server.tool() decorators
   - Maps Python types to JSON Schema types
   - Handles path parameters, query parameters, and request bodies

3. **CLI Commands** (Both implementations)
   - `scan`: One-time generation of MCP server from Express/FastAPI app
   - `init`: Create blank MCP server template
   - `dev`: Development mode with hot reload and MCP Inspector
   - `inspect`: Launch MCP Inspector for testing
   - `clean`: Remove generated files

## Development Approach

**Strategy**: Borrow proven patterns from Smithery's open-source CLI rather than building from scratch.

**Key Borrowed Components**:
- CLI architecture using commander.js (TypeScript) / argparse (Python)
- Development server with subprocess management  
- Build system integration with esbuild (TypeScript) / setuptools (Python)
- Hot reload functionality
- Configuration management patterns

**Estimated Time Savings**: 10-15 days by reusing battle-tested infrastructure.

## Implementation Status

### ✅ Completed

**TypeScript CLI (Express.js)** - **FULLY COMPLETE**
- [x] TypeScript CLI setup with commander.js
- [x] Package.json workspace configuration
- [x] Build system with esbuild integration
- [x] Basic command structure (scan, init, dev, inspect, clean)
- [x] Express scanning engine with ts-morph
- [x] Route detection for common Express patterns
- [x] Parameter extraction (path, query, body)
- [x] Endpoint metadata collection
- [x] MCP configuration (mcp.yaml) generation
- [x] TypeScript server generation with MCP SDK
- [x] Individual tool handler generation
- [x] HTTP client integration for endpoint calls
- [x] Demo Express app with 5 endpoints
- [x] End-to-end scanning and generation workflow
- [x] TypeScript compilation verification
- [x] Command argument parsing fixes
- [x] Built comprehensive interactive test CLI
- [x] Added individual test scripts for all major workflows
- [x] Created project status checker and file structure validation
- [x] Implemented background process management for dev mode testing
- [x] Added automatic cleanup and error recovery
- [x] Created test CLI documentation (TEST-CLI.md)
- [x] Integrated official MCP Inspector for testing
- [x] Added `inspect` command to launch Inspector UI
- [x] Updated test CLI with Inspector option
- [x] Verified Inspector connects to generated MCP server
- [x] Enhanced type extraction with TypeScript interface analysis
- [x] Improved parameter analysis to detect req.body, req.params, req.query usage
- [x] Updated MCP generator to map TypeScript types to JSON Schema
- [x] Added TypeScript interface generation for tool arguments
- [x] Improved type mapping between TypeScript and JSON Schema types
- [x] Fixed type analysis execution order to preserve detailed type information
- [x] Implemented proper import path resolution for complex TypeScript imports
- [x] Enhanced JSON Schema generation with detailed properties and validation
- [x] Added automatic type inference for common patterns
- [x] **Refactored to modern McpServer pattern** with inline tool definitions
- [x] **Eliminated separate tool handler files** and switch statements
- [x] **Enhanced blank template** with modern MCP server style
- [x] **Added example tools** (hello_world, get_user_info) to blank template

**Python CLI (FastAPI)** - **FULLY COMPLETE**
- [x] Python CLI setup with argparse and rich
- [x] Package configuration with setuptools
- [x] FastAPI scanning engine with astroid
- [x] Route decorator detection and parsing
- [x] Parameter extraction (path, query, body)
- [x] Pydantic model analysis
- [x] Type annotation extraction
- [x] MCP configuration (mcp.yaml) generation
- [x] Python server generation with MCP SDK
- [x] Inline tool definitions using server.tool() decorators
- [x] HTTP client integration with httpx
- [x] Demo FastAPI app with 8 endpoints
- [x] End-to-end scanning and generation workflow
- [x] Command structure (scan, init, dev, inspect, clean)
- [x] Rich console output with progress indicators
- [x] Error handling and validation
- [x] MCP Inspector integration
- [x] Development mode with subprocess management
- [x] Blank template generation with example tools
- [x] Requirements.txt and README generation
- [x] Test script for CLI functionality verification

### 🔄 In Progress

**Development Workflow** (Both CLIs)
- [x] Express/FastAPI app subprocess management
- [x] Development mode with hot reload framework
- [x] Interactive testing infrastructure
- [x] MCP Inspector integration testing
- [x] End-to-end development workflow validation
- [ ] File watching for hot reload implementation

### 📋 Next Steps

**Phase 1: Advanced Features** (Days 13-16)
- [ ] **Query Parameter Detection**: Detect and type query parameters from req.query usage (TypeScript CLI)
- [ ] **Response Type Inference**: Infer response types from res.json() calls (TypeScript CLI)
- [ ] **Pydantic Model Parsing**: Extract detailed schema from Pydantic models (Python CLI)
- [ ] **Authentication Support**: Add support for authentication/authorization patterns
- [ ] **Configuration Files**: Add .mcprc configuration file support
- [ ] **Plugin System**: Create plugin system for custom transformations
- [ ] **File Watching**: Implement hot reload with chokidar/watcher
- [ ] **Incremental Rebuilds**: Only regenerate changed endpoints

**Phase 2: Production Readiness** (Days 17-20)
- [ ] **Comprehensive Testing**: Add unit tests and integration tests for both CLIs
- [ ] **Documentation**: Create comprehensive documentation and examples
- [ ] **CI/CD Pipeline**: Set up automated testing and deployment
- [ ] **NPM/PyPI Publication**: Publish both CLIs to package registries
- [ ] **Performance Optimization**: Optimize scanning and generation performance
- [ ] **Error Recovery**: Improve error handling and recovery mechanisms

**Phase 3: Advanced Integration** (Days 21-25)
- [ ] **Claude Desktop Integration**: Test with actual Claude Desktop clients
- [ ] **Multi-language Support**: Add support for other frameworks (Django, Flask, etc.)
- [ ] **Template System**: Create customizable template system
- [ ] **Validation**: Add comprehensive validation for generated servers
- [ ] **Monitoring**: Add monitoring and logging capabilities

## Technical Decisions

### Language Choice
- **TypeScript**: Primary implementation for Express.js scanning
- **Python**: Primary implementation for FastAPI scanning
- **Rationale**: Best tooling for respective frameworks, strong typing for MCP SDK integration

### AST Parsing
- **TypeScript**: ts-morph (TypeScript compiler wrapper)
- **Python**: astroid (Python AST parsing library)
- **Rationale**: More maintainable than regex parsing, handles complex patterns

### MCP Integration
- **Approach**: Generate servers using official MCP SDK
- **Rationale**: Ensures compatibility and leverages official tools

### Development Experience
- **Pattern**: Borrow from successful CLI tools (Smithery)
- **Focus**: Developer ergonomics and fast iteration cycles

### Type Extraction Strategy
- **TypeScript**: Two-pass scanning (types first, then routes)
- **Python**: Single-pass with type annotation analysis
- **Rationale**: Enables proper type resolution and mapping

## Success Metrics

1. **Functionality**: Successfully convert 90%+ of common Express/FastAPI patterns
2. **Performance**: Sub-5 second generation for typical applications  
3. **Developer Experience**: Single command to go from app to working MCP server
4. **Reliability**: Generated servers work correctly with MCP Inspector and Claude
5. **Type Safety**: Proper type extraction and JSON Schema mapping
6. **Cross-platform**: Both TypeScript and Python CLIs work seamlessly

## Risk Mitigation

1. **Complex Framework Patterns**: Focus on 80/20 rule - handle most common patterns first
2. **MCP Compatibility**: Use official SDK and test with multiple MCP clients
3. **Maintenance Burden**: Automated testing for generated code quality
4. **Performance**: Implement caching and incremental builds for large applications
5. **Type Complexity**: Start with basic types, gradually add advanced type analysis
6. **Framework Differences**: Maintain separate implementations for optimal tooling

---

*Last Updated: 2025-01-27 - Completed both TypeScript and Python CLI implementations*