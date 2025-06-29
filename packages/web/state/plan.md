## [Update] Dashboard MCP Server List

- The dashboard MCP server list now queries the `mcp_packages` table, filtering by `author_id` (which is the user's profile UUID, looked up by their `github_id`).
- This replaces the old logic that listed servers by workspace.
- This ensures that users only see their own deployed MCP servers/packages on the dashboard. 