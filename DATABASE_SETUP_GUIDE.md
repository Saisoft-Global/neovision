# 🗄️ Database Setup Guide for NeoCaptured IDP

## 🎯 **Recommendation: Use Supabase**

Based on your IDP requirements, **Supabase is the optimal choice** for the following reasons:

### ✅ **Why Supabase for IDP:**

1. **🚀 Speed to Market**: 5 minutes setup vs 5 hours for traditional PostgreSQL
2. **🎯 Perfect for IDP**: Built-in multi-tenancy, real-time updates, file storage
3. **💰 Cost Effective**: Free tier + $25/month for production
4. **🔧 Developer Experience**: Visual dashboard, auto-generated APIs, TypeScript support
5. **🛡️ Production Ready**: Enterprise-grade PostgreSQL with automatic backups

---

## 🚀 **Option 1: Supabase Setup (Recommended)**

### **Step 1: Create Supabase Project**

1. **Go to [supabase.com](https://supabase.com)**
2. **Sign up/Sign in**
3. **Click "New Project"**
4. **Fill in details:**
   - Name: `neocaptured-idp`
   - Database Password: `your-secure-password`
   - Region: Choose closest to your users
5. **Click "Create new project"**
6. **Wait for setup (2-3 minutes)**

### **Step 2: Get Project Credentials**

1. **Go to Project Settings → API**
2. **Copy these values:**
   ```
   Project URL: https://your-project-id.supabase.co
   Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Service Role Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### **Step 3: Setup Database Schema**

1. **Go to SQL Editor in Supabase Dashboard**
2. **Run this SQL script:**

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table
CREATE TABLE documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id),
    user_id UUID REFERENCES public.users(id),
    name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    file_type VARCHAR(50),
    file_size BIGINT,
    status VARCHAR(20) DEFAULT 'processing',
    extracted_fields JSONB DEFAULT '{}',
    confidence_score DECIMAL(3,2),
    processing_method VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Processing Jobs table
CREATE TABLE processing_jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id),
    document_id UUID REFERENCES documents(id),
    status VARCHAR(20) DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Row Level Security (RLS) Policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;

-- Policies for organizations
CREATE POLICY "Users can view their organization" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid()
        )
    );

-- Policies for users
CREATE POLICY "Users can view organization members" ON public.users
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid()
        )
    );

-- Policies for documents
CREATE POLICY "Users can view organization documents" ON documents
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create documents" ON documents
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid()
        )
    );
```

### **Step 4: Configure Environment Variables**

Update your `render.yaml` with your Supabase credentials:

```yaml
envVars:
  - key: SUPABASE_URL
    value: https://your-project-id.supabase.co
  - key: SUPABASE_ANON_KEY
    value: your-supabase-anon-key
  - key: SUPABASE_SERVICE_ROLE_KEY
    value: your-supabase-service-role-key
  - key: DATABASE_TYPE
    value: supabase
```

### **Step 5: Test Supabase Connection**

```bash
cd backend
python -c "from config.database import check_database_connection; print(check_database_connection())"
```

---

## 🐘 **Option 2: Traditional PostgreSQL Setup**

### **Step 1: Use Render PostgreSQL Service**

Your `render.yaml` already includes PostgreSQL configuration:

```yaml
- type: pserv
  name: neocaptured-idp-db
  env: docker
  image: postgres:15-alpine
  plan: starter
  region: oregon
  envVars:
    - key: POSTGRES_DB
      value: neocaptured_idp
    - key: POSTGRES_USER
      value: neocaptured_user
    - key: POSTGRES_PASSWORD
      generateValue: true
```

### **Step 2: Configure Environment Variables**

```yaml
envVars:
  - key: DATABASE_TYPE
    value: postgresql
  - key: DATABASE_URL
    value: postgresql://neocaptured_user:password@neocaptured-idp-db:5432/neocaptured_idp
```

### **Step 3: Setup Database Schema**

Run the same SQL schema as above, but without Supabase-specific features.

---

## 🔄 **Migration Between Options**

### **From PostgreSQL to Supabase:**
1. Export data from PostgreSQL
2. Create Supabase project
3. Import data to Supabase
4. Update environment variables
5. Test connection

### **From Supabase to PostgreSQL:**
1. Export data from Supabase
2. Setup PostgreSQL instance
3. Import data to PostgreSQL
4. Update environment variables
5. Test connection

---

## 📊 **Feature Comparison**

| Feature | Supabase | PostgreSQL |
|---------|----------|------------|
| **Setup Time** | 5 minutes | 2-3 hours |
| **Authentication** | ✅ Built-in | ❌ Manual |
| **Real-time** | ✅ Built-in | ❌ Manual |
| **File Storage** | ✅ Built-in | ❌ Manual |
| **API Generation** | ✅ Auto | ❌ Manual |
| **Dashboard** | ✅ Visual | ❌ Command line |
| **Cost (Free)** | ✅ $0 | ❌ $0 |
| **Cost (Production)** | $25/month | $50+/month |

---

## 🎯 **Recommendation Summary**

### **Use Supabase Because:**

1. **⚡ Speed**: 5 minutes vs 5 hours setup
2. **🎯 Perfect Fit**: Built for your exact use case
3. **💰 Cost Effective**: $25/month vs $50-100/month
4. **🔧 Less Maintenance**: Managed service
5. **📈 Scalable**: Automatic scaling
6. **🛡️ Secure**: Enterprise-grade security
7. **📊 Monitoring**: Built-in analytics
8. **🔄 Real-time**: Perfect for document processing

### **Start with Supabase:**
```bash
# 1. Go to supabase.com
# 2. Create project (5 minutes)
# 3. Run SQL schema (2 minutes)
# 4. Update environment variables (1 minute)
# 5. Deploy to Render (automatic)
```

**Total time to production-ready IDP: 1 week vs 1 month with traditional setup!**

---

## 🚀 **Next Steps**

1. **Choose Supabase** (recommended)
2. **Create Supabase project** (5 minutes)
3. **Run database schema** (2 minutes)
4. **Update environment variables** (1 minute)
5. **Deploy to Render** (automatic)
6. **Start building features!**

**Ready to get started with Supabase?** 🚀
