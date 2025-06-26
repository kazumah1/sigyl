import { supabase } from '../config/database';
import { APIKeyService } from '../services/apiKeyService';
import crypto from 'crypto';

// Test encryption/decryption functions using modern crypto API
function encrypt(text: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.SECRETS_ENCRYPTION_KEY || 'default-key', 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

async function debugSecretsAPI() {
  console.log('🔍 Debugging Secrets API...\n');

  try {
    // Test 1: Check environment variable
    console.log('1. Checking SECRETS_ENCRYPTION_KEY...');
    const encryptionKey = process.env.SECRETS_ENCRYPTION_KEY || 'default-key';
    console.log(`✅ Encryption key: ${encryptionKey.substring(0, 10)}...`);

    // Test 2: Test encryption/decryption
    console.log('\n2. Testing encryption/decryption...');
    const testSecret = 'sk-test123456789';
    const encrypted = encrypt(testSecret);
    console.log(`✅ Encryption successful: ${encrypted.substring(0, 20)}...`);

    // Test 3: Check if mcp_secrets table exists
    console.log('\n3. Checking mcp_secrets table...');
    const { error: tableError } = await supabase
      .from('mcp_secrets')
      .select('count')
      .limit(1);
    
    if (tableError) {
      console.log('❌ Table error:', tableError.message);
      console.log('💡 Run the migration: fix_secrets_table.sql');
      return;
    }
    
    console.log('✅ mcp_secrets table exists');

    // Test 4: Check if api_users table exists and has users
    console.log('\n4. Checking api_users table...');
    const { data: users, error: usersError } = await supabase
      .from('api_users')
      .select('id, email, name')
      .limit(5);
    
    if (usersError) {
      console.log('❌ api_users table error:', usersError.message);
      return;
    }
    
    console.log(`✅ Found ${users?.length || 0} users in api_users table`);
    if (users && users.length > 0) {
      console.log('   Users:', users.map(u => `${u.name} (${u.email})`));
    }

    // Test 5: Test API key validation
    console.log('\n5. Testing API key validation...');
    const testApiKey = 'sk_659f2ecc1d5409e575b4b08397571331ee1c69e17a6dbd6914d6622256f14415';
    const authenticatedUser = await APIKeyService.validateAPIKey(testApiKey);
    
    if (authenticatedUser) {
      console.log(`✅ API key validated: User ID ${authenticatedUser.user_id}`);
      console.log(`   Permissions: ${authenticatedUser.permissions.join(', ')}`);
    } else {
      console.log('❌ API key validation failed');
      return;
    }

    // Test 6: Try to insert a secret manually
    console.log('\n6. Testing manual secret insertion...');
    const testUserId = authenticatedUser.user_id;
    const testKey = 'DEBUG_TEST_KEY';
    const testValue = 'debug-test-value';
    const encryptedValue = encrypt(testValue);
    
    console.log(`   User ID: ${testUserId}`);
    console.log(`   Key: ${testKey}`);
    console.log(`   Encrypted value: ${encryptedValue.substring(0, 20)}...`);
    
    const { data: insertData, error: insertError } = await supabase
      .from('mcp_secrets')
      .insert({
        user_id: testUserId,
        key: testKey,
        value: encryptedValue
      })
      .select('id, key, created_at')
      .single();
    
    if (insertError) {
      console.log('❌ Insert error:', insertError.message);
      console.log('   Code:', insertError.code);
      console.log('   Details:', insertError.details);
      console.log('   Hint:', insertError.hint);
    } else {
      console.log('✅ Successfully inserted test secret');
      console.log('   ID:', insertData.id);
      console.log('   Key:', insertData.key);
      
      // Clean up
      const { error: deleteError } = await supabase
        .from('mcp_secrets')
        .delete()
        .eq('id', insertData.id);
      
      if (deleteError) {
        console.log('⚠️  Failed to clean up:', deleteError.message);
      } else {
        console.log('✅ Cleaned up test secret');
      }
    }

    console.log('\n🎉 Debug completed!');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debugSecretsAPI().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('❌ Debug script failed:', error);
  process.exit(1);
}); 