"""
Update .env file with new Supabase credentials
"""

env_content = """SUPABASE_URL=https://wwccqjaszhykqagfdnkg.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y2NxamFzemh5a3FhZ2ZkbmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NjM4OTcsImV4cCI6MjA3MzQzOTg5N30.Ug2BjsJACkDN63Fcwtt_H0DG-HiEtMzl6U6gPPrhkzU
SECRET_KEY=your-super-secret-key-change-in-production
ENVIRONMENT=development"""

with open('.env', 'w', encoding='utf-8') as f:
    f.write(env_content)

print("✅ .env file updated with new Supabase credentials!")
print("🔗 Project URL: https://wwccqjaszhykqagfdnkg.supabase.co")
