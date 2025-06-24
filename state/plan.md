# MCP-Init MVP Roadmap  
**3-Week Plan for Charlie & Kazuma**

---

## Week 1: Core CLI & Scaffolding

### Day 1
- Scaffold project with `oclif`/`commander` (both)  
- Define commands: `init`, `dev`, `deploy`, `test`, `lint` (both)
- ✅ **RESOLVED**: Fixed TypeScript compilation errors by removing Jest dependencies from root project (cli-core uses Mocha)

### Day 2
- Implement AST scanner for TypeScript using `ts-morph` (Kazuma)  
- Extend scanner to import OpenAPI specs if present (Kazuma)  
- Build LLM wrapper for endpoint naming/descriptions using GPT-4-o (Charlie)  
- Integrate LLM call into `init --scan` command (Charlie)

### Day 3
- Create Ink-based TUI wizard for confirming tool names, auth, rate-limits (Charlie)  
- Generate initial YAML and JSON-Schema stubs (Charlie)  
- Integrate Zod (TypeScript) / Pydantic (Python) for schema validation (Kazuma)  
- Scaffold handler stubs under `src/tools/` (Kazuma)

### Day 4
- Set up golden JSON fixtures directory (Kazuma)  
- Add `--generate-fixtures` flag to CLI to produce sample JSON (Kazuma)  
- Implement `mcp test` harness running sample tool calls (Charlie)

### Day 5
- Create default "Hello World" tool scaffold (Charlie)  
- Detect existing LangChain/OpenAI function metadata for conversion (ChatGPT)  
- Test conversion logic on a sample repo and write smoke tests (Kazuma)

### Day 6
- Implement security linter rules for prompt injection and output size (Charlie)  
- Add `--oauth google` template middleware generator (Charlie)  
- Add mTLS certificate generator CLI subcommand (Kazuma)  
- Scaffold rate-limit logic using `express-rate-limit` / `slowapi` (Kazuma)

---

## Week 2: Dev Loop & DX Enhancements

### Day 7
- Implement `mcp dev` file watcher using `esbuild.context()` (<150ms rebuild) (Charlie)  
- Forward logs and errors to console (Charlie)  
- Set up Python auto-reload with `uvicorn --reload` or equivalent (Kazuma)

### Day 8
- Scaffold React/Vite playground app under `playground/` (Charlie)  
- Display generated schema and sample GPT prompt in playground (Charlie)  
- Serve playground assets with `mcp dev --playground` (Kazuma)

### Day 9
- Create format adapters: Langchain Tool, OpenAI function spec, Anthropic JSON (Kazuma)  
- Write unit tests for each adapter with mock schemas (Kazuma)

### Day 10
- Add `mcp lint` command with exit codes (Charlie)  
- Provide GitHub Actions workflow for lint and test (Charlie)  
- Create `.github/workflows/mcp.yml` sample (Kazuma)

### Day 11
- Auto-generate `README.md` with CLI usage examples (Charlie)  
- Prepare Homebrew formula (`formula/mcp-init.rb`) (Charlie)  
- Configure `package.json` for npm publish (Kazuma)  
- Write `scripts/publish.sh` for npm and brew (Kazuma)

### Day 12
- Implement `--registry` flag for multiple registries (smithery, glama, pipedream) (Charlie)  
- Integrate CLI calls to each registry's publish API (Kazuma)  
- Test publish flow against mocked registry endpoints (Kazuma)

---

## Week 3: Deployment, Analytics & Hosting

### Day 13
- Implement `mcp deploy --tier preview|shared|dedicated` for Fly.io & Cloudflare Workers (Charlie)  
- Integrate Doppler / Vault for secrets management (Kazuma)

### Day 14
- Define analytics metrics: invocations, latency, errors (Charlie)  
- Add `mcp analytics` CLI stub (Charlie)  
- Build metrics collector using InfluxDB or Redis (Kazuma)

### Day 15
- Extend playground UI with metrics dashboard tab (Charlie)  
- Expose metrics API endpoints for dashboard data (Kazuma)

### Day 16
- Finalize versioning: `npm version`, `git tag`, GitHub release (Charlie)  
- Publish Homebrew formula to tap repo (Charlie)  
- Publish `mcp-init` to npm registry (Kazuma)  
- Verify `brew install` and `npm install` succeed (Kazuma)

### Day 17
- Dogfood on sample repos (Express, FastAPI, Go) and fix integration issues (both)  
- Record 90-second demo GIF for marketing (both)

### Day 18
- Update website and documentation, draft blog post announcement (Charlie)  
- Run end-to-end CI tests and finalize launch checklist (Kazuma)

---

## Collaboration & Structure

- **Monorepo with workspaces**: define packages for `cli-core`, `scan`, `wizard`, `dev-loop`, `deploy`, `analytics` to enable parallel work  
- **Command interface definition on Day 1**: Charlie and Kazuma agree on flags and outputs so each can integrate independently  
- **Feature branches & PRs**: keep PRs small, merge after passing lint & tests  
- **Daily stand-ups (15 min)**: sync on blockers, handoffs, and coordinate shared tasks

---

By following this roadmap, **Charlie and Kazuma** will deliver a full-featured, cross-language, security-minded **MCP toolkit** with best-in-class DX, playground, CI integration, analytics, and 1-click hosting in **three weeks**.
