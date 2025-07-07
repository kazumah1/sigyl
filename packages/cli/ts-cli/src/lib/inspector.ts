import chalk from "chalk"
import { spawn } from "node:child_process"
import { verboseLog } from "../logger"
import path from "path"
import { existsSync } from "node:fs"
import http from "http"
import serveHandler from "serve-handler"

export async function openMCPInspector(
	mcpPort: string,
	customUrl?: string
): Promise<void> {
	try {
		// Default MCP Inspector URL - this would be the public MCP Inspector
		const inspectorUrl = customUrl || "https://mcp-inspector.com"
		
		// Construct URL with MCP server connection info
		const connectionUrl = `${inspectorUrl}?server=localhost:${mcpPort}`
		
		verboseLog(`Opening MCP Inspector: ${connectionUrl}`)
		console.log(chalk.blue(`🔍 MCP Inspector: ${chalk.underline(connectionUrl)}`))
		
		// Open browser on different platforms
		const platform = process.platform
		let command: string
		let args: string[]
		
		switch (platform) {
			case 'darwin':
				command = 'open'
				args = [connectionUrl]
				break
			case 'win32':
				command = 'start'
				args = ['', connectionUrl]
				break
			default:
				command = 'xdg-open'
				args = [connectionUrl]
				break
		}
		
		spawn(command, args, { detached: true, stdio: 'ignore' })
		
	} catch (error) {
		console.log(chalk.yellow("⚠️  Could not auto-open MCP Inspector"))
		console.log(chalk.gray(`Please visit: https://mcp-inspector.com?server=localhost:${mcpPort}`))
		verboseLog(`Error: ${error}`)
	}
}

// Refactored options type for clarity
export interface InspectorOptions {
	serverEntry?: string; // Path to MCP server entry (js/ts)
	serverArgs?: string[];
	serverPort?: number;
	playgroundDir?: string;
	playgroundPort?: number;
	autoBuildPlayground?: boolean;
	inspectorMode?: 'local' | 'remote';
}

export async function launchMCPInspector(
	options: InspectorOptions = {}
) {
	const {
		serverEntry = path.resolve(process.cwd(), "template-mcp/server.ts"),
		serverArgs = [],
		serverPort = 8080,
		playgroundDir = getPlaygroundDir(),
		playgroundPort = 3001,
		autoBuildPlayground = false,
		inspectorMode = (process.env.SIGYL_INSPECTOR_MODE as 'local' | 'remote') || 'local',
	} = options;

	console.log("\x1b[36m\n================ MCP Inspector ================\x1b[0m")

	// --- MCP Server ---
	const isHttpServer = serverEntry.includes('server.js') || serverEntry.includes('server.ts');
	let serverProcess: ReturnType<typeof spawn> | null = null;
	let staticServer: http.Server | null = null;
	let inspectorOpened = false;
	let serverStarted = false;
	let playgroundStarted = false;

	function openInspectorUI(url: string) {
		if (inspectorOpened) return;
		inspectorOpened = true;
		console.log(`\n🌐 Opening MCP Inspector UI: ${url}`);
		const platform = process.platform;
		let command: string;
		let args: string[];
		switch (platform) {
			case 'darwin':
				command = 'open'; args = [url]; break;
			case 'win32':
				command = 'start'; args = ['', url]; break;
			default:
				command = 'xdg-open'; args = [url]; break;
		}
		spawn(command, args, { detached: true, stdio: 'ignore' });
	}

	function cleanup() {
		if (serverProcess) serverProcess.kill('SIGTERM');
		if (staticServer) staticServer.close();
		process.exit(0);
	}
	process.on('SIGINT', cleanup);
	process.on('SIGTERM', cleanup);

	// --- Playground Build Check ---
	const playgroundDist = path.join(playgroundDir, 'dist');
	if (!existsSync(playgroundDist)) {
		if (autoBuildPlayground) {
			console.log("[INFO] Playground build missing. Attempting to build...");
			try {
				// Try to build using npm or pnpm
				const buildCmd = existsSync(path.join(playgroundDir, 'package.json')) ? 'npm' : null;
				if (buildCmd) {
					const buildProc = spawn(buildCmd, ['run', 'build'], { cwd: playgroundDir, stdio: 'inherit' });
					await new Promise((resolve, reject) => {
						buildProc.on('close', (code) => code === 0 ? resolve(true) : reject(new Error('Playground build failed')));
					});
				} else {
					throw new Error('No package.json found in playground directory. Cannot build.');
				}
			} catch (e) {
				console.error("\x1b[31m[ERROR]\x1b[0m Failed to build playground:", e);
				process.exit(1);
			}
		} else {
			console.error("\x1b[31m[ERROR]\x1b[0m Playground build output (dist) is missing. Please run 'npm run build' in the playground directory:");
			console.error(`  cd ${playgroundDir} && npm run build`);
			process.exit(1);
		}
	}

	// --- Start MCP Server ---
	if (isHttpServer) {
		console.log(`Starting HTTP MCP Server on port ${serverPort}...`);
		serverProcess = spawn("npx", ["tsx", serverEntry, ...serverArgs], {
			stdio: ["inherit", "pipe", "pipe"],
			env: {
				...process.env,
				PORT: String(serverPort)
			}
		});

		serverProcess.stdout?.on("data", (data) => {
			const str = data.toString();
			process.stdout.write(str);
			if (str.includes("MCP Server listening") && !serverStarted) {
				serverStarted = true;
				maybeOpenInspector();
			}
		});
		serverProcess.stderr?.on("data", (data) => { process.stderr.write(data.toString()); });
		serverProcess.on("error", (err) => { console.error("Failed to start MCP Server:", err); });
		serverProcess.on("close", (code) => { if (code !== 0) { console.error(`Server exited with code ${code}`); } else { console.log("\n👋 MCP Server stopped"); } });
	}

	// --- Start Playground Static Server ---
	staticServer = http.createServer((req, res) => {
		return serveHandler(req, res, { public: playgroundDist });
	});
	staticServer.listen(playgroundPort, () => {
		playgroundStarted = true;
		console.log(`\n🎉 Playground UI is running at http://localhost:${playgroundPort}`);
		maybeOpenInspector();
	});
	staticServer.on('error', (err) => {
		console.error(`\x1b[31m[ERROR]\x1b[0m Failed to start playground static server on port ${playgroundPort}:`, err);
		cleanup();
	});

	// --- Wait for both servers before opening browser ---
	function maybeOpenInspector() {
		if (serverStarted && playgroundStarted && !inspectorOpened) {
			console.log(`\n1. Your MCP server is running at http://localhost:${serverPort}/mcp`);
			console.log(`2. The Inspector UI will open in your browser at http://localhost:${playgroundPort}`);
			console.log("3. Connect using the UI to inspect your MCP server.");
			openInspectorUI(`http://localhost:${playgroundPort}`);
		}
	}
}

// Utility to resolve playground directory inside the CLI package
export function getPlaygroundDir() {
	// Check both possible locations: production (dist) and development (src)
	const candidates = [
		path.resolve(__dirname, '../playground'), // sibling to dist/ or src/
		path.resolve(__dirname, '../../playground'), // for nested build structures
	];
	for (const playgroundDir of candidates) {
		if (existsSync(playgroundDir)) {
			console.log('[INFO] Using playground directory:', playgroundDir);
			return playgroundDir;
		}
	}
	console.error("\x1b[31m[ERROR]\x1b[0m Playground directory is missing from the CLI package. Tried:", candidates.join(', '));
	console.error("This is a bug: the playground must be bundled with the CLI. Please reinstall or contact the maintainer.");
	process.exit(1);
} 