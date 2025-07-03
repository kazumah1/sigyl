import { Command } from "commander";
import { getRegistryConfig } from "../lib/config";
import chalk from "chalk";

interface RunOptions {
  key?: string;
  profile?: string;
  endpoint?: string;
}

export function createRunCommand(): Command {
  return new Command("run")
    .description("Run a remote MCP server as a local proxy for Claude Desktop")
    .argument("<package>", "MCP package slug (e.g., 1CharlieMartin/sigyl-mcp)")
    .option("--key <key>", "API key for authentication")
    .option("--profile <profile>", "Profile ID for the MCP server")
    .option("--endpoint <endpoint>", "Custom endpoint URL (optional)")
    .action(async (packageSlug: string, options: RunOptions) => {
      try {
        await runMCPProxy(packageSlug, options);
      } catch (error) {
        console.error(chalk.red("❌ MCP proxy failed:"), error);
        process.exit(1);
      }
    });
}

async function runMCPProxy(packageSlug: string, options: RunOptions): Promise<void> {
  const config = getRegistryConfig();
  
  // Use API key from config unless overridden
  const apiKey = options.key || config.apiKey;
  if (!apiKey) {
    console.error(chalk.red("❌ No API key found. Please run 'sigyl config' or provide --key."));
    process.exit(1);
  }

  // Get package information from registry
  const packageInfo = await fetchPackageInfo(packageSlug, apiKey, config.registryUrl);
  if (!packageInfo) {
    console.error(chalk.red(`❌ Package '${packageSlug}' not found or inaccessible.`));
    process.exit(1);
  }

  // Determine the MCP endpoint
  const mcpEndpoint = options.endpoint || packageInfo.source_api_url;
  if (!mcpEndpoint) {
    console.error(chalk.red(`❌ No endpoint available for package '${packageSlug}'.`));
    process.exit(1);
  }

  // Start the MCP proxy
  console.error(chalk.blue(`🚀 Starting MCP proxy for ${packageSlug}...`));
  console.error(chalk.gray(`   Endpoint: ${mcpEndpoint}`));
  console.error(chalk.gray(`   Profile: ${options.profile || 'default'}`));

  await startStdioProxy(mcpEndpoint, apiKey, options.profile);
}

async function fetchPackageInfo(packageSlug: string, apiKey: string, registryUrl: string): Promise<any> {
  try {
    const response = await fetch(`${registryUrl}/api/v1/packages/${packageSlug}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as { success: boolean; data?: any; error?: string };
    return data.success ? data.data : null;
  } catch (error) {
    return null;
  }
}

async function startStdioProxy(mcpEndpoint: string, apiKey: string, profile?: string): Promise<void> {
  const { createMCPStdioProxy } = await import("../lib/mcp-proxy");
  
  const proxy = new createMCPStdioProxy({
    endpoint: mcpEndpoint,
    apiKey,
    profile
  });

  await proxy.start();
} 