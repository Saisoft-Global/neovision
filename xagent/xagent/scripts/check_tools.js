import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://cybstyrslstfxlabiqyy.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5YnN0eXJzbHN0ZnhsYWJpcXl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2Njc0MTIsImV4cCI6MjA1MTI0MzQxMn0.4AOjyytEEKVLfQQdN26aG3oePfiJlu2UvaGawIq57rY'
);

async function checkTools() {
  console.log('🔍 Checking tools in database...');
  
  try {
    const { data: tools, error } = await supabase
      .from('tools')
      .select('id, name, type, is_active')
      .order('name');
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log('📊 Tools found:', tools.length);
    tools.forEach(tool => {
      console.log(`  ✅ ${tool.name} (${tool.type}) - ${tool.is_active ? 'Active' : 'Inactive'}`);
    });
    
    console.log('\n🔍 Checking organization_tools table...');
    const { data: orgTools, error: orgError } = await supabase
      .from('organization_tools')
      .select('*')
      .limit(5);
    
    if (orgError) {
      console.error('❌ Organization tools error:', orgError);
    } else {
      console.log('✅ Organization tools table exists');
      console.log('📊 Organization tools entries:', orgTools.length);
    }
    
    console.log('\n🎯 Summary:');
    console.log(`✅ Total tools: ${tools.length}`);
    console.log(`✅ Banking tools: ${tools.filter(t => t.name.includes('Bank')).length}`);
    console.log(`✅ Organization tools table: ${orgError ? 'Missing' : 'Exists'}`);
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

checkTools();
