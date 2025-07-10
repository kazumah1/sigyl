import { Command } from "commander";
import { getRegistryConfig } from "../lib/config";
import chalk from "chalk";

interface RunOptions {
  key?: string;
  endpoint?: string;
}

export function createRunCommand(): Command {
  return new Command("run")
    .description("Run a remote MCP server as a local proxy for Claude Desktop. Accepts a package slug (e.g. kazumah1/mcp-test) or a full MCP endpoint URL.")
    .argument("<target>", "MCP package slug (@github-username/repo-name) or full MCP endpoint URL")
    .option("--key <key>", "API key for authentication")
    .option("--endpoint <endpoint>", "Custom endpoint URL (optional)")
    .action(async (target: string, options: RunOptions) => {
      try {
        await runMCPProxy(target, options);
      } catch (error) {
        console.error(chalk.red("\u274c MCP proxy failed:"), error);
        process.exit(1);
      }
    });
}

async function runMCPProxy(target: string, options: RunOptions): Promise<void> {
  const config = getRegistryConfig();
  const apiKey = options.key || config.apiKey;
  if (!apiKey) {
    console.error(chalk.red("\u274c No API key found. Please run 'sigyl config' or provide --key."));
    process.exit(1);
  }

  let mcpEndpoint: string;
  if (target.startsWith('http://') || target.startsWith('https://')) {
    // Use the URL directly
    mcpEndpoint = target;
  } else {
    // Get package information from registry
    const packageInfo = await fetchPackageInfo(target, apiKey, config.registryUrl);
    if (!packageInfo) {
      console.error(chalk.red(`\u274c Package '${target}' not found or inaccessible.`));
      process.exit(1);
    }
    mcpEndpoint = options.endpoint || packageInfo.source_api_url;
    if (!mcpEndpoint) {
      console.error(chalk.red(`\u274c No endpoint available for package '${target}'.`));
      process.exit(1);
    }
    // Always use /mcp endpoint unless overridden
    if (!options.endpoint && !mcpEndpoint.endsWith('/mcp')) {
      mcpEndpoint = mcpEndpoint.replace(/\/+$/, '') + '/mcp';
    }
  }

  // Start the MCP proxy
  console.error(chalk.blue(`\ud83d\ude80 Starting MCP proxy for ${target}...`));
  console.error(chalk.gray(`   Endpoint: ${mcpEndpoint}`));

  await startStdioProxy(mcpEndpoint, apiKey);
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

async function startStdioProxy(mcpEndpoint: string, apiKey: string): Promise<void> {
  const { createMCPStdioProxy } = await import("../lib/mcp-proxy");
  
  const proxy = new createMCPStdioProxy({
    endpoint: mcpEndpoint,
    apiKey
  });

  await proxy.start();
} 