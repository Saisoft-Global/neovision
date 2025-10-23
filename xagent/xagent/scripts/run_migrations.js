const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = 'https://cybstyrslstfxlabiqyy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5YnN0eXJzbHN0ZnhsYWJpcXl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3MzQ0MDAsImV4cCI6MjA1MDMxMDQwMH0.cybstyrslstfxlabiqyy'; // This is the anon key

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration(filename) {
  try {
    console.log(`📄 Running migration: ${filename}`);
    
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', filename);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error(`❌ Error in ${filename}:`, error);
      return false;
    }
    
    console.log(`✅ Successfully ran: ${filename}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to run ${filename}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting database migrations...');
  
  // List of migrations to run
  const migrations = [
    '20250121_fix_organization_tools.sql',
    '20250121_add_banking_tools.sql'
  ];
  
  let successCount = 0;
  
  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (success) successCount++;
  }
  
  console.log(`\n📊 Migration Summary:`);
  console.log(`✅ Successful: ${successCount}/${migrations.length}`);
  console.log(`❌ Failed: ${migrations.length - successCount}/${migrations.length}`);
  
  if (successCount === migrations.length) {
    console.log('\n🎉 All migrations completed successfully!');
  } else {
    console.log('\n⚠️ Some migrations failed. Check the errors above.');
  }
}

main().catch(console.error);
