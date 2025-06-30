# Sigyl CLI

Easily add Model Context Protocol (MCP) endpoints to your Express/Node.js applications. Zero-config MCP generation AI tool integration for REST APIs.

## 🚀 Quick Start

```bash
# Install globally
npm install -g @sigyl-dev/cli

# Or use with npx (no installation required)
npx @sigyl-dev/cli --help
```

## 📖 Usage (Recommended Flow)

### Scan Your Express App and Generate MCP Server

```bash
# 1. Scan your Express app and generate MCP server
sigyl scan ./my-express-app --out ./mcp-server

# 2. Navigate to the generated MCP server
cd ./mcp-server

# 3. Install dependencies
npm install

# 4. Start the MCP server
npm start

# 5. Test with the Inspector (optional)
sigyl inspect http://localhost:8080
```

**Scan Command Options:**
- `--out <directory>` - Output directory for generated MCP server (default: `./mcp-generated`)
- `--port <port>` - Port for the MCP server (default: `8080`)
- `--server-language <language>` - Language for server generation: `typescript` or `javascript` (default: `typescript`)
- `--framework <framework>` - Framework to scan for: `express` (default: `express`)

### Alternative Commands

#### Initialize a New MCP Server from Scratch
```bash
sigyl init ./my-mcp-server --server-language typescript --name "My MCP Server"
```

#### Build an Existing MCP Project
```bash
sigyl build ./mcp-project --out ./dist
```

#### Development Mode with Hot Reload
```bash
sigyl dev ./mcp-project --port 8080
```

## 🛠️ Requirements

- Node.js 18 or higher
- Express.js application (for scanning)
- TypeScript (optional, for TypeScript projects)

## ⚙️ Changing the Express API Address/Port

By default, the generated MCP server will call your Express API at `http://localhost:3000`.

**To change this:**
- Set the `APP_BASE_URL` environment variable when running the generated MCP server. For example:

```bash
APP_BASE_URL=http://myhost:4000 node server.js
```
- Or, edit the generated code in `server.ts`/`server.js` to change the base URL directly.

## 🤝 Support

- Email: support@sigyl.com

