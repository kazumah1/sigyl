# MCP CLI Test Suite

Simplified testing and development tool for the MCP CLI project.

## Quick Start

```bash
npm run test
```

This launches an interactive menu with clear, focused testing options.

## Available Commands

### 🎯 Demo Mode
- **Command**: `npm run demo` or `tsx src/index.ts demo`
- **Purpose**: Quick demo with included Express apps
- **What it does**: Scans demo apps (JS/TS) and generates MCP server
- **Options**: 
  - `--app js|ts` - Choose JavaScript or TypeScript demo
  - `--mode scan|dev|build` - Choose demo mode
- **Examples**:
  ```bash
  npm run demo:js        # Demo with JavaScript app
  npm run demo:ts        # Demo with TypeScript app  
  npm run demo:dev       # Demo in development mode
  ```

### 🔧 Create Template
- **Command**: `npm run init` or `tsx src/index.ts init`
- **Purpose**: Create a template MCP server with sample tools
- **What it does**: Generates a complete MCP server with sample tools (say_hello, search_web, get_weather)
- **Options**:
  - `--out <directory>` - Output directory (default: .mcp-generated)
  - `--server-language <language>` - TypeScript or JavaScript (default: typescript)
  - `--name <name>` - Server name (default: my-mcp-server)
- **Examples**:
  ```bash
  npm run init           # Create TypeScript template
  npm run init:js        # Create JavaScript template
  npm run init --name my-server --out ./my-mcp
  ```

### 🔍 Scan Real App
- **Command**: `npm run scan` or `tsx src/index.ts scan [directory]`
- **Purpose**: Scan your own Express app and generate MCP server
- **What it does**: Analyzes your Express routes and generates MCP server files
- **Output**: `.mcp-generated/` directory with server files

### 🚀 Development Mode
- **Command**: `npm run dev-mode` or `tsx src/index.ts dev [directory]`
- **Purpose**: Start development mode with hot reload and MCP Inspector
- **What it does**: Starts Express app + MCP server with hot reload
- **Background**: Runs in background, press Ctrl+C to return to menu

### 🕵️ Open Inspector
- **Command**: `npm run inspect` or `tsx src/index.ts inspect`
- **Purpose**: Launch MCP Inspector UI to test your generated server
- **What it does**: Opens web UI to test MCP server tools

### 🧹 Clean Generated Files
- **Command**: `npm run clean` or `tsx src/index.ts clean`
- **Purpose**: Remove generated MCP server files
- **What it does**: Deletes `.mcp-generated/` directory

## Individual NPM Scripts

You can also run commands directly:

```bash
# Demo commands
npm run demo            # Quick demo (defaults to JS app)
npm run demo:js         # Demo with JavaScript app
npm run demo:ts         # Demo with TypeScript app
npm run demo:dev        # Demo in development mode

# Template commands
npm run init            # Create TypeScript template
npm run init:js         # Create JavaScript template

# Main commands
npm run scan            # Scan your Express app
npm run dev-mode        # Start development mode
npm run inspect         # Open MCP Inspector
npm run clean           # Clean generated files

# Interactive
npm run test            # Launch test menu
```

## Typical Workflow

1. **Start with demo**: `npm run demo` to see it working
2. **Create template**: `npm run init` to start from scratch with sample tools
3. **Scan your app**: `npm run scan` to generate MCP server from Express app
4. **Test with Inspector**: `npm run inspect` to test your server
5. **Development mode**: `npm run dev-mode` for hot reload development
6. **Clean up**: `npm run clean` when switching contexts

## Background Processes

Some commands (like dev mode) run in the background:
- Press **Ctrl+C** to stop and return to menu
- The test CLI handles cleanup automatically
- Express and MCP servers are properly terminated

## File Structure After Generation

```
ts-cli/
├── .mcp-generated/          # Generated MCP server
│   ├── server.ts           # TypeScript MCP server
│   ├── server.js           # Built JavaScript (after build)
│   ├── sigyl.yaml           # MCP configuration
│   ├── package.json       # Server dependencies
│   └── tools/             # Individual tool handlers
│       ├── getApiUsers.ts
│       ├── postApiUsers.ts
│       └── ...
└── dist/                   # Built CLI (after npm run build)
    └── index.js
```

## Tips

- Use **Demo Mode** to quickly see the tool in action
- **Scan Real App** when you want to process your own Express app
- **Development Mode** is perfect for iterating on your app
- **Inspector** helps you test the generated MCP server
- **Clean** between different apps to ensure fresh state
- Check demo apps are working: `cd ../demo && npm start` or `cd ../demo-ts && npm start` 