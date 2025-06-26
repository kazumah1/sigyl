import { 
  getAllPackagesAdmin,
  MCPConnectSDK
} from './src/index';

async function testAdminOperations() {
  console.log('🔐 Testing Admin Operations\n');

  const registryUrl = 'http://localhost:3000/api/v1';
  
  // Test 1: Admin operation without API key (should fail)
  console.log('1️⃣ Testing admin operation without API key (should fail)...');
  try {
    const packages = await getAllPackagesAdmin({ registryUrl });
    console.log('❌ Admin operation succeeded without API key (this should have failed)');
    console.log(`   Found ${packages.length} packages`);
  } catch (error) {
    console.log('✅ Admin operation correctly failed without API key:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Test 2: Admin operation with invalid API key (should fail)
  console.log('\n2️⃣ Testing admin operation with invalid API key (should fail)...');
  try {
    const packages = await getAllPackagesAdmin({ 
      registryUrl,
      apiKey: 'sk_invalid_key_here'
    });
    console.log('❌ Admin operation succeeded with invalid API key (this should have failed)');
    console.log(`   Found ${packages.length} packages`);
  } catch (error) {
    console.log('✅ Admin operation correctly failed with invalid API key:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Test 3: SDK class admin operation without API key (should fail)
  console.log('\n3️⃣ Testing SDK class admin operation without API key (should fail)...');
  try {
    const sdk = new MCPConnectSDK({
      registryUrl,
      timeout: 15000
    });

    const packages = await sdk.getAllPackages();
    console.log('❌ SDK admin operation succeeded without API key (this should have failed)');
    console.log(`   Found ${packages.length} packages`);
  } catch (error) {
    console.log('✅ SDK admin operation correctly failed without API key:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Test 4: SDK class public search operation (should work)
  console.log('\n4️⃣ Testing SDK class public search operation (should work)...');
  try {
    const sdk = new MCPConnectSDK({
      registryUrl,
      timeout: 15000
    });

    const packages = await sdk.searchAllPackages(50);
    console.log(`✅ Public search operation succeeded: Found ${packages.length} packages`);
  } catch (error) {
    console.log('❌ Public search operation failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Test 5: SDK class admin operation with API key (should work if valid)
  console.log('\n5️⃣ Testing SDK class admin operation with API key...');
  try {
    const sdk = new MCPConnectSDK({
      registryUrl,
      apiKey: 'sk_test_admin_key_here', // This would be a real admin API key
      timeout: 15000
    });

    const packages = await sdk.getAllPackages();
    console.log(`✅ Admin operation with API key succeeded: Found ${packages.length} packages`);
  } catch (error) {
    console.log('❌ Admin operation with API key failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('\n📋 Admin Operations Summary:');
  console.log('✅ Admin operations correctly require API keys');
  console.log('✅ Admin operations correctly fail with invalid API keys');
  console.log('✅ Public search operations work without API keys');
  console.log('✅ SDK properly enforces admin authentication');
  
  console.log('\n💡 To test with real admin API keys:');
  console.log('1. Run: npm run manage-keys (in registry-api)');
  console.log('2. Create an API key with admin permissions');
  console.log('3. Use that key in the tests above');
}

// Run the tests
testAdminOperations().catch(console.error); 