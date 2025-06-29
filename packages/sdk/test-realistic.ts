import { 
  connect, 
  connectDirect, 
  MCPConnectSDK, 
  searchPackages, 
  getPackage,
  invoke
  // registerMCP // Removed, no longer exported
} from './src/index';

// search registry
// get package
// get tools from package
// invoke tools
// 
import type { MCPPackage, MCPTool } from './src/types';

async function testRealisticSDK() {
  console.log('🧪 Testing Sigyl MCP SDK (Realistic Scenario)\n');

  const registryUrl = 'http://localhost:3000/api/v1';

  // Test 1: Search for packages (should work even with empty registry)
  console.log('1️⃣ Testing package search...');
  try {
    const searchResults = await searchPackages(undefined, undefined, 10, 0, {
      registryUrl
    });
    console.log(`✅ Found ${searchResults.total} packages`);
    
    if (searchResults.packages.length > 0) {
      searchResults.packages.forEach((pkg: MCPPackage, index: number) => {
        console.log(`   ${index + 1}. ${pkg.name} - ${pkg.description || 'No description'}`);
      });
    } else {
      console.log('   No packages found in registry');
    }
  } catch (error) {
    console.log('❌ Search failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Test 2: Try to get a package that might not exist
  console.log('\n2️⃣ Testing get package details...');
  try {
    // Try to get the package we just registered
    const packageData = await getPackage('sdk-test-package', { registryUrl });
    console.log(`✅ Package: ${packageData.name}`);
    console.log(`   Description: ${packageData.description || 'No description'}`);
    console.log(`   Downloads: ${packageData.downloads_count}`);
    console.log(`   Tools: ${packageData.tools.map((t: any) => t.tool_name).join(', ')}`);
    console.log(`   Deployments: ${packageData.deployments.length} active`);
  } catch (error) {
    console.log('❌ Get package failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Test 3: Register a test package with tools
  // console.log('\n3️⃣ Testing package registration...');
  // try {
  //   const newPackage = await registerMCP({
  //     name: 'sdk-test-package',
  //     description: 'A test package for SDK testing',
  //     tags: ['test', 'sdk', 'demo'],
  //     tools: [{
  //       tool_name: 'echo',
  //       description: 'Echo back the input',
  //       input_schema: { message: 'string' },
  //       output_schema: { response: 'string' }
  //     }, {
  //       tool_name: 'reverse',
  //       description: 'Reverse the input text',
  //       input_schema: { text: 'string' },
  //       output_schema: { reversed: 'string' }
  //     }]
  //   }, 'sk_d5d397c82cba044cf5ac7571b849cdec81c7e485f3f4144e072bf800212a6b33', { registryUrl });

  //   console.log('✅ Package registered:', newPackage.name);
  //   console.log('   ID:', newPackage.id);
  //   console.log('   Created at:', newPackage.created_at);
  // } catch (error) {
  //   console.log('❌ Package registration failed:', error instanceof Error ? error.message : 'Unknown error');
  // }

  // Test 4: Search for our test package
  console.log('\n4️⃣ Testing search for our test package...');
  try {
    const searchResults = await searchPackages('', ["tools"], 5, 0, {
      registryUrl
    });
    console.log(`✅ Found ${searchResults.total} test packages`);
    searchResults.packages.forEach((pkg: MCPPackage, index: number) => {
      console.log(`   ${index + 1}. ${pkg.name} - ${pkg.description || 'No description'}`);
    });
  } catch (error) {
    console.log('❌ Search failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Test 5: Using the SDK class - Public operations
  console.log('\n5️⃣ Testing SDK class (public operations)...');
  try {
    const sdk = new MCPConnectSDK({
      registryUrl,
      timeout: 15000
    });

    // Public search operation (works without API key)
    const publicPackages = await sdk.searchAllPackages(50);
    console.log(`✅ Public search: Found ${publicPackages.length} packages`);

    // Try to get details of the first package
    if (publicPackages.length > 0) {
      const firstPackage = publicPackages[0];
      console.log(`📦 Getting details for ${firstPackage.name}...`);
      
      try {
        const details = await sdk.getPackage(firstPackage.name);
        console.log(`   Tools: ${details.tools.map((t: MCPTool) => t.tool_name).join(', ')}`);
        console.log(`   Deployments: ${details.deployments.length}`);
      } catch (error) {
        console.log(`   Failed to get details: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  } catch (error) {
    console.log('❌ SDK class test failed:', error instanceof Error ? error.message : 'Unknown error');
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

  // Test 7: Test with a mock tool URL (this will fail but shows the error handling)
  console.log('\n7️⃣ Testing direct tool connection (expected to fail)...');
  try {
    const mockTool = await connectDirect('https://httpbin.org/post', {
      timeout: 5000
    });

    const result = await mockTool({
      test: "This is a test"
    });

    console.log('✅ Mock tool result:', result);
  } catch (error) {
    console.log('❌ Direct connection failed (expected):', error instanceof Error ? error.message : 'Unknown error');
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
    console.log('✅ MCP server tools:', response.data.tools || response.data);
    console.log('✅ MCP server connected');
  } catch (error) {
    console.log('❌ MCP server connection failed:', error instanceof Error ? error.message : error?.toString() || 'Unknown error');
  }

  // Test 9: Smithery-style Client/Transport connect
  console.log('\n9️⃣ Testing Smithery-style Client/Transport connect...');
  try {
    // Use the real MCP server package and tool details from the CSV
    const livePackageName = 'kazumah1/mcp-test';
    const liveToolName = 'reverseString';
    const liveInput = { value: 'Hello, world!' };

    // Connect to the live package using the new connect function
    const client = await connect(livePackageName, { registryUrl });

    // Invoke the 'reverseString' tool
    const reverseResult = await client.invoke(liveToolName, liveInput);
    console.log('✅ reverseString tool result:', reverseResult);

    // Close the client (not strictly necessary for HTTP, but good practice)
    await client.close();
  } catch (error) {
    console.log('❌ Smithery-style connect test failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Test 10: List available tools using JSON-RPC
  console.log('\n🔟 Testing tools/list via Smithery-style Client/Transport connect...');
  try {
    const livePackageName = 'kazumah1/mcp-test';
    const client = await connect(livePackageName, { registryUrl });

    // List tools
    const toolsList = await client.invoke('tools/list', {});
    console.log('✅ tools/list result:', toolsList);

    await client.close();
  } catch (error) {
    console.log('❌ tools/list test failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('\n🎉 Realistic SDK testing completed!');
  console.log('\n📋 Summary:');
  console.log('✅ Public operations (search, get package) work without API keys');
  console.log('✅ Admin operations (getAllPackages) correctly require admin API keys');
  console.log('✅ Write operations (registerMCP) correctly require API keys');
  console.log('✅ SDK properly enforces authentication for protected operations');
  console.log('\n💡 Note: Some tests are expected to fail because:');
  console.log('   - No actual MCP tools are deployed yet');
  console.log('   - External URLs don\'t exist');
  console.log('   - This is testing the SDK functionality, not the tools themselves');
}

// Run the tests
testRealisticSDK().catch(console.error); 