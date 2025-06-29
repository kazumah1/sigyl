// Test 3: Register a test package with tools
console.log('\n3️⃣ Testing package registration...');
try {
  const newPackage = await registerMCP({
    name: 'sdk-test-package',
    description: 'A test package for SDK testing',
    tags: ['test', 'sdk', 'demo'],
    tools: [{
      tool_name: 'echo',
      description: 'Echo back the input',
      input_schema: { message: 'string' },
      output_schema: { response: 'string' }
    }, {
      tool_name: 'reverse',
      description: 'Reverse the input text',
      input_schema: { text: 'string' },
      output_schema: { reversed: 'string' }
    }]
  }, 'sk_d5d397c82cba044cf5ac7571b849cdec81c7e485f3f4144e072bf800212a6b33', { registryUrl });
} catch (error) {
  console.error('Error registering package:', error);
}

// Test 8: Test with an MCP server
console.log('\n8️⃣ Testing with an MCP server...');
try {
  // The MCP server exposes a /tools/list endpoint for tool discovery (per MCP spec)
  const mcpServerUrl = 'https://sigyl-mcp-kazumah1-mcp-test-lrzo3avokq-uc.a.run.app';
  const toolsListUrl = `${mcpServerUrl.replace(/\/$/, '')}/tools/list`;
  const response = await (await import('axios')).default.post(toolsListUrl, {}, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer sk_d5d397c82cba044cf5ac7571b849cdec81c7e485f3f4144e072bf800212a6b33'
    }
  });
} catch (error) {
  console.error('Error testing with MCP server:', error);
}

// Test 6: Using the SDK class - Admin operations (should fail without API key)
console.log('\n6️⃣ Testing SDK class (admin operations - should fail)...');
try {
  const sdk = new MCPConnectSDK({
    registryUrl,
    timeout: 15000,
    apiKey: 'sk_d5d397c82cba044cf5ac7571b849cdec81c7e485f3f4144e072bf800212a6b33'
  });

  // Admin operation (should succeed with API key)
  const allPackages = await sdk.getAllPackages();
  console.log(`✅ Admin operation succeeded with API key: ${allPackages.length} packages`);
} catch (error) {
  console.log('❌ Admin operation failed with API key:', error instanceof Error ? error.message : 'Unknown error');
} 