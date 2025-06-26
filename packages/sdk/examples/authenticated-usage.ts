// Example: How to use the Sigyl MCP SDK with authentication

import { connect, searchPackages, getPackage, registerMCP, MCPConnectSDK } from '../src/index';

async function authenticatedExample() {
  console.log('🔐 Authenticated SDK Usage Example\n');

  // Option 1: Using individual functions with API key
  const apiKey = 'sk_your_api_key_here'; // Get this from your Sigyl dashboard
  
  console.log('1️⃣ Searching packages with API key...');
  try {
    const results = await searchPackages('text', ['nlp'], 5, 0, {
      registryUrl: 'http://localhost:3000/api/v1',
      apiKey,
      requireAuth: true // This will require authentication for all operations
    });
    
    console.log(`✅ Found ${results.total} packages (authenticated)`);
  } catch (error) {
    console.log('❌ Search failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Option 2: Using SDK class with authentication
  console.log('\n2️⃣ Using SDK class with authentication...');
  try {
    const sdk = new MCPConnectSDK({
      registryUrl: 'http://localhost:3000/api/v1',
      apiKey,
      requireAuth: true,
      timeout: 15000
    });

    const allPackages = await sdk.getAllPackages();
    console.log(`✅ SDK found ${allPackages.length} packages (authenticated)`);
  } catch (error) {
    console.log('❌ SDK failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Option 3: Registering a package (always requires authentication)
  console.log('\n3️⃣ Registering a new package (requires auth)...');
  try {
    const newPackage = await registerMCP({
      name: 'my-authenticated-tool',
      description: 'A tool that requires authentication',
      tags: ['auth', 'demo'],
      tools: [{
        tool_name: 'secure-process',
        description: 'A secure processing tool',
        input_schema: { data: 'string' },
        output_schema: { result: 'string' }
      }]
    }, apiKey, {
      registryUrl: 'http://localhost:3000/api/v1'
    });

    console.log('✅ Package registered:', newPackage.name);
  } catch (error) {
    console.log('❌ Registration failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Option 4: Connecting to authenticated tools
  console.log('\n4️⃣ Connecting to authenticated tools...');
  try {
    const secureTool = await connect('my-authenticated-tool', 'secure-process', {
      registryUrl: 'http://localhost:3000/api/v1',
      apiKey,
      timeout: 10000
    });

    const result = await secureTool({ data: "Secure data" });
    console.log('✅ Secure tool result:', result);
  } catch (error) {
    console.log('❌ Tool connection failed:', error instanceof Error ? error.message : 'Unknown error');
  }
}

// Example of different authentication scenarios
async function authenticationScenarios() {
  console.log('\n🔑 Authentication Scenarios\n');

  // Scenario 1: Public access (no auth required)
  console.log('📖 Scenario 1: Public access');
  try {
    const publicResults = await searchPackages('text', undefined, 3, 0, {
      registryUrl: 'http://localhost:3000/api/v1',
      requireAuth: false // Explicitly allow public access
    });
    console.log(`✅ Public search found ${publicResults.total} packages`);
  } catch (error) {
    console.log('❌ Public search failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Scenario 2: Authenticated access
  console.log('\n🔐 Scenario 2: Authenticated access');
  try {
    const authResults = await searchPackages('text', undefined, 3, 0, {
      registryUrl: 'http://localhost:3000/api/v1',
      apiKey: 'sk_your_api_key_here',
      requireAuth: true
    });
    console.log(`✅ Authenticated search found ${authResults.total} packages`);
  } catch (error) {
    console.log('❌ Authenticated search failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Scenario 3: Missing API key when required
  console.log('\n❌ Scenario 3: Missing API key when required');
  try {
    await searchPackages('text', undefined, 3, 0, {
      registryUrl: 'http://localhost:3000/api/v1',
      requireAuth: true // Requires auth but no API key provided
    });
  } catch (error) {
    console.log('✅ Correctly caught missing API key:', error instanceof Error ? error.message : 'Unknown error');
  }
}

// Run the examples
async function main() {
  await authenticatedExample();
  await authenticationScenarios();
}

main().catch(console.error); 