# Sigyl CLI

The official CLI tool for installing and managing MCP (Model Context Protocol) packages from the Sigyl registry.

## 🚀 Quick Start

### Install any public MCP package immediately:

```bash
npx @sigyl-dev/cli install package-name
```

That's it! No configuration required for public packages.

## 📦 Installation

```bash
# Install globally (optional)
npm install -g @sigyl-dev/cli

# Or use directly with npx
npx @sigyl-dev/cli install package-name
```

## 🔧 Configuration (Optional)

Configuration is only needed for private packages or custom registry URLs.

### Set up your API key:

```bash
sigyl config
```

This will prompt you for:
- **Registry URL**: `https://api.sigyl.dev` (default)
- **API Key**: Get yours from [sigyl.dev/dashboard](https://sigyl.dev/dashboard)

### View current configuration:

```bash
sigyl config show
```

### Reset to defaults:

```bash
sigyl config reset
```

## 🎯 Usage

### Install MCP packages:

```bash
# Public packages (no config needed)
sigyl install weather-tools
sigyl install file-manager

# Private packages (requires API key)
sigyl install my-private-package

# Specify client (default: claude)
sigyl install package-name --client claude
sigyl install package-name --client vscode
sigyl install package-name --client cursor
```

### List installed packages:

```bash
sigyl install --list
```

### Remove packages:

```bash
sigyl install --remove package-name
```

## 🔑 API Key Setup

1. Go to [sigyl.dev/dashboard](https://sigyl.dev/dashboard)
2. Generate an API key
3. Run `sigyl config` and enter your key
4. Install private packages with `sigyl install`

## 🎛️ Advanced Configuration

### Environment Variables (for development):

```bash
export SIGYL_REGISTRY_URL="http://localhost:3000"
export SIGYL_API_KEY="sk_your_key_here"
```

### Configuration File Location:

- **macOS/Linux**: `~/.sigyl/config.json`
- **Windows**: `%USERPROFILE%\.sigyl\config.json`

### Configuration File Format:

```json
{
  "registryUrl": "https://api.sigyl.dev",
  "apiKey": "sk_your_api_key_here"
}
```

## 🔒 Security

- **No database credentials**: CLI uses secure API-based authentication
- **API keys**: Scoped permissions (read/write/admin)
- **Rate limiting**: Built into the API layer
- **Audit trail**: All CLI usage tracked via API

## 🌐 Supported Clients

- **Claude Desktop** (default)
- **VS Code** with MCP extension
- **Cursor** with MCP extension

## 📚 Examples

```bash
# Zero-config installation
npx @sigyl-dev/cli install weather-api

# With custom client
sigyl install file-tools --client vscode

# With API key for private packages
sigyl config  # Set up API key once
sigyl install my-company/internal-tools

# List what's installed
sigyl install --list

# Remove a package
sigyl install --remove weather-api
```

## 🆘 Troubleshooting

### Package not found:
```
❌ Package 'package-name' not found in the registry.
💡 Check available packages at https://sigyl.dev/marketplace
```

### Authentication failed:
```
❌ Authentication failed. Invalid API key.
💡 Get your API key from https://sigyl.dev/dashboard
💡 Or run 'sigyl config' to set it up
```

### Connection issues:
```
❌ Failed to connect to registry API
💡 Check your internet connection and try again
💡 Registry URL: https://api.sigyl.dev
```

## 🔗 Links

- **Marketplace**: [sigyl.dev/marketplace](https://sigyl.dev/marketplace)
- **Dashboard**: [sigyl.dev/dashboard](https://sigyl.dev/dashboard)
- **Documentation**: [docs.sigyl.dev](https://docs.sigyl.dev)
- **Support**: [Discord](https://discord.gg/sigyl)

## 🚀 What's New

- ✅ **Zero Configuration**: Public packages work immediately
- ✅ **API-First**: Secure authentication via registry API
- ✅ **Simple Setup**: Single API key for private packages
- ✅ **Better Errors**: Clear guidance and helpful links
- ✅ **Multi-Client**: Support for Claude, VS Code, and Cursor

