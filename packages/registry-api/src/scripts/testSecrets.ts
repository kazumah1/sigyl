import { supabase } from '../config/database';
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

function decrypt(text: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.SECRETS_ENCRYPTION_KEY || 'default-key', 'salt', 32);
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function testSecretsAPI() {
  console.log('🧪 Testing Secrets API...\n');

  try {
    // Test 1: Check if mcp_secrets table exists
    console.log('1. Checking if mcp_secrets table exists...');
    const { error: tableError } = await supabase
      .from('mcp_secrets')
      .select('count')
      .limit(1);
    
    if (tableError) {
      console.log('❌ Table does not exist or error:', tableError.message);
      console.log('💡 Run the migration: mcp_secrets_table.sql');
      return;
    }
    
    console.log('✅ mcp_secrets table exists');

    // Test 2: Test encryption/decryption
    console.log('\n2. Testing encryption/decryption...');
    const testSecret = 'sk-test123456789';
    const encrypted = encrypt(testSecret);
    const decrypted = decrypt(encrypted);
    
    if (testSecret === decrypted) {
      console.log('✅ Encryption/decryption working correctly');
    } else {
      console.log('❌ Encryption/decryption failed');
      console.log('Original:', testSecret);
      console.log('Decrypted:', decrypted);
    }

    // Test 3: Check if we can insert a test secret (if we have a test user)
    console.log('\n3. Testing database operations...');
    
    // Try to get a test user (you'll need to create one or use an existing one)
    const { data: users, error: usersError } = await supabase
      .from('api_users')
      .select('id')
      .limit(1);
    
    if (usersError || !users || users.length === 0) {
      console.log('⚠️  No test users found. Skipping database operation test.');
      console.log('💡 Create a test user first to test full functionality');
    } else {
      const testUserId = users[0].id;
      const testKey = 'TEST_API_KEY';
      const testValue = 'test-secret-value';
      const encryptedValue = encrypt(testValue);
      
      // Try to insert a test secret
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
        console.log('❌ Failed to insert test secret:', insertError.message);
      } else {
        console.log('✅ Successfully inserted test secret');
        console.log('   ID:', insertData.id);
        console.log('   Key:', insertData.key);
        
        // Clean up - delete the test secret
        const { error: deleteError } = await supabase
          .from('mcp_secrets')
          .delete()
          .eq('id', insertData.id);
        
        if (deleteError) {
          console.log('⚠️  Failed to clean up test secret:', deleteError.message);
        } else {
          console.log('✅ Cleaned up test secret');
        }
      }
    }

    console.log('\n🎉 Secrets API test completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Start the registry API: npm run dev');
    console.log('2. Test the API endpoints with Postman or curl');
    console.log('3. Implement the frontend UI');
    console.log('4. Integrate with deployment service');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSecretsAPI().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
}); 