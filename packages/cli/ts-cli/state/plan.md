# MCP Inspector Refactor Plan (2024-06-28)

## Context
Previously, the CLI's inspector logic for running the MCP server and Inspector Playground UI locally was brittle, hardcoded, and error-prone. Ports and paths were not configurable, playground build errors were not handled gracefully, and process cleanup was unreliable.

## New Approach
- **launchMCPInspector** now accepts an options object:
  - `serverEntry`, `serverArgs`, `serverPort`
  - `playgroundDir`, `playgroundPort`, `autoBuildPlayground`
  - `inspectorMode` ('local' or 'remote')
- Both the MCP server and the playground UI are started as child processes/servers.
- The CLI waits for both to be ready before opening the browser.
- If the playground build is missing, the CLI can auto-build it or prompt the user.
- All child processes are cleaned up on exit (SIGINT/SIGTERM).
- Errors are clearer and more actionable.

## Why This Was Needed
- To allow robust local development and debugging of MCP servers with the Inspector UI.
- To avoid port conflicts and hardcoded paths.
- To make the developer experience smoother and more reliable.
- To provide a foundation for future CLI/inspector improvements.

## Next Steps
- Expose these options in the CLI interface (future work).
- Consider adding more diagnostics and health checks. 