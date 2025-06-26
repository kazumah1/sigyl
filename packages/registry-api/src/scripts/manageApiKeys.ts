#!/usr/bin/env node

import { APIKeyService } from '../services/apiKeyService';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createUser() {
  console.log('\n=== Create New User ===');
  
  const email = await question('Email: ');
  const name = await question('Name: ');
  const githubId = await question('GitHub ID (optional): ') || undefined;

  try {
    const user = await APIKeyService.createOrGetUser(email, name, githubId);
    console.log(`✅ User created/retrieved: ${user.name} (${user.email})`);
    return user;
  } catch (error) {
    console.error('❌ Failed to create user:', error);
    return null;
  }
}

async function createAPIKey(userId: string) {
  console.log('\n=== Create New API Key ===');
  
  const name = await question('API Key Name: ');
  const permissionsInput = await question('Permissions (read,write,admin - comma separated): ');
  const expiresAt = await question('Expires at (YYYY-MM-DD or leave empty for no expiration): ') || undefined;

  const permissions = permissionsInput
    .split(',')
    .map(p => p.trim())
    .filter(p => ['read', 'write', 'admin'].includes(p));

  if (permissions.length === 0) {
    permissions.push('read');
  }

  try {
    const request: any = {
      name,
      permissions
    };
    
    if (expiresAt) {
      request.expires_at = expiresAt;
    }

    const { apiKey, keyData } = await APIKeyService.createAPIKey(userId, request);

    console.log('\n✅ API Key created successfully!');
    console.log(`Name: ${keyData.name}`);
    console.log(`Prefix: ${keyData.key_prefix}`);
    console.log(`Permissions: ${keyData.permissions.join(', ')}`);
    console.log(`Expires: ${keyData.expires_at || 'Never'}`);
    console.log(`\n🔑 API Key (save this securely - it won't be shown again):`);
    console.log(apiKey);
    
    return keyData;
  } catch (error) {
    console.error('❌ Failed to create API key:', error);
    return null;
  }
}

async function listAPIKeys(userId: string) {
  console.log('\n=== User API Keys ===');
  
  try {
    const keys = await APIKeyService.getUserAPIKeys(userId);
    
    if (keys.length === 0) {
      console.log('No API keys found for this user.');
      return;
    }

    keys.forEach((key, index) => {
      console.log(`\n${index + 1}. ${key.name}`);
      console.log(`   Prefix: ${key.key_prefix}`);
      console.log(`   Permissions: ${key.permissions.join(', ')}`);
      console.log(`   Status: ${key.is_active ? 'Active' : 'Inactive'}`);
      console.log(`   Created: ${new Date(key.created_at).toLocaleDateString()}`);
      if (key.last_used) {
        console.log(`   Last used: ${new Date(key.last_used).toLocaleDateString()}`);
      }
      if (key.expires_at) {
        console.log(`   Expires: ${new Date(key.expires_at).toLocaleDateString()}`);
      }
    });
  } catch (error) {
    console.error('❌ Failed to list API keys:', error);
  }
}

async function showAPIKeyStats(keyId: string) {
  console.log('\n=== API Key Statistics ===');
  
  try {
    const stats = await APIKeyService.getAPIKeyStats(keyId, 30);
    
    console.log(`Total requests (30 days): ${stats.total_requests}`);
    console.log(`Successful requests: ${stats.successful_requests}`);
    console.log(`Failed requests: ${stats.failed_requests}`);
    console.log(`Average response time: ${stats.average_response_time}ms`);
    console.log(`Last used: ${stats.last_used ? new Date(stats.last_used).toLocaleString() : 'Never'}`);
  } catch (error) {
    console.error('❌ Failed to get API key stats:', error);
  }
}

async function main() {
  console.log('🔑 Sigyl API Key Management Tool');
  console.log('================================');

  while (true) {
    console.log('\nOptions:');
    console.log('1. Create/Get User');
    console.log('2. Create API Key');
    console.log('3. List API Keys');
    console.log('4. Show API Key Stats');
    console.log('5. Exit');

    const choice = await question('\nSelect an option (1-5): ');

    switch (choice) {
      case '1':
        await createUser();
        break;
      case '2':
        const email = await question('User email: ');
        try {
          const user = await APIKeyService.createOrGetUser(email, 'Temporary', undefined);
          await createAPIKey(user.id);
        } catch (error) {
          console.error('❌ User not found. Please create the user first.');
        }
        break;
      case '3':
        const listEmail = await question('User email: ');
        try {
          const user = await APIKeyService.createOrGetUser(listEmail, 'Temporary', undefined);
          await listAPIKeys(user.id);
        } catch (error) {
          console.error('❌ User not found.');
        }
        break;
      case '4':
        const keyId = await question('API Key ID: ');
        await showAPIKeyStats(keyId);
        break;
      case '5':
        console.log('👋 Goodbye!');
        rl.close();
        process.exit(0);
      default:
        console.log('❌ Invalid option. Please select 1-5.');
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  rl.close();
  process.exit(0);
});

// Run the CLI if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ CLI error:', error);
    process.exit(1);
  });
} 