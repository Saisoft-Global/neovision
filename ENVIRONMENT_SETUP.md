# Environment Variables Setup

## 🚀 **Step 3: Setup Environment Variables**

### **Create `.env` file in backend directory:**

```bash
# Create .env file
cd backend
touch .env  # or create manually
```

### **Add these variables to `.env`:**

```bash
# Supabase Configuration
# Get these from your Supabase Dashboard -> Settings -> API
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Optional: Service Role Key (for admin operations)
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Other settings
SECRET_KEY=your-super-secret-key-change-in-production
ENVIRONMENT=development

# Document Processing Settings
UPLOAD_DIR=uploads
TEMP_DIR=temp
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=pdf,jpg,jpeg,png,tiff,docx,xlsx,txt

# ML Model Settings
LAYOUT_MODEL_NAME=microsoft/layoutlmv3-base
DONUT_MODEL_NAME=naver-clova-ix/donut-base-finetuned-docvqa
OCR_LANG=en
CONFIDENCE_THRESHOLD=0.7

# API Settings
API_HOST=0.0.0.0
API_PORT=8000
API_WORKERS=1
DEBUG=True
```

### **How to Get Supabase Credentials:**

1. **Go to your Supabase Dashboard**
2. **Navigate to Settings → API**
3. **Copy:**
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (optional)

### **Example:**
```bash
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzNDU2Nzg5MCwiZXhwIjoxOTUwMTQzODkwfQ.example-signature
```

### **Important:**
- ✅ **Never commit** `.env` file to git
- ✅ **Change** `SECRET_KEY` in production
- ✅ **Use** service role key only for admin operations
