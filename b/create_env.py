"""
Create .env file with Supabase credentials
"""

env_content = """SUPABASE_URL=https://uhhioggazujdqsrcbwwx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoaGlvZ2dhenVqZHFzcmNid3d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2NzU0MjIsImV4cCI6MjA2NDI1MTQyMn0.EjDAAfwgXKLogZphP1NwGLeq8WXHypWmWKIdhAIauvc
SECRET_KEY=your-super-secret-key-change-in-production
ENVIRONMENT=development"""

with open('.env', 'w', encoding='utf-8') as f:
    f.write(env_content)

print("✅ .env file created successfully!")
