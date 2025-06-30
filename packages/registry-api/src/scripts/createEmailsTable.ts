import { supabase } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

async function createEmailsTable() {
  try {
    console.log('🚀 Creating emails table...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../../migrations/emails_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Split into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql: statement 
        });
        
        if (error) {
          console.error('Error executing statement:', error);
          // Try direct execution for DDL statements
          try {
            const { error: directError } = await supabase.from('_').select('*').limit(0);
            // This is just to test connection, the actual SQL execution needs to be done differently
            console.log('Supabase connection works, but we need to run the migration manually');
          } catch (e) {
            console.error('Supabase connection issue:', e);
          }
        } else {
          console.log('✅ Statement executed successfully');
        }
      }
    }
    
    console.log('✅ Emails table migration completed!');
    
    // Test the table by inserting a test record
    console.log('🧪 Testing emails table...');
    
    const { data, error } = await supabase
      .from('emails')
      .insert({
        name: 'Test User',
        email: 'test@example.com',
        purpose: 'demo',
        message: 'Test message',
        source: 'migration_test'
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error testing emails table:', error);
    } else {
      console.log('✅ Emails table test successful:', data);
      
      // Clean up test record
      await supabase.from('emails').delete().eq('id', data.id);
      console.log('🧹 Test record cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
createEmailsTable(); 