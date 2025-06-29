# Sigyl CLI

Easily add Model Context Protocol (MCP) endpoints to your Express/Node.js applications. Zero-config AI tool integration for REST APIs.

## 🚀 Quick Start

```bash
# Install globally
npm install -g @sigyl/cli

# Or use with npx (no installation required)
npx sigyl --help
```

## 📖 Usage (Recommended Flow)

### Integrate MCP into Your Express App

```bash
# 1. Generate MCP integration code
sigyl integrate --out .sigyl-mcp

# 2. Add this line to your Express app:
#    import { addMCPEndpoints } from './.sigyl-mcp/integration'
#    addMCPEndpoints(app)

# 3. Start your app as usual
npm start

# 4. Test with the Inspector
sigyl inspect http://localhost:3000/mcp
```

**Options:**
- `--out <directory>` - Output directory for integration code (default: `.sigyl-mcp`)
- `--endpoint <path>` - MCP endpoint path (default: `/mcp`)
- `--auto-add` - (Coming soon) Automatically add integration to your app

### For Existing Users (Legacy Two-Server Flow)

You can still use the old scan/init/build commands if you need a separate MCP server:

```bash
sigyl scan ./my-express-app
cd .mcp-generated
npm install
sigyl build
```

But we recommend the new `integrate` flow for most users.

## 🛠️ Requirements

- Node.js 18 or higher
- Express.js application
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

- GitHub Issues: [Report bugs or request features](https://github.com/sigyl-platform/sigyl-cli/issues)
- Email: support@sigyl.com

## 📄 License

MIT License - see LICENSE file for details. 