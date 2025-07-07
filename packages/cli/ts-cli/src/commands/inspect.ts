import { launchMCPInspector, getPlaygroundDir, InspectorOptions } from "../lib/inspector"
import path from "path"

export default async function inspectCommand(
  args: string[] = [],
  serverPath?: string,
  options?: Partial<InspectorOptions>
) {
  // Use provided server path or default to generated server
  const serverEntry = serverPath || path.resolve(process.cwd(), ".mcp-generated/server.js")

  // Playground directory (default: sibling playground)
  const playgroundDir = options?.playgroundDir || getPlaygroundDir();

  // Ports (allow override via options)
  const serverPort = options?.serverPort || 8080;
  const playgroundPort = options?.playgroundPort || 3001;
  const autoBuildPlayground = options?.autoBuildPlayground ?? false;

  try {
    await launchMCPInspector({
      serverEntry,
      serverArgs: args,
      serverPort,
      playgroundDir,
      playgroundPort,
      autoBuildPlayground,
      inspectorMode: options?.inspectorMode,
    });
  } catch (e) {
    console.error("[ERROR] Failed to launch MCP Inspector:", e);
    process.exit(1);
  }
} 