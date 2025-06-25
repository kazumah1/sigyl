import axios from 'axios';
import type { ToolFunction, ConnectOptions, SDKConfig } from './types';
import { getPackage } from './registry';

/**
 * Connect to a tool from the registry by package name and tool name
 */
export async function connect(
  packageName: string,
  toolName: string,
  options: ConnectOptions = {}
): Promise<ToolFunction> {
  const { registryUrl = 'http://localhost:3000/api/v1', timeout = 10000 } = options;
  
  try {
    // Get package details from registry
    const packageData = await getPackage(packageName, { registryUrl, timeout });
    
    // Find the specific tool
    const tool = packageData.tools.find(t => t.tool_name === toolName);
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found in package '${packageName}'`);
    }
    
    // Find an active deployment
    const activeDeployment = packageData.deployments.find(d => d.status === 'active');
    if (!activeDeployment) {
      throw new Error(`No active deployment found for package '${packageName}'`);
    }
    
    // Construct the tool URL
    const toolUrl = `${activeDeployment.deployment_url}/${toolName}`;
    
    // Return a function that can be called with input
    return async (input: any): Promise<any> => {
      const response = await axios.post(toolUrl, input, {
        timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      return response.data;
    };
  } catch (error) {
    throw new Error(`Failed to connect to tool '${toolName}' in package '${packageName}': ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Connect directly to a tool by URL
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