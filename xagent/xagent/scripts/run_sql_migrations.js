import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration (using the same as in the app)
const supabaseUrl = 'https://cybstyrslstfxlabiqyy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5YnN0eXJzbHN0ZnhsYWJpcXl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3MzQ0MDAsImV4cCI6MjA1MDMxMDQwMH0.cybstyrslstfxlabiqyy';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSQL(sql) {
  try {
    console.log('📄 Executing SQL...');
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`  🔧 Executing: ${statement.substring(0, 50)}...`);
        
        const { data, error } = await supabase
          .from('_sql')
          .select('*')
          .limit(1);
        
        // For now, let's just log what we would do
        console.log(`  ✅ Would execute: ${statement.substring(0, 100)}...`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ SQL execution error:', error);
    return false;
  }
}

async function runMigration(filename) {
  try {
    console.log(`\n📄 Running migration: ${filename}`);
    
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', filename);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log(`📝 SQL Content Preview:`);
    console.log(sql.substring(0, 200) + '...');
    
    // For now, let's just show what we would run
    console.log(`\n✅ Migration ${filename} is ready to run`);
    console.log(`📋 To run this migration:`);
    console.log(`1. Go to: https://supabase.com/dashboard/project/cybstyrslstfxlabiqyy`);
    console.log(`2. Navigate to: SQL Editor`);
    console.log(`3. Copy the content from: ${migrationPath}`);
    console.log(`4. Paste and click "Run"`);
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to read ${filename}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Database Migration Helper');
  console.log('================================');
  
  // List of migrations to run
  const migrations = [
    '20250121_fix_organization_tools.sql',
    '20250121_add_banking_tools.sql'
  ];
  
  console.log('\n📋 Required Migrations:');
  migrations.forEach((migration, index) => {
    console.log(`${index + 1}. ${migration}`);
  });
  
  console.log('\n🔧 Migration Instructions:');
  console.log('1. Open Supabase Dashboard: https://supabase.com/dashboard/project/cybstyrslstfxlabiqyy');
  console.log('2. Go to SQL Editor');
  console.log('3. Run each migration file in order');
  
  let successCount = 0;
  
  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (success) successCount++;
  }
  
  console.log(`\n📊 Migration Status:`);
  console.log(`✅ Ready to run: ${successCount}/${migrations.length}`);
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Run the SQL migrations in Supabase Dashboard');
  console.log('2. Refresh your frontend application');
  console.log('3. Test the HR agent - it should work without console errors');
}

main().catch(console.error);
