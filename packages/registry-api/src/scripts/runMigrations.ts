import { supabase } from '../config/database';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  console.log('Running API key management migrations...');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../../migrations/api_keys_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📋 Migration SQL loaded successfully');
    console.log('\n📄 Migration SQL Content:');
    console.log('=' .repeat(50));
    console.log(migrationSQL);
    console.log('=' .repeat(50));

    console.log('\n⚠️  Manual Migration Required');
    console.log('Since Supabase doesn\'t support direct SQL execution via RPC,');
    console.log('you need to run this migration manually:');
    console.log('\n1. Open your Supabase dashboard');
    console.log('2. Go to the SQL Editor');
    console.log('3. Copy and paste the SQL above');
    console.log('4. Execute the migration');
    console.log('\nAlternatively, you can use a database client like:');
    console.log('- pgAdmin');
    console.log('- DBeaver');
    console.log('- psql command line');
    console.log('- Supabase CLI');

    // Test if tables already exist
    console.log('\n🔍 Checking if tables already exist...');
    
    try {
      const { error: usersError } = await supabase
        .from('api_users')
        .select('count')
        .limit(1);
      
      if (!usersError) {
        console.log('✅ api_users table exists');
      } else {
        console.log('❌ api_users table does not exist');
      }
    } catch (error) {
      console.log('❌ api_users table does not exist');
    }

    try {
      const { error: keysError } = await supabase
        .from('api_keys')
        .select('count')
        .limit(1);
      
      if (!keysError) {
        console.log('✅ api_keys table exists');
      } else {
        console.log('❌ api_keys table does not exist');
      }
    } catch (error) {
      console.log('❌ api_keys table does not exist');
    }

    try {
      const { error: usageError } = await supabase
        .from('api_key_usage')
        .select('count')
        .limit(1);
      
      if (!usageError) {
        console.log('✅ api_key_usage table exists');
      } else {
        console.log('❌ api_key_usage table does not exist');
      }
    } catch (error) {
      console.log('❌ api_key_usage table does not exist');
    }

    console.log('\n📋 Next Steps:');
    console.log('1. Run the migration SQL manually');
    console.log('2. Run: npm run test:api-keys');
    console.log('3. Or run: npm run manage-keys');

  } catch (error) {
    console.error('❌ Migration script error:', error);
    process.exit(1);
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runMigrations();
}

export { runMigrations }; 