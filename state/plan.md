# MCP CLI Project Plan

## Project Overview

**Goal**: Build a CLI tool that scans Express/Node.js applications and automatically generates Model Context Protocol (MCP) servers from their endpoints.

**Core Value Proposition**: Convert existing Express APIs into MCP tools with zero manual configuration, enabling AI assistants to directly interact with web services.

## Architecture

### Monorepo Structure
```
├── ts-cli/                 # Main TypeScript CLI implementation
│   ├── src/
│   │   ├── index.ts        # CLI entry point with commander
│   │   ├── commands/       # Command implementations
│   │   └── lib/           # Core libraries
│   └── package.json       # CLI dependencies and scripts
├── demo/                  # Demo Express app for testing
├── state/                 # Project documentation and plans
└── package.json          # Workspace coordinator
```

### Key Components

1. **Express Scanner** (`lib/express-scanner.ts`)
   - Uses ts-morph for AST parsing of Express applications
   - Detects route definitions and extracts metadata
   - Supports multiple Express patterns (app.get, router.use, etc.)

2. **MCP Generator** (`lib/mcp-generator.ts`)
   - Converts Express endpoints to MCP tool definitions
   - Generates TypeScript MCP servers with SDK integration
   - Creates individual tool handlers for each endpoint

3. **CLI Commands**
   - `scan`: One-time generation of MCP server from Express app
   - `dev`: Development mode with hot reload and MCP Inspector
   - `build`: Production build of generated MCP server

## Development Approach

**Strategy**: Borrow proven patterns from Smithery's open-source CLI rather than building from scratch.

**Key Borrowed Components**:
- CLI architecture using commander.js
- Development server with subprocess management  
- Build system integration with esbuild
- Hot reload functionality
- Configuration management patterns

**Estimated Time Savings**: 10-15 days by reusing battle-tested infrastructure.

## Implementation Status

### ✅ Completed

**Core CLI Framework** (Day 1-2)
- [x] TypeScript CLI setup with commander.js
- [x] Package.json workspace configuration
- [x] Build system with esbuild integration
- [x] Basic command structure (scan, dev, build)

**Express Scanning Engine** (Day 3-4)
- [x] AST parsing with ts-morph
- [x] Route detection for common Express patterns
- [x] Parameter extraction (path, query, body)
- [x] Endpoint metadata collection

**MCP Server Generation** (Day 5-6)
- [x] MCP configuration (mcp.yaml) generation
- [x] TypeScript server generation with MCP SDK
- [x] Individual tool handler generation
- [x] HTTP client integration for endpoint calls

**Testing & Validation** (Day 7)
- [x] Demo Express app with 5 endpoints
- [x] End-to-end scanning and generation workflow
- [x] TypeScript compilation verification
- [x] Command argument parsing fixes

**Bug Fixes** (Day 8)
- [x] Fixed npm script command routing issue
- [x] Fixed HTTP method template string bug in tool handlers
- [x] Fixed subprocess working directory for Express app startup
- [x] Verified generated code compiles and runs correctly
- [x] Verified development workflow starts Express app correctly

**Developer Experience** (Day 8)
- [x] Built comprehensive interactive test CLI (`npm run test-cli`)
- [x] Added individual test scripts for all major workflows
- [x] Created project status checker and file structure validation
- [x] Implemented background process management for dev mode testing
- [x] Added automatic cleanup and error recovery
- [x] Created test CLI documentation (TEST-CLI.md)

### 🔄 In Progress

**Development Workflow** (Day 8-9)
- [x] Express app subprocess management
- [x] Development mode with hot reload framework
- [x] Interactive testing infrastructure
- [ ] MCP Inspector integration testing
- [ ] End-to-end development workflow validation
- [ ] File watching for hot reload implementation

### 📋 Next Steps

**Phase 1: Core Functionality** (Days 9-12)
- [ ] Test actual MCP tool execution with Claude/clients
- [ ] Improve error handling and edge case coverage
- [ ] Add support for middleware detection
- [ ] Enhance parameter type inference

**Phase 2: Advanced Features** (Days 13-16)
- [ ] Add Python server generation option
- [ ] Support for authentication/authorization patterns
- [ ] Configuration file support (.mcprc)
- [ ] Plugin system for custom transformations

**Phase 3: Production Readiness** (Days 17-20)
- [ ] Comprehensive test suite
- [ ] Documentation and examples
- [ ] CI/CD pipeline setup
- [ ] NPM package publication

## Technical Decisions

### Language Choice
- **TypeScript**: Primary implementation language
- **Rationale**: Best tooling for Express AST parsing, strong typing for MCP SDK integration

### AST Parsing
- **Tool**: ts-morph (TypeScript compiler wrapper)
- **Rationale**: More maintainable than regex parsing, handles complex Express patterns

### MCP Integration
- **Approach**: Generate servers using official MCP SDK
- **Rationale**: Ensures compatibility and leverages official tools

### Development Experience
- **Pattern**: Borrow from successful CLI tools (Smithery)
- **Focus**: Developer ergonomics and fast iteration cycles

## Success Metrics

1. **Functionality**: Successfully convert 90%+ of common Express patterns
2. **Performance**: Sub-5 second generation for typical Express apps  
3. **Developer Experience**: Single command to go from Express app to working MCP server
4. **Reliability**: Generated servers work correctly with MCP Inspector and Claude

## Risk Mitigation

1. **Complex Express Patterns**: Focus on 80/20 rule - handle most common patterns first
2. **MCP Compatibility**: Use official SDK and test with multiple MCP clients
3. **Maintenance Burden**: Automated testing for generated code quality
4. **Performance**: Implement caching and incremental builds for large applications

---

*Last Updated: 2025-06-24 - Fixed npm script routing and HTTP method template bugs*