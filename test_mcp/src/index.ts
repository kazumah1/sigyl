import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";


export default function createStatelessServer({
  config,
}: {
  config: any;
}) {
  const server = new McpServer({
    name: "My MCP Server",
    version: "1.0.0",
  });

  // Add a tool
  server.tool(
    "search_google",
    "Search Google for a given query",
    {
      query: z.string().describe("Query to search for"),
    },
    async ({ query }) => {
      return {
        content: [{ type: "text", text: `Searching Google for ${query}` }],
      };
    }
  );

  return server.server;
}