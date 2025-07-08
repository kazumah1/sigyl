// Example: How a developer would use the Sigyl MCP SDK in their project

import { connect, searchMCP, getMCP } from '../src/index';
import type { MCPPackage, PackageWithDetails } from '../src/types';

async function myApp() {
  // 1. Discover available tools
  console.log('🔍 Discovering available text processing tools...');
  const textTools = await searchMCP('text', ['nlp'], 10);
  
  console.log(`Found ${textTools.total} text processing tools:`