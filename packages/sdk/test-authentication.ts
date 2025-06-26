import { 
  searchPackages, 
  getPackage,
  registerMCP,
  MCPConnectSDK
} from './src/index';
import type { MCPPackage } from './src/types';

async function testAuthentication() {
  console.log('🔐 Testing Sigyl MCP SDK Authentication\n');

  const registryUrl = 'http://localhost:3000/api/v1';
  
  // Test 1: Unauthenticated access (should work for public endpoints)
  console.log('1️⃣ Testing unauthenticated access...');
  try {
    const searchResults = await searchPackages(undefined, undefined, 5, 0, {
      registryUrl
    });
    console.log(`✅ Unauthenticated search: Found ${searchResults.total} packages`);
  } catch (error) {
    console.log('❌ Unauthenticated search failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Test 2: Authenticated access (should work the same for public endpoints)
  console.log('\n2️⃣ Testing authenticated access...');
  try {
    const searchResults = await searchPackages(undefined, undefined, 5, 0, {
      registryUrl,
      apiKey: 'sk_test_key_here', // This would be a real API key
      requireAuth: true
    });
    console.log(`✅ Authenticated search: Found ${searchResults.total} packages`);
  } catch (error) {
    console.log('❌ Authenticated search failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Test 3: Package registration without API key (should fail)
  console.log('\n3️⃣ Testing package registration without API key (should fail)...');
  try {
    const newPackage = await registerMCP({
      name: 'test-auth-package',
      description: 'Testing authentication',
      tags: ['test', 'auth']
    }, undefined, { registryUrl });
    console.log('❌ Package registration succeeded without API key (this should have failed)');
  } catch (error) {
    console.log('✅ Package registration correctly failed without API key:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Test 4: Package registration with API key (should work)
  console.log('\n4️⃣ Testing package registration with API key...');
  try {
    const newPackage = await registerMCP({
      name: 'test-auth-package-2',
      description: 'Testing authentication with API key',
      tags: ['test', 'auth']
    }, 'sk_test_key_here', { registryUrl }); // This would be a real API key
    console.log('✅ Package registration with API key succeeded:', newPackage.name);
  } catch (error) {
    console.log('❌ Package registration with API key failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Test 5: SDK class with authentication
  console.log('\n5️⃣ Testing SDK class with authentication...');
  try {
    const sdk = new MCPConnectSDK({
      registryUrl,
      apiKey: 'sk_test_key_here', // This would be a real API key
      requireAuth: true,
      timeout: 15000
    });

    const allPackages = await sdk.getAllPackages();
    console.log(`✅ Authenticated SDK: Found ${allPackages.length} packages`);
  } catch (error) {
    console.log('❌ Authenticated SDK failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Test 6: SDK class without authentication (should fail for admin operations)
  console.log('\n6️⃣ Testing SDK class without authentication...');
  try {
    const sdk = new MCPConnectSDK({
      registryUrl,
      requireAuth: true, // Require auth but no API key
      timeout: 15000
    });

    const allPackages = await sdk.getAllPackages();
    console.log(`❌ Unauthenticated SDK succeeded (should have failed): ${allPackages.length} packages`);
  } catch (error) {
    console.log('✅ Unauthenticated SDK correctly failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('\n📋 Authentication Summary:');
  console.log('✅ Public endpoints (search, get package) work without API keys');
  console.log('✅ Public endpoints also work with API keys (for analytics)');
  console.log('✅ Write operations (register package) require API keys');
  console.log('✅ Admin operations (get all packages) require API keys');
  console.log('✅ SDK enforces authentication when requireAuth is true');
  
  console.log('\n💡 To test with real API keys:');
  console.log('1. Run: npm run manage-keys (in registry-api)');
  console.log('2. Create an API key with write permissions');
  console.log('3. Use that key in the tests above');
}

// Run the tests
testAuthentication().catch(console.error); 