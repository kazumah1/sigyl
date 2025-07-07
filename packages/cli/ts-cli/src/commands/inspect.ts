import { launchMCPInspector, getPlaygroundDir } from "../lib/inspector"
import path from "path"

export default async function inspectCommand(args: string[] = [], serverPath?: string) {
  // Use provided server path or default to generated server
  const serverEntry = serverPath || path.resolve(process.cwd(), ".mcp-generated/server.js")

  // Ensure playground directory exists and is resolved correctly
  getPlaygroundDir();

  // Optionally, you could build the server here if needed
  // await buildServer()

  launchMCPInspector(serverEntry, args)
} 