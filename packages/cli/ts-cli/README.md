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

## 🤝 Support

- GitHub Issues: [Report bugs or request features](https://github.com/sigyl-platform/sigyl-cli/issues)
- Email: support@sigyl.com

## 📄 License

MIT License - see LICENSE file for details. 