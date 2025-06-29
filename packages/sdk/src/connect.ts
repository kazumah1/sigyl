import axios from 'axios';
import type { ToolFunction, ConnectOptions, SDKConfig } from './types';
import { getPackage } from './registry';

// --- Smithery-style Transport and Client abstractions ---

export interface Transport {
  connect(): Promise<void>;
  invokeTool(toolName: string, input: any): Promise<any>;
  close(): Promise<void>;
}

export class HttpTransport implements Transport {
  private baseUrl: string;
  private timeout: number;
  private apiKey?: string;

  constructor(baseUrl: string, timeout: number = 10000, apiKey?: string) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.apiKey = apiKey;
  }

  async connect(): Promise<void> {
    // For HTTP, no persistent connection is needed
    return;
  }

  async invokeTool(toolName: string, input: any): Promise<any> {
    // Use JSON-RPC 2.0 to call the tool at /mcp with method 'tools/call'
    const url = `${this.baseUrl.replace(/\/$/, '')}/mcp`;
    const payload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: input
      }
    };
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    const response = await axios.post(url, payload, {
      timeout: this.timeout,
      headers
    });
    let data = response.data;
    if (typeof data === 'string' && data.startsWith('event: message')) {
      // Extract the JSON from the data: ... line
      const match = data.match(/data: (\{.*\})/);
      if (match) {
        data = JSON.parse(match[1]);
      }
    }
    if (data && typeof data === 'object' && 'result' in data) {
      return data.result;
    }
    return data;
  }

  async invokeRaw(method: string, params: any): Promise<any> {
    const url = `${this.baseUrl.replace(/\/$/, '')}/mcp`;
    const payload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    };
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream'
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    const response = await axios.post(url, payload, {
      timeout: this.timeout,
      headers
    });
    let data = response.data;
    if (typeof data === 'string' && data.startsWith('event: message')) {
      const match = data.match(/data: (\{.*\})/);
      if (match) {
        data = JSON.parse(match[1]);
      }
    }
    if (data && typeof data === 'object' && 'result' in data) {
      return data.result;
    }
    return data;
  }

  async close(): Promise<void> {
    // For HTTP, nothing to close
    return;
  }
}

export class Client {
  private transport: Transport | null = null;
  private connected = false;

  async connect(transport: Transport): Promise<void> {
    await transport.connect();
    this.transport = transport;
    this.connected = true;
  }

  async invoke(method: string, input: any): Promise<any> {
    if (!this.transport || !this.connected) {
      throw new Error('Client is not connected to a transport');
    }
    // If method is tools/list or other management method, use invokeRaw
    if (typeof (this.transport as any).invokeRaw === 'function' && (method === 'tools/list' || method.startsWith('tools/'))) {
      return (this.transport as any).invokeRaw(method, input);
    }
    // Otherwise, treat as a tool call
    return (this.transport as any).invokeTool(method, input);
  }

  async close(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
      this.connected = false;
    }
  }
}

/**
 * Smithery-style connect: returns a connected Client instance for a package
 */
export async function connect(
  packageName: string,
  options: ConnectOptions = {}
): Promise<Client> {
  const { registryUrl = 'http://localhost:3000/api/v1', timeout = 10000 } = options;
  // Get package details from registry
  const packageData = await getPackage(packageName, { registryUrl, timeout });
  console.log('[SDK] Loaded package data:', JSON.stringify(packageData, null, 2));

  // Try to get deployment URL from deployments array (legacy)
  let deploymentUrl: string | undefined = undefined;
  if (Array.isArray(packageData.deployments) && packageData.deployments.length > 0) {
    const activeDeployment = packageData.deployments.find(d => d.status === 'active');
    if (activeDeployment) {
      deploymentUrl = activeDeployment.deployment_url;
      console.log('[SDK] Using deployment_url from deployments array:', deploymentUrl);
    }
  }
  // Fallback: use source_api_url or deployment_url directly from package
  if (!deploymentUrl) {
    deploymentUrl = packageData.source_api_url || (packageData as any).deployment_url;
    console.log('[SDK] Using deployment_url from package record:', deploymentUrl);
  }
  if (!deploymentUrl) {
    console.error('[SDK] No deployment URL found for package:', packageName);
    throw new Error(`No deployment URL found for package '${packageName}'`);
  }
  // Create transport and client
  console.log('[SDK] Connecting to MCP server at:', deploymentUrl);
  // Use the provided API key for now
  const apiKey = 'sk_575b23dd6b6ad801ace640614f181b4428b5263215cd7df0e038537ad7a07144';
  const transport = new HttpTransport(deploymentUrl, timeout, apiKey);
  const client = new Client();
  await client.connect(transport);
  return client;
}

/**
 * Connect directly to a tool by URL (stateless, for backward compatibility)
 */
export async function connectDirect(
  toolUrl: string,
  options: ConnectOptions = {}
): Promise<ToolFunction> {
  const { timeout = 10000 } = options;
  // Validate URL
  try {
    new URL(toolUrl);
  } catch {
    throw new Error(`Invalid tool URL: ${toolUrl}`);
  }
  // Return a function that can be called with input
  return async (input: any): Promise<any> => {
    try {
      const response = await axios.post(toolUrl, input, {
        timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(`Tool invocation failed: ${error.response.status} ${error.response.statusText}`);
        } else if (error.request) {
          throw new Error(`Tool invocation failed: No response received`);
        }
      }
      throw error;
    }
  };
} 