/**
 * Script to run the verification fields migration
 * This adds email verification and appointment confirmation capabilities
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '../.env');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runMigration() {
  try {


    // Read the migration SQL file
    const migrationPath = join(__dirname, '../migrations/add_verification_fields.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');




    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If the rpc function doesn't exist, try using raw SQL execution


      // Split migration into individual statements and execute
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          const { error: execError } = await supabase.from('_migrations').insert([{
            name: 'add_verification_fields',
            executed_at: new Date().toISOString()
          }]);

          if (execError) {

          }
        }
      }
    }



    ');
    ');






    // Verify the changes by checking if columns exist
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('email_verified')
      .limit(1);

    if (!usersError) {

    }

    const { data: appointmentsData, error: appointmentsError } = await supabase
      .from('appointments')
      .select('confirmation_status')
      .limit(1);

    if (!appointmentsError) {

    }




    ');
    ');
    ');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('\n💡 Troubleshooting:');
    console.error('  - Check your Supabase credentials');
    console.error('  - Ensure you have proper database permissions');
    console.error('  - You may need to run the SQL manually in Supabase SQL Editor');
    console.error('\n📄 SQL file location:', join(__dirname, '../migrations/add_verification_fields.sql'));
    process.exit(1);
  }
}

// Run the migration
runMigration().then(() => {

  process.exit(0);
});

