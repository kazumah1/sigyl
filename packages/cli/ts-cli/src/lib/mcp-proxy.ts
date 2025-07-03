import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { JSONRPCMessage, JSONRPCError } from "@modelcontextprotocol/sdk/types.js";

interface MCPProxyOptions {
  endpoint: string;
  apiKey: string;
  profile?: string;
}

export class createMCPStdioProxy {
  private endpoint: string;
  private apiKey: string;
  private profile?: string;
  private transport: StreamableHTTPClientTransport | null = null;
  private stdinBuffer: string = "";
  private isReady: boolean = false;
  private isShuttingDown: boolean = false;

  constructor(options: MCPProxyOptions) {
    this.endpoint = options.endpoint;
    this.apiKey = options.apiKey;
    this.profile = options.profile;
  }

  async start(): Promise<void> {
    console.error(`🚀 Starting MCP proxy for package...`);
    console.error(`   Endpoint: ${this.endpoint}`);
    if (this.profile) {
      console.error(`   Profile: ${this.profile}`);
    }

    await this.setupTransport();
    this.setupStdinHandling();
    this.setupProcessHandlers();
  }

  private async setupTransport(): Promise<void> {
    try {
      // Ensure we're using the /mcp endpoint
      let endpoint = this.endpoint;
      if (!endpoint.endsWith('/mcp') && !endpoint.includes('/mcp')) {
        endpoint = endpoint.endsWith('/') ? endpoint + 'mcp' : endpoint + '/mcp';
      }

      // Create the transport URL with query parameters like Smithery
      const url = new URL(endpoint);
      
      // Add API key as query parameter
      url.searchParams.set("api_key", this.apiKey);
      
      // Add profile if provided
      if (this.profile) {
        url.searchParams.set("profile", this.profile);
      }

      console.error(`[DEBUG] Connecting to: ${url.toString()}`);

      // Create the MCP transport
      this.transport = new StreamableHTTPClientTransport(url);

      // Set up message handler
      this.transport.onmessage = (message: JSONRPCMessage) => {
        try {
          if ("error" in message) {
            const errorMessage = message as JSONRPCError;
            console.error(`[DEBUG] Received error: ${JSON.stringify(errorMessage)}`);
          }
          
          // Forward the message to stdout for Claude
          console.log(JSON.stringify(message));
        } catch (error) {
          console.error(`[DEBUG] Error handling message:`, error);
        }
      };

      // Set up error handler
      this.transport.onerror = (error: Error) => {
        console.error(`[DEBUG] Transport error: ${error.message}`);
      };

      // Set up close handler
      this.transport.onclose = () => {
        console.error(`[DEBUG] Transport closed`);
        if (!this.isShuttingDown) {
          process.exit(1);
        }
      };

      // Start the transport
      this.transport.start();
      this.isReady = true;
      console.error(`[DEBUG] Transport started successfully`);

    } catch (error) {
      console.error(`[DEBUG] Failed to setup transport:`, error);
      process.exit(1);
    }
  }

  private setupStdinHandling(): void {
    // Handle stdin data
    process.stdin.on("data", (data) => {
      this.handleIncomingData(data.toString());
    });

    // Handle stdin end (client disconnect)
    process.stdin.on("end", () => {
      console.error(`[DEBUG] STDIN closed (client disconnected)`);
      this.cleanup();
    });

    // Handle stdin errors
    process.stdin.on("error", (error) => {
      console.error(`[DEBUG] STDIN error:`, error);
      this.cleanup();
    });
  }

  private setupProcessHandlers(): void {
    // Handle process termination signals
    process.on("SIGINT", () => {
      console.error(`[DEBUG] Received SIGINT, cleaning up...`);
      this.cleanup();
    });

    process.on("SIGTERM", () => {
      console.error(`[DEBUG] Received SIGTERM, cleaning up...`);
      this.cleanup();
    });

    process.on("beforeExit", () => {
      console.error(`[DEBUG] Process exiting, cleaning up...`);
      this.cleanup();
    });
  }

  private handleIncomingData(chunk: string): void {
    if (!this.isReady || !this.transport) return;

    this.stdinBuffer += chunk;

    // Process complete JSON-RPC messages (line-delimited)
    const lines = this.stdinBuffer.split(/\r?\n/);
    this.stdinBuffer = lines.pop() || "";

    for (const line of lines) {
      if (line.trim()) {
        this.processMessage(line.trim());
      }
    }
  }

  private async processMessage(messageStr: string): Promise<void> {
    try {
      const message = JSON.parse(messageStr) as JSONRPCMessage;
      console.error(`[DEBUG] Forwarding message: ${JSON.stringify(message)}`);
      
      if (this.transport) {
        await this.transport.send(message);
      }
    } catch (error) {
      console.error(`[DEBUG] Error processing message:`, error);
      console.error(`[DEBUG] Invalid message: ${messageStr}`);
    }
  }

  private cleanup(): void {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    console.error(`[DEBUG] Cleaning up MCP proxy...`);

    if (this.transport) {
      try {
        this.transport.close();
      } catch (error) {
        console.error(`[DEBUG] Error closing transport:`, error);
      }
      this.transport = null;
    }

    process.exit(0);
  }
} 