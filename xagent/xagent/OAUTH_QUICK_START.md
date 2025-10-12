# 🚀 OAuth Quick Start Guide

## ⚡ **GET GMAIL & MICROSOFT 365 WORKING IN 5 MINUTES**

### **Step 1: Environment Variables**
Create `.env` file in project root:
```bash
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret_here
VITE_MICROSOFT_CLIENT_ID=your_microsoft_client_id_here
VITE_MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret_here
```

### **Step 2: Google Setup** (2 minutes)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project → Enable Gmail API
3. Credentials → OAuth 2.0 Client ID
4. Redirect URI: `http://localhost:5173/oauth/google/callback`
5. Copy Client ID & Secret to `.env`

### **Step 3: Microsoft Setup** (2 minutes)
1. Go to [Azure Portal](https://portal.azure.com/)
2. App registrations → New registration
3. API permissions → Microsoft Graph → Mail.Read, Mail.Send, Mail.ReadWrite, User.Read
4. Authentication → Redirect URI: `http://localhost:5173/oauth/microsoft/callback`
5. Certificates & secrets → New client secret
6. Copy Application ID & Secret to `.env`

### **Step 4: Test** (1 minute)
1. `npm run dev`
2. Go to Settings → Email → Add Account
3. Click "Connect Google Account" or "Connect Microsoft Account"
4. Grant permissions in popup
5. ✅ **DONE!** Your emails are now connected

## 🎉 **RESULT:**
- ✅ Gmail integration working
- ✅ Microsoft 365 integration working  
- ✅ AI can read your emails
- ✅ AI can send emails for you
- ✅ AI builds knowledge base from emails
- ✅ AI answers questions about email content

**Your email integration is now fully functional!** 🎊
