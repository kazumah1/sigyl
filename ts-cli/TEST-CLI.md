# MCP CLI Test Suite

Interactive testing and development tool for the MCP CLI project.

## Quick Start

```bash
npm run test-cli
```

This launches an interactive menu with all available testing options.

## Available Tests

### 🔍 Quick Scan Test
- **Command**: `tsx src/index.ts scan ../demo`
- **Purpose**: Test the core scanning functionality
- **What it does**: Scans the demo Express app and generates MCP server files
- **Output**: `.mcp-generated/` directory with server files

### 🚀 Development Mode
- **Command**: `tsx src/index.ts dev ../demo`  
- **Purpose**: Test the full development workflow
- **What it does**: Starts Express app + MCP server with hot reload
- **Background**: Runs in background, press Ctrl+C to return to menu

### 🏗️ Build Test
- **Command**: `tsx src/index.ts build ../demo`
- **Purpose**: Test production build generation
- **What it does**: Generates optimized MCP server for production

### ✅ Full Pipeline Test
- **Command**: `npm run test:full`
- **Purpose**: Test the complete end-to-end workflow
- **What it does**: Clean → Scan → Install deps → Build generated server
- **Cleanup**: Automatically cleans previous generated files

### 🧪 Generated Server Test
- **Command**: `npm run test:generated`
- **Purpose**: Test the generated MCP server builds correctly
- **What it does**: Installs dependencies and builds the generated TypeScript
- **Prerequisite**: Must run scan test first

### 🧹 Clean Generated Files
- **Command**: `npm run test:clean`
- **Purpose**: Clean up test artifacts
- **What it does**: Removes `.mcp-generated/` directory

### 📊 Project Status
- **Command**: Built-in status checker
- **Purpose**: Show current state of all components
- **What it shows**:
  - Demo app status
  - Generated files status
  - Build status
  - File-by-file breakdown

### 🔧 Interactive Setup Wizard
- **Command**: Placeholder for future wizard
- **Purpose**: Guide users through MCP CLI setup
- **Status**: Coming soon

## Individual NPM Scripts

You can also run tests individually:

```bash
# Quick tests
npm run test:scan      # Scan only
npm run test:dev       # Dev mode only  
npm run test:build     # Build only

# Pipeline tests
npm run test:full      # Full pipeline
npm run test:generated # Test generated server
npm run test:clean     # Clean up

# Interactive
npm run test-cli       # Launch test menu
```

## Typical Development Workflow

1. **Start with status check**: See what's already generated
2. **Run full pipeline test**: Verify end-to-end functionality
3. **Use dev mode**: Test hot reload and development experience
4. **Clean up**: Remove generated files when switching contexts

## Background Processes

Some tests (like dev mode) run in the background:
- Press **Ctrl+C** to stop and return to menu
- The test CLI handles cleanup automatically
- Express and MCP servers are properly terminated

## Error Handling

- Failed tests show detailed error messages
- Option to continue with other tests after failures
- Automatic cleanup of partial state
- Graceful handling of Ctrl+C interrupts

## File Structure After Tests

```
ts-cli/
├── .mcp-generated/          # Generated MCP server
│   ├── server.ts           # TypeScript MCP server
│   ├── server.js           # Built JavaScript (after test:generated)
│   ├── mcp.yaml           # MCP configuration
│   ├── package.json       # Server dependencies
│   └── tools/             # Individual tool handlers
│       ├── getApiUsers.ts
│       ├── postApiUsers.ts
│       └── ...
└── dist/                   # Built CLI (after npm run build)
    └── index.js
```

## Tips

- Use **Project Status** to understand current state
- **Full Pipeline Test** is great for CI/regression testing  
- **Dev Mode** is perfect for iterating on the development experience
- **Clean** between tests to ensure fresh state
- Check the demo app is working: `cd ../demo && npm start` 