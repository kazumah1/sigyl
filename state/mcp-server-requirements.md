# MCP Server Repository Requirements

This document outlines the requirements and best practices for structuring a repository to be deployable as a Model Context Protocol (MCP) server using Sigyl's deployment system. It is intended for developers integrating with the Sigyl web app and CLI.

---

## 1. Required Files and Directory Structure

All critical files must be located in the **same root directory** of your MCP server project. The following files are required:

- `sigyl.yaml` (or `smithery.yaml` for legacy/compat): MCP server configuration (see below)
- `server.ts` or `server.js`: Entry point exporting the MCP server (see code requirements)
- `package.json`: Node.js project manifest (with required dependencies)
- `tsconfig.json`: TypeScript config (if using TypeScript)

**Example directory layout:**

```
my-mcp-server/
├── sigyl.yaml
├── server.ts
├── package.json
├── tsconfig.json
```

---

## 2. `sigyl.yaml` Configuration

This YAML file defines how your MCP server is built and run. It must be present in the root directory.

### **Required fields:**

- `runtime`: `node` or `container`
- `language`: `typescript` or `javascript` (required for `node` runtime)
- `startCommand`:
  - `type`: Must be `http` (required for MCP compatibility)
- `configSchema`: (optional but recommended) JSON Schema for secrets/configuration (see below)

**Example:**
```yaml
runtime: node
language: typescript
startCommand:
  type: http
# Optionally, add configSchema for secrets:
# configSchema:
#   type: object
#   properties:
#     apiKey:
#       type: string
#       description: Your API key
#   required: [apiKey]
```

- For advanced use (custom Dockerfile), set `runtime: container` and provide a `build` section.

---

## 3. `server.ts`/`server.js` Code Requirements

Your server entry point **must**:

- Export a **default function** (not a class or object) with the signature:
  ```ts
  export default function createStatelessServer({ config }: { config: any }) { ... }
  ```
- Instantiate an `McpServer` object from `@modelcontextprotocol/sdk` inside this function.
- Register one or more tools using `server.tool(...)`.
- Return `server.server` at the end of the function.

**Example:**
```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export default function createStatelessServer({ config }: { config: any }) {
  const server = new McpServer({
    name: "my-mcp-server",
    version: "1.0.0",
  });

  server.tool(
    "reverseString",
    "Reverse a string value",
    { value: z.string().describe("String to reverse") },
    async ({ value }) => ({ content: [{ type: "text", text: value.split("").reverse().join("") }] })
  );

  return server.server;
}
```

---

## 4. Environment Variables and Configuration

- **Do NOT** use `process.env.[ENV_NAME]` directly in your tool logic.
- **DO** use `config.[envName]` (the `config` object passed to your server function) for all secrets and environment variables.
- The deployment system injects secrets and config values into the `config` object based on your `configSchema`.

---

## 5. `package.json` Requirements

- Must include the following dependencies:
  - `@modelcontextprotocol/sdk` (version compatible with Sigyl)
  - `zod` (for schema validation)
- For TypeScript projects, include `typescript` and `@types/node` as devDependencies.
- Set `type: "module"` for ESM compatibility.
- Set `main` to `server.js` (the compiled output for TypeScript projects).
- Include build/start scripts:
  ```json
  "scripts": {
    "build": "tsc",
    "start": "node server.js"
  }
  ```

---

## 6. TypeScript Support

- If using TypeScript, provide a `tsconfig.json` with at least:
  - `module`: `ESNext`
  - `target`: `ES2020` or later
  - `outDir`: `./`
  - `rootDir`: `./`
  - `esModuleInterop`: `true`
  - `skipLibCheck`: `true`

---

## 6a. Customizing `outDir` and `rootDir` in TypeScript Projects

You **can** change the `outDir` and `rootDir` in your `tsconfig.json` to use a different source/output structure (e.g., `src/` for source and `dist/` for output). However, you **must** update your `package.json` and file locations accordingly.

### What to update if you change `outDir` or `rootDir`

- **Move your TypeScript source files** to the directory specified by `rootDir` (e.g., `src/`).
- **Your compiled JavaScript files** will be emitted to the directory specified by `outDir` (e.g., `dist/`).
- **Update your `package.json`:**
  - Set `"main"` to the path of the compiled entry point (e.g., `"dist/server.js"`).
  - Set your start script to use the compiled file (e.g., `"start": "node dist/server.js"`).
- **Ensure all required files** (`sigyl.yaml`, `package.json`, etc.) remain in the project root.
- **If you use a Dockerfile or custom build scripts,** update any references to the server entry point to match the new output location.

### Example: Using `src/` and `dist/`

**Directory structure:**
```
my-mcp-server/
├── sigyl.yaml
├── src/
│   └── server.ts
├── dist/
│   └── server.js
├── package.json
├── tsconfig.json
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "module": "ESNext",
    "target": "ES2020",
    "outDir": "dist",
    "rootDir": "src",
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

**package.json:**
```json
{
  "main": "dist/server.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js"
  },
  // ...other fields
}
```

### Summary Table

| Scenario                | What to Change                                 |
|-------------------------|------------------------------------------------|
| Change `outDir`         | Update `main` and `start` in `package.json`    |
| Change `rootDir`        | Move source files, update `tsconfig.json`      |
| Both (`src` → `dist`)   | Update `main`, `start`, move files accordingly |

### Why does this matter for MCP deployment?

- The deployment system (and the wrapper) uses the path in `package.json`'s `main` field to find and start your compiled `server.js`.
- If you change the output location, you **must** keep `main` and your start script in sync, or the deployment will fail to start your server.

---

## 6b. Other `tsconfig.json` and `package.json` Customizations

You can customize other fields in your `tsconfig.json` and `package.json`, but you must ensure compatibility with the MCP deployment system and Node.js 20+ (Cloud Run default). Here are common changes and what you must update:

### `tsconfig.json` Customizations

| Option              | Can you change it? | What else must be updated? |
|---------------------|--------------------|----------------------------|
| `module`            | Yes (recommend `ESNext` or `NodeNext`) | Must match Node.js ESM support; keep `type: "module"` in `package.json` |
| `target`            | Yes (`ES2020` or later recommended) | Ensure your code and dependencies are compatible |
| `esModuleInterop`   | Yes (recommended: `true`) | If `false`, you may need to change import style |
| `skipLibCheck`      | Yes                 | No effect on runtime, just type checking |
| `declaration`       | Yes (optional)      | No effect on runtime, just type generation |
| `allowJs`           | Yes (if mixing JS/TS) | Ensure your build includes all needed files |
| `include`/`exclude` | Yes                 | Make sure all source files are included/excluded as needed |

### `package.json` Customizations

| Field         | Can you change it? | What else must be updated? |
|---------------|--------------------|----------------------------|
| `main`        | Yes (required to match compiled output) | Must point to the compiled entry point (e.g., `dist/server.js`) |
| `type`        | Yes (must be `module`) | Required for ESM imports/exports |
| `scripts`     | Yes                 | `start` must run the compiled server (e.g., `node dist/server.js`) |
| `dependencies`| Yes                 | Must include `@modelcontextprotocol/sdk` and `zod` |
| `devDependencies` | Yes              | For TypeScript: include `typescript`, `@types/node` |

### Important Notes

- **`type: "module"` is required** for ESM import/export syntax. Do not use CommonJS (`type: "commonjs"`).
- **`main` must always point to the compiled JavaScript entry point** (not the TypeScript source).
- **`start` script must run the compiled output** (not the TypeScript source).
- If you use a custom build process (e.g., Babel, esbuild), ensure the output is compatible with Node.js 20+ and ESM, and update `main`/`start` accordingly.
- If you add other fields (e.g., `exports`, `bin`), they do not affect MCP deployment unless you change how the server is started.

### Example Table: Common Customizations

| Change                                | Required Adjustments                                      |
|----------------------------------------|-----------------------------------------------------------|
| Move source to `src/`, output to `lib/`| `main: "lib/server.js"`, `start: "node lib/server.js"`    |
| Use `module: "NodeNext"`               | Keep `type: "module"` in `package.json`                   |
| Use Babel for build                    | `main`/`start` must point to Babel output                 |
| Add more scripts (e.g., `test`)        | No effect on deployment                                   |
| Add `declaration: true`                | No effect on deployment                                   |
| Use `allowJs: true`                    | Ensure all JS files are included in build                 |

### Summary

- The **deployment system relies on the compiled output and the `main` field in `package.json`** to find and start your server.
- You can customize your build and project structure, but you **must** keep `main` and `start` in sync with your output, and use ESM (`type: "module"`).
- All required files (`sigyl.yaml`, `package.json`, etc.) must remain in the project root.

---

## 7. Tool Registration and API Design

- Each tool should be registered using `server.tool(name, description, inputSchema, handler)`.
- Use `zod` schemas for input validation.
- For tools that proxy to an existing API (e.g., Express), use the `config` object for base URLs and secrets.
- Return results in the format expected by MCP (see sample code).

---

## 8. Best Practices & Conventions

- **Secrets and API keys**: Always define them in `configSchema` and access via `config`, not `process.env`.
- **No hardcoded environment variables**: All runtime config should be in `config`.
- **Stateless**: The server function should not maintain global state between requests.
- **Compatibility**: Avoid using features not supported by Node.js 20+ (Cloud Run default).
- **Testing**: Ensure your server can be started locally with `npm run build && npm start`.

---

## 9. Example: Minimal MCP Server

```yaml
# sigyl.yaml
runtime: node
language: typescript
startCommand:
  type: http
```

```ts
// server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export default function createStatelessServer({ config }: { config: any }) {
  const server = new McpServer({ name: "my-mcp-server", version: "1.0.0" });
  server.tool("hello", "Say hello", {}, async () => ({ content: [{ type: "text", text: "Hello, world!" }] }));
  return server.server;
}
```

---

## 10. Advanced: Custom Dockerfile/Container

- If you need a custom runtime, set `runtime: container` in `sigyl.yaml` and provide a `Dockerfile`.
- Your Dockerfile **must** expose port 8080 and start the MCP server at `/mcp`.
- You are responsible for copying all required files and installing dependencies.

---

## 11. Troubleshooting

- **Missing files**: Ensure all required files are present in the root directory.
- **Incorrect config usage**: Do not use `process.env` in your tool logic.
- **YAML errors**: Validate your `sigyl.yaml` for correct syntax and required fields.
- **Build errors**: Check that your `tsconfig.json` and `package.json` are compatible with Node.js 20+ and ESM.

---

## 12. References

- [Sample MCP Server: Blank Template](../examples/sample-mcps/blank-template/)
- [Sample MCP Server: Express Integration](../examples/sample-mcps/ts-complex/)
- [@modelcontextprotocol/sdk Documentation](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- [Sigyl Web App](https://sigyl.dev)

---

For further questions, see the Sigyl documentation or contact the maintainers. 