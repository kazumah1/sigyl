// Example: How a developer would integrate the Sigyl MCP SDK into their application

import { MCPConnectSDK, searchPackages, connect } from '../src/index';

class MyApplication {
  private sdk: MCPConnectSDK;

  constructor() {
    // Initialize the SDK with your registry URL
    this.sdk = new MCPConnectSDK({
      registryUrl: 'http://localhost:3000/api/v1', // or your production URL
      timeout: 15000
    });
  }

  async discoverTextTools() {
    console.log('🔍 Discovering text processing tools...');
    
    try {
      // Search for text processing tools
      const results = await searchPackages('text', ['nlp'], 10);
      
      console.log(`Found ${results.total} text processing tools:`);
      results.packages.forEach(pkg => {
        console.log(`- ${pkg.name}: ${pkg.description}`);
      });
      
      return results.packages;
    } catch (error) {
      console.error('Failed to discover tools:', error);
      return [];
    }
  }

  async useTextSummarizer(text: string, maxLength: number = 100) {
    console.log('📝 Using text summarizer...');
    
    try {
      // Connect to the text summarizer tool
      const summarize = await connect('text-summarizer', 'summarize', {
        registryUrl: 'http://localhost:3000/api/v1'
      });
      
      // Use the tool
      const summary = await summarize({
        text,
        maxLength
      });
      
      console.log('Summary:', summary);
      return summary;
    } catch (error) {
      console.error('Failed to summarize text:', error);
      return null;
    }
  }

  async processWithMultipleTools(text: string) {
    console.log('🛠️ Processing text with multiple tools...');
    
    try {
      // Get all available packages
      const allPackages = await this.sdk.getAllPackages();
      
      const results: any[] = [];
      
      // Try to use tools from different packages
      for (const pkg of allPackages.slice(0, 3)) { // Limit to first 3 packages
        try {
          console.log(`Trying package: ${pkg.name}`);
          
          // Get package details
          const details = await this.sdk.getPackage(pkg.name);
          
          if (details.tools.length > 0) {
            // Try to connect to the first tool
            const toolName = details.tools[0].tool_name;
            if (toolName) {
              const tool = await this.sdk.connect(pkg.name, toolName);
              const result = await tool({ text });
              
              results.push({
                package: pkg.name,
                tool: toolName,
                result
              });
            }
          }
        } catch (error) {
          console.log(`Failed to use ${pkg.name}:`, error instanceof Error ? error.message : 'Unknown error');
        }
      }
      
      return results;
    } catch (error) {
      console.error('Failed to process with multiple tools:', error);
      return [];
    }
  }

  async registerMyTool() {
    console.log('📦 Registering a new tool...');
    
    try {
      const newPackage = await this.sdk.registerMCP({
        name: 'my-custom-tool',
        description: 'A custom tool for my application',
        tags: ['custom', 'application'],
        tools: [{
          tool_name: 'process',
          description: 'Process data for my application',
          input_schema: { data: 'string' },
          output_schema: { processed: 'string' }
        }]
      });
      
      console.log('✅ Tool registered:', newPackage.name);
      return newPackage;
    } catch (error) {
      console.error('Failed to register tool:', error);
      return null;
    }
  }
}

// Usage example
async function main() {
  const app = new MyApplication();
  
  // Discover available tools
  await app.discoverTextTools();
  
  // Use a specific tool
  const longText = `
    Artificial Intelligence (AI) is transforming the way we live and work. 
    From virtual assistants to autonomous vehicles, AI is becoming increasingly 
    integrated into our daily lives. Machine learning algorithms can now process 
    vast amounts of data to make predictions and decisions that were previously 
    impossible for humans to make quickly or accurately.
  `;
  
  await app.useTextSummarizer(longText, 50);
  
  // Process with multiple tools
  await app.processWithMultipleTools("Hello world");
  
  // Register a new tool
  await app.registerMyTool();
}

// Run the example
main().catch(console.error); 