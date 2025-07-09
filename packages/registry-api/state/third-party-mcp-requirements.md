# Requirements for Third-Party MCPs to Deploy Successfully via Sigyl

This document outlines all requirements and best practices for third-party MCP (Modular Cloud Plugin) servers to be successfully deployed and operated via the Sigyl platform, including Cloud Run and the Sigyl Gateway.

---

## 1. **Repository Structure**
- **Public or Private GitHub Repository**: The MCP must be hosted in a GitHub repository accessible to the Sigyl GitHub App (private repos are supported if the app is installed).
- **Branch**: The default branch is `main`, but other branches can be specified during deployment.

## 2. **Configuration Files**
- **sigyl.yaml** (preferred) or `mcp.yaml` (legacy):
  - Must be present in the root of the repository.
  - Should define runtime, language, entry point, secrets, and tools.
  - Example `sigyl.yaml`:
    ```yaml
    runtime: node
    language: typescript
    entryPoint: server.js
    secrets:
      - name: API_KEY
        description: API key for third-party service
    tools:
      - name: getWeather
        description: Fetches weather data
        inputSchema: { ... }
        outputSchema: { ... }
    ```
- **package.json**: Must be present for Node.js MCPs, with all dependencies listed.
- **tsconfig.json**: Required for TypeScript projects.

## 3. **Server Implementation**
- **Entry Point**: The entry file (e.g., `server.js` or `dist/server.js`) must match the `entryPoint` in `sigyl.yaml`.
- **Port**: The server must listen on the port specified by the `PORT` environment variable (default: 8080 for Cloud Run).
- **MCP Endpoint**: The server must expose an HTTP endpoint at `/mcp` (e.g., `http://localhost:8080/mcp`).
- **Health Check**: Optionally expose `/health` or `/mcp` for health checks (Cloud Run uses `/mcp`).

## 4. **Environment Variables & Secrets**
- **Hybrid Environment Variable Support**:
  - The server **must** support reading secrets and environment variables from:
    1. **HTTP Headers**: `X-Secret-<KEY>` and `X-Env-<KEY>` (injected by Sigyl Gateway)
    2. **Request Body Context**: `req.body.context.environment` (for POST requests via gateway)
    3. **process.env**: Fallback for traditional deployments
- **Multi-Tenancy**: Do **not** require secrets at startup; instead, extract them per-request as above.
- **No Hardcoded Secrets**: Do not hardcode API keys or secrets in code or config files.

## 5. **Build & Runtime**
- **Node.js**: Must be compatible with Node 18+ (Cloud Run default is Node 18-alpine).
- **TypeScript**: Must compile to JavaScript before deployment (build step required).
- **Dockerfile**: Not required for Node.js MCPs (auto-generated), but supported for custom container builds.
- **No OS-Specific Dependencies**: Avoid native modules or OS-specific binaries unless containerized.

## 6. **API Design**
- **MCP Protocol**: The `/mcp` endpoint must accept and respond to JSON requests per the MCP protocol (see docs).
- **Stateless**: The server should be stateless; all secrets and user context are provided per-request.
- **Error Handling**: Return clear error messages and HTTP status codes for invalid requests.

## 7. **Security**
- **No Sensitive Data in Logs**: Do not log secrets or sensitive user data.
- **Input Validation**: Validate all incoming data.
- **Dependencies**: Keep dependencies up to date and avoid known vulnerabilities.

## 8. **Best Practices**
- **Documentation**: Include a `README.md` with usage, secrets required, and example requests.
- **Versioning**: Use semantic versioning in `package.json` and `sigyl.yaml`.
- **Testing**: Provide tests for all tools/endpoints if possible.

---

## Example: Minimal Node.js MCP Server
```js
// server.js
const express = require('express');
const app = express();
app.use(express.json());

function getEnv(req, key) {
  // 1. Check headers
  if (req.headers[`x-secret-${key.toLowerCase()}`]) return req.headers[`x-secret-${key.toLowerCase()}`];
  if (req.headers[`x-env-${key.toLowerCase()}`]) return req.headers[`x-env-${key.toLowerCase()}`];
  // 2. Check request context
  if (req.body && req.body.context && req.body.context.environment && req.body.context.environment[key]) return req.body.context.environment[key];
  // 3. Fallback to process.env
  return process.env[key];
}

app.post('/mcp', (req, res) => {
  const apiKey = getEnv(req, 'API_KEY');
  if (!apiKey) return res.status(400).json({ error: 'Missing API_KEY' });
  // ... handle request ...
  res.json({ success: true });
});

app.get('/mcp', (req, res) => res.json({ status: 'ok' }));
app.listen(process.env.PORT || 8080);
```

---

## Troubleshooting
- **Build Fails**: Ensure all dependencies are listed and TypeScript is compiled.
- **No /mcp Endpoint**: The server must expose `/mcp`.
- **Secrets Not Available**: Check that your server reads secrets from headers, context, or `process.env`.
- **Cloud Run Health Check Fails**: Ensure `/mcp` responds with 200 OK.

---

## References
- [Sigyl Docs](https://sigyl.dev/docs)
- [MCP Protocol Spec](https://sigyl.dev/docs/mcp-protocol)
- [Cloud Run Docs](https://cloud.google.com/run/docs) 