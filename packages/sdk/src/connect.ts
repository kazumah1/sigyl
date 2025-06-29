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

  constructor(baseUrl: string, timeout: number = 10000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  async connect(): Promise<void> {
    // For HTTP, no persistent connection is needed
    return;
  }

  async invokeTool(toolName: string, input: any): Promise<any> {
    const url = `${this.baseUrl}/${toolName}`;
    const response = await axios.post(url, input, {
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
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

  async invoke(toolName: string, input: any): Promise<any> {
    if (!this.transport || !this.connected) {
      throw new Error('Client is not connected to a transport');
    }
    return this.transport.invokeTool(toolName, input);
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
  // Find an active deployment
  const activeDeployment = packageData.deployments.find(d => d.status === 'active');
  if (!activeDeployment) {
    throw new Error(`No active deployment found for package '${packageName}'`);
  }
  // Create transport and client
  const transport = new HttpTransport(activeDeployment.deployment_url, timeout);
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