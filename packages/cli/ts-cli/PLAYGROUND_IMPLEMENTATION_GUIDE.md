# MCP Playground Local Implementation Guide

This guide describes how to build and integrate a local MCP playground for developers to test their MCP servers before deployment. The playground will be a minimal web app (React + Vite) bundled with your CLI, and will connect to a locally running MCP server (e.g., http://localhost:8080/mcp).

---

## 1. Scaffold the Playground App

**a. Create the playground directory:**

```bash
cd packages/cli/ts-cli
npm create vite@latest playground -- --template react-ts
cd playground
npm install
```

**b. Clean up the template:**
- Remove demo code from `App.tsx`.
- Set up a basic UI: input for MCP server URL, button to connect, area to list tools and send test requests.

---

## 2. Add MCP Client Logic

- In `playground/src/App.tsx`, add state for the MCP server URL (default: `http://localhost:8080/mcp`).
- Add a function to fetch the tool list from the MCP server (POST a JSON-RPC request to `/mcp` with `{ method: 'listTools', ... }`).
- Add UI to display tools, select one, enter parameters, and send a test request.
- Display the JSON response.

---

## 3. Serve the Playground Locally

**Option A: Use Vite Dev Server (for development):**

```bash
cd packages/cli/ts-cli/playground
npm run dev
```
- The playground will be available at `http://localhost:5173`.

**Option B: Build and Serve Statically (for CLI integration):**

```bash
npm run build
npx serve -s dist
```
- Or use a simple Express server to serve the `dist/` folder.

---

## 4. Integrate Playground Launch with CLI

- In your CLI code (e.g., `inspect.ts` or a new `playground.ts`):
  - Start the MCP server as before (on port 8080).
  - Start the playground (either by running `npm run dev` or serving the built static files).
  - Open the browser to `http://localhost:5173` (or the chosen port).
  - Optionally, pre-fill the MCP server URL in the playground UI.

**Example (pseudo-code):**
```ts
spawn('npx', ['tsx', 'template-mcp/server.ts'], ...)
spawn('npm', ['run', 'dev'], { cwd: 'playground' })
open('http://localhost:5173')
```

---

## 5. Test the Workflow

1. Run your CLI command (e.g., `sigyl inspect` or `sigyl playground`).
2. The MCP server should start on port 8080.
3. The playground UI should open in the browser at `http://localhost:5173`.
4. The playground should connect to `http://localhost:8080/mcp` by default.
5. You should be able to list tools, select one, send test requests, and see responses.

---

## 6. Next Steps (Not Covered Here)
- Supporting public MCPs and cloud playground deployment
- Authentication, advanced tool schemas, etc.

---

**This guide covers only the local playground for testing local MCP servers.** 