# Supabase Setup Guide for NeoCaptured IDP

## 🎯 Why Supabase is Perfect for Your IDP Solution

### ✅ **Built-in Features:**
- **PostgreSQL Database**: Enterprise-grade with JSONB support
- **Authentication**: JWT, OAuth, magic links, user management
- **Real-time**: Live updates for document processing
- **Storage**: File uploads for documents
- **API Generation**: Auto-generated REST and GraphQL APIs
- **Dashboard**: Visual database management
- **Free Tier**: 500MB database, 50,000 monthly active users

### ✅ **Perfect for IDP:**
- **Multi-tenant**: Organizations and users
- **Document Storage**: File uploads with metadata
- **Real-time Processing**: Live status updates
- **API Keys**: Built-in API management
- **Webhooks**: Real-time notifications

## 🚀 **Step-by-Step Setup**

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

-- API Keys table
CREATE TABLE api_keys (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    permissions JSONB DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
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

### **Step 4: Install Supabase Dependencies**

```bash
cd backend
pip install supabase
```

### **Step 5: Environment Variables**

Create `.env` file in backend directory:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: Service Role Key (for admin operations)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Other settings
SECRET_KEY=your-super-secret-key-change-in-production
ENVIRONMENT=development
```

### **Step 6: Update main.py**

```python
# Add to main.py
from routers import supabase_auth

# Add Supabase auth router
app.include_router(supabase_auth.router, prefix="/auth", tags=["authentication"])
```

### **Step 7: Test the Setup**

```bash
# Start the server
cd backend
python main.py

# Test registration
curl -X POST http://localhost:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123",
    "first_name": "Admin",
    "last_name": "User",
    "organization_name": "Test Organization"
  }'
```

## 🎯 **Supabase vs Traditional Database**

### **Traditional PostgreSQL Setup:**
```bash
# Requires:
- Install PostgreSQL
- Configure database
- Setup authentication
- Create API endpoints
- Handle security
- Manage migrations
```

### **Supabase Setup:**
```bash
# Just requires:
- Create project (5 minutes)
- Run SQL script (2 minutes)
- Add environment variables (1 minute)
- Start coding!
```

## 🚀 **Advanced Features**

### **Real-time Document Processing**
```javascript
// Frontend: Listen for document processing updates
const subscription = supabase
  .channel('documents')
  .on('postgres_changes', 
    { event: 'UPDATE', schema: 'public', table: 'documents' },
    (payload) => {
      console.log('Document processed:', payload.new);
      updateUI(payload.new);
    }
  )
  .subscribe();
```

### **File Storage for Documents**
```python
# Upload document to Supabase Storage
file_path = f"documents/{organization_id}/{document_id}.pdf"
supabase.storage.from_('documents').upload(file_path, file_content)

# Get public URL
url = supabase.storage.from_('documents').get_public_url(file_path)
```

### **Webhooks for Integrations**
```python
# Supabase automatically sends webhooks for:
# - User registration
# - Document processing completion
# - API key creation
# - Organization updates
```

## 📊 **Pricing Comparison**

### **Supabase Free Tier:**
- 500MB database
- 50,000 monthly active users
- 2GB bandwidth
- 5GB storage
- **Perfect for development and small production**

### **Supabase Pro ($25/month):**
- 8GB database
- 100,000 monthly active users
- 250GB bandwidth
- 100GB storage
- **Perfect for production**

### **Traditional Setup Costs:**
- PostgreSQL hosting: $10-50/month
- Authentication service: $10-30/month
- File storage: $5-20/month
- **Total: $25-100/month**

## 🎉 **Benefits of Supabase for Your IDP Solution**

### ✅ **Development Speed:**
- **5 minutes** to setup vs **5 hours** for traditional
- Built-in authentication
- Auto-generated APIs
- Real-time subscriptions

### ✅ **Production Ready:**
- Enterprise-grade PostgreSQL
- Automatic backups
- SSL/TLS encryption
- Global CDN

### ✅ **Scalability:**
- Automatic scaling
- Connection pooling
- Query optimization
- Monitoring dashboard

### ✅ **Developer Experience:**
- TypeScript support
- Real-time subscriptions
- Visual database editor
- API documentation

## 🚨 **Migration Strategy**

### **Phase 1: Setup Supabase (1 day)**
1. Create Supabase project
2. Setup database schema
3. Install dependencies
4. Test basic functionality

### **Phase 2: Integrate Authentication (2 days)**
1. Update frontend auth
2. Test user registration/login
3. Test organization management
4. Test API key management

### **Phase 3: Document Processing (2 days)**
1. Update document upload
2. Store documents in Supabase
3. Real-time processing updates
4. Test end-to-end flow

### **Phase 4: Production Deployment (1 day)**
1. Configure production environment
2. Setup monitoring
3. Deploy to production
4. Go live!

## 🎯 **Next Steps**

1. **Create Supabase project** (5 minutes)
2. **Run database schema** (2 minutes)
3. **Install dependencies** (1 minute)
4. **Update environment variables** (1 minute)
5. **Test authentication** (5 minutes)
6. **Start building features!**

**Total setup time: ~15 minutes vs ~5 hours for traditional setup!**

Would you like me to help you set up Supabase for your IDP solution?
