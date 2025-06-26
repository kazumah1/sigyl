import { APIKeyService } from '../services/apiKeyService';

async function testAPIKeySystem() {
  console.log('🧪 Testing API Key Management System...\n');

  try {
    // Test 1: Create a user
    console.log('1. Creating test user...');
    const user = await APIKeyService.createOrGetUser(
      'test@example.com',
      'Test User',
      'test-github-id'
    );
    console.log(`✅ User created: ${user.name} (${user.email})`);

    // Test 2: Create an API key
    console.log('\n2. Creating API key...');
    const { apiKey, keyData } = await APIKeyService.createAPIKey(user.id, {
      name: 'Test API Key',
      permissions: ['read', 'write'],
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    });
    console.log(`✅ API key created: ${keyData.name} (${keyData.key_prefix})`);
    console.log(`🔑 Full key: ${apiKey}`);

    // Test 3: Validate the API key
    console.log('\n3. Validating API key...');
    const authenticatedUser = await APIKeyService.validateAPIKey(apiKey);
    if (authenticatedUser) {
      console.log(`✅ API key validated: User ${authenticatedUser.user_id}`);
      console.log(`   Permissions: ${authenticatedUser.permissions.join(', ')}`);
    } else {
      throw new Error('API key validation failed');
    }

    // Test 4: Test permission checking
    console.log('\n4. Testing permissions...');
    const hasRead = APIKeyService.hasPermission(authenticatedUser.permissions, ['read']);
    const hasWrite = APIKeyService.hasPermission(authenticatedUser.permissions, ['write']);
    const hasAdmin = APIKeyService.hasPermission(authenticatedUser.permissions, ['admin']);
    console.log(`✅ Read permission: ${hasRead}`);
    console.log(`✅ Write permission: ${hasWrite}`);
    console.log(`✅ Admin permission: ${hasAdmin}`);

    // Test 5: Get user's API keys
    console.log('\n5. Listing user API keys...');
    const userKeys = await APIKeyService.getUserAPIKeys(user.id);
    console.log(`✅ Found ${userKeys.length} API key(s) for user`);

    // Test 6: Test invalid API key
    console.log('\n6. Testing invalid API key...');
    const invalidKey = await APIKeyService.validateAPIKey('invalid_key');
    if (!invalidKey) {
      console.log('✅ Invalid key correctly rejected');
    } else {
      throw new Error('Invalid key was accepted');
    }

    // Test 7: Test expired key (create one that expires in the past)
    console.log('\n7. Testing expired API key...');
    const { apiKey: expiredKey } = await APIKeyService.createAPIKey(user.id, {
      name: 'Expired Test Key',
      permissions: ['read'],
      expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
    });
    
    const expiredValidation = await APIKeyService.validateAPIKey(expiredKey);
    if (!expiredValidation) {
      console.log('✅ Expired key correctly rejected');
    } else {
      throw new Error('Expired key was accepted');
    }

    // Test 8: Test key prefix generation
    console.log('\n8. Testing key prefix generation...');
    const testKey = 'sk_1234567890abcdef1234567890abcdef';
    const prefix = APIKeyService.getKeyPrefix(testKey);
    console.log(`✅ Key prefix: ${prefix} (from ${testKey})`);

    // Test 9: Test key hashing
    console.log('\n9. Testing key hashing...');
    const hash1 = APIKeyService.hashAPIKey(apiKey);
    const hash2 = APIKeyService.hashAPIKey(apiKey);
    if (hash1 === hash2) {
      console.log('✅ Key hashing is consistent');
    } else {
      throw new Error('Key hashing is inconsistent');
    }

    // Test 10: Test usage logging
    console.log('\n10. Testing usage logging...');
    await APIKeyService.logUsage(
      keyData.id,
      '/api/v1/packages/search',
      'GET',
      200,
      150,
      '127.0.0.1',
      'Test Client/1.0'
    );
    console.log('✅ Usage logged successfully');

    // Test 11: Get usage statistics
    console.log('\n11. Getting usage statistics...');
    const stats = await APIKeyService.getAPIKeyStats(keyData.id, 1);
    console.log(`✅ Usage stats: ${stats.total_requests} requests, ${stats.average_response_time}ms avg`);

    console.log('\n🎉 All API key tests passed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - User: ${user.name} (${user.email})`);
    console.log(`   - API Key: ${keyData.name} (${keyData.key_prefix})`);
    console.log(`   - Permissions: ${keyData.permissions.join(', ')}`);
    console.log(`   - Expires: ${keyData.expires_at || 'Never'}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  testAPIKeySystem().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

export { testAPIKeySystem }; 