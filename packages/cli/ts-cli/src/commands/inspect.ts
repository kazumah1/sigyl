import { launchMCPInspector } from "../lib/inspector"
import path from "path"

export default async function inspectCommand(args: string[] = []) {
  // Path to the built server (assume .mcp-generated/server.js)
  const serverEntry = path.resolve(process.cwd(), "template-mcp/server.js")

  // Optionally, you could build the server here if needed
  // await buildServer()

  launchMCPInspector(serverEntry, args)
} 