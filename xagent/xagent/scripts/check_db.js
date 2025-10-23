import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://cybstyrslstfxlabiqyy.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5YnN0eXJzbHN0ZnhsYWJpcXl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2Njc0MTIsImV4cCI6MjA1MTI0MzQxMn0.4AOjyytEEKVLfQQdN26aG3oePfiJlu2UvaGawIq57rY'
);

async function checkDatabase() {
  console.log('🔍 Checking database status...');
  
  try {
    // Check tools table
    console.log('\n📊 Checking tools table...');
    const { data: tools, error: toolsError } = await supabase
      .from('tools')
      .select('id, name, type, is_active')
      .limit(10);
    
    if (toolsError) {
      console.log('❌ Tools table error:', toolsError.message);
    } else {
      console.log(`✅ Tools table exists with ${tools.length} rows`);
      tools.forEach(tool => {
        console.log(`  - ${tool.name} (${tool.type}) - ${tool.is_active ? 'Active' : 'Inactive'}`);
      });
    }
    
    // Check organization_tools table
    console.log('\n📊 Checking organization_tools table...');
    const { data: orgTools, error: orgError } = await supabase
      .from('organization_tools')
      .select('*')
      .limit(5);
    
    if (orgError) {
      console.log('❌ Organization tools table error:', orgError.message);
    } else {
      console.log(`✅ Organization tools table exists with ${orgTools.length} rows`);
    }
    
    // Check if we need to run banking tools migration
    if (tools.length === 0) {
      console.log('\n⚠️  No tools found! Banking tools migration may not have run.');
      console.log('📋 Next steps:');
      console.log('1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/cybstyrslstfxlabiqyy');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Run the banking tools migration SQL');
    } else {
      console.log('\n✅ Database looks good!');
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  }
}

checkDatabase();
