// Example: How a developer would use the Sigyl MCP SDK in their project

import { connect, searchPackages, getPackage } from '../src/index';
import type { MCPPackage, PackageWithDetails } from '../src/types';

async function myApp() {
  // 1. Discover available tools
  console.log('🔍 Discovering available text processing tools...');
  const textTools = await searchPackages('text', ['nlp'], 10);
  
  console.log(`Found ${textTools.total} text processing tools:`);
  textTools.packages.forEach((pkg: MCPPackage) => {
    console.log(`- ${pkg.name}: ${pkg.description}`);
  });

  // 2. Get details about a specific tool
  if (textTools.packages.length > 0) {
    const firstTool = textTools.packages[0];
    console.log(`\n📦 Getting details for ${firstTool.name}...`);
    
    const details: PackageWithDetails = await getPackage(firstTool.name);
    console.log(`Available tools: ${details.tools.map((t: any) => t.tool_name).join(', ')}`);
    console.log(`Active deployments: ${details.deployments.filter((d: any) => d.status === 'active').length}`);
  }

  // 3. Connect to and use a specific tool
  console.log('\n🛠️ Connecting to text summarizer...');
  try {
    const summarize = await connect('text-summarizer', 'summarize');
    
    const longText = `
      Artificial Intelligence (AI) is a branch of computer science that aims to create 
      intelligent machines that work and react like humans. Some of the activities 
      computers with artificial intelligence are designed for include speech recognition, 
      learning, planning, and problem solving. AI has been used in various fields 
      including healthcare, finance, transportation, and entertainment.
    `;
    
    const summary = await summarize({
      text: longText,
      maxLength: 50
    });
    
    console.log('📝 Summary:', summary);
  } catch (error) {
    console.log('❌ Failed to use summarizer:', error instanceof Error ? error.message : 'Unknown error');
  }
}

// Run the example
myApp().catch(console.error); 