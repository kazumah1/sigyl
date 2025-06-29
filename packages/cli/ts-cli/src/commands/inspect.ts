import { launchMCPInspector } from "../lib/inspector"
import path from "path"

export default async function inspectCommand(args: string[] = [], serverPath?: string) {
  // Use provided server path or default to generated server
  const serverEntry = serverPath || path.resolve(process.cwd(), ".mcp-generated/server.js")

  // Optionally, you could build the server here if needed
  // await buildServer()

  launchMCPInspector(serverEntry, args)
} 