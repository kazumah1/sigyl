import { 
  connect, 
  connectDirect, 
  MCPConnectSDK, 
  searchPackages, 
  getPackage,
  invoke,
  registerMCP 
} from './src/index';

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
      searchResults.packages.forEach((pkg, index) => {
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
    const packageData = await getPackage('test-sdk-package', { registryUrl });
    console.log(`✅ Package: ${packageData.name}`);
    console.log(`   Description: ${packageData.description || 'No description'}`);
    console.log(`   Downloads: ${packageData.downloads_count}`);
    console.log(`   Tools: ${packageData.tools.map(t => t.tool_name).join(', ')}`);
    console.log(`   Deployments: ${packageData.deployments.length} active`);
  } catch (error) {
    console.log('❌ Get package failed:', error instanceof Error ? error.message : 'Unknown error');
  }

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
    }, undefined, { registryUrl });

    console.log('✅ Package registered:', newPackage.name);
    console.log('   ID:', newPackage.id);
    console.log('   Created at:', newPackage.created_at);
  } catch (error) {
    console.log('❌ Package registration failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Test 4: Search for our test package
  console.log('\n4️⃣ Testing search for our test package...');
  try {
    const searchResults = await searchPackages('sdk-test', ['test'], 5, 0, {
      registryUrl
    });
    console.log(`✅ Found ${searchResults.total} test packages`);
    searchResults.packages.forEach((pkg, index) => {
      console.log(`   ${index + 1}. ${pkg.name} - ${pkg.description || 'No description'}`);
    });
  } catch (error) {
    console.log('❌ Search failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Test 5: Using the SDK class
  console.log('\n5️⃣ Testing SDK class...');
  try {
    const sdk = new MCPConnectSDK({
      registryUrl,
      timeout: 15000
    });

    // Get all packages
    const allPackages = await sdk.getAllPackages();
    console.log(`✅ SDK found ${allPackages.length} total packages`);

    // Try to get details of the first package
    if (allPackages.length > 0) {
      const firstPackage = allPackages[0];
      console.log(`📦 Getting details for ${firstPackage.name}...`);
      
      try {
        const details = await sdk.getPackage(firstPackage.name);
        console.log(`   Tools: ${details.tools.map(t => t.tool_name).join(', ')}`);
        console.log(`   Deployments: ${details.deployments.length}`);
      } catch (error) {
        console.log(`   Failed to get details: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  } catch (error) {
    console.log('❌ SDK class test failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Test 6: Test with a mock tool URL (this will fail but shows the error handling)
  console.log('\n6️⃣ Testing direct tool connection (expected to fail)...');
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

  console.log('\n🎉 Realistic SDK testing completed!');
  console.log('\n💡 Note: Some tests are expected to fail because:');
  console.log('   - No actual MCP tools are deployed yet');
  console.log('   - External URLs don\'t exist');
  console.log('   - This is testing the SDK functionality, not the tools themselves');
}

// Run the tests
testRealisticSDK().catch(console.error); 