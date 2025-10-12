# 📧 Email Provider Extension Guide

## 🎯 **How to Add New Email Providers (Zoho, Yahoo, ProtonMail, etc.)**

The email system is designed to be **easily extensible** for any email provider. Here's how to add support for new providers:

---

## 🏗️ **Architecture Overview**

### **Provider Pattern**
```
UnifiedEmailService
├── EmailConfigurationService (manages configs)
├── OAuthService (handles OAuth flows)
└── Provider Classes
    ├── GmailProvider
    ├── OutlookProvider
    ├── ZohoProvider ✅ (NEW)
    ├── YahooProvider ✅ (NEW)
    ├── GenericProvider ✅ (NEW)
    └── YourNewProvider
```

### **Two Integration Methods**
1. **OAuth Integration** - For providers with APIs (Gmail, Outlook, Zoho, Yahoo)
2. **IMAP/SMTP Integration** - For any provider supporting standard protocols

---

## 🚀 **Method 1: OAuth Integration (Recommended)**

### **Step 1: Create Provider Class**
```typescript
// src/services/email/providers/YourProvider.ts
export class YourProvider {
  private config: EmailConfiguration;
  private client: any;
  private oauthService: OAuthService;
  private useOAuth: boolean = false;

  constructor(config: EmailConfiguration) {
    this.config = config;
    this.oauthService = OAuthService.getInstance();
    this.useOAuth = !!(config.oauthAccessToken && config.oauthProvider === 'yourprovider');
  }

  async connect(): Promise<void> {
    if (this.useOAuth) {
      await this.connectOAuth();
    } else {
      await this.connectIMAPSMTP();
    }
  }

  // Implement: fetchEmails, sendEmail, markAsRead, addLabel
}
```

### **Step 2: Add OAuth Support**
```typescript
// src/services/email/OAuthService.ts

// Add to interfaces
export interface YourProviderOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

// Add to class
private yourProviderConfig: YourProviderOAuthConfig | null = null;

// Add methods
public generateYourProviderAuthUrl(state?: string): string { /* ... */ }
public async exchangeYourProviderCode(code: string): Promise<OAuthTokens> { /* ... */ }
```

### **Step 3: Update Configuration Types**
```typescript
// src/services/email/EmailConfigurationService.ts
provider: 'gmail' | 'outlook' | 'zoho' | 'yahoo' | 'yourprovider' | 'imap' | 'custom' | 'generic';
oauthProvider?: 'google' | 'microsoft' | 'zoho' | 'yahoo' | 'yourprovider';
```

### **Step 4: Register in Unified Service**
```typescript
// src/services/email/UnifiedEmailService.ts
import { YourProvider } from './providers/YourProvider';

// Add to switch statement
case 'yourprovider':
  provider = new YourProvider(config);
  break;
```

### **Step 5: Add OAuth Callback**
```typescript
// src/components/oauth/YourProviderOAuthCallback.tsx
const YourProviderOAuthCallback: React.FC = () => {
  // Handle OAuth redirect and token exchange
};
```

### **Step 6: Update UI**
```typescript
// src/components/settings/EmailConfigurationPanel.tsx
// Add provider button and OAuth handling
```

---

## 🔧 **Method 2: IMAP/SMTP Integration (Universal)**

### **For Any Email Provider**
Most email providers support IMAP/SMTP. Use the **GenericProvider**:

```typescript
// Example: ProtonMail
const config = {
  provider: 'generic',
  email: 'user@protonmail.com',
  imapHost: '127.0.0.1', // ProtonMail Bridge
  imapPort: 1143,
  imapSecure: true,
  smtpHost: '127.0.0.1',
  smtpPort: 1025,
  smtpSecure: true
};
```

### **Common Provider Settings**

| Provider | IMAP Host | IMAP Port | SMTP Host | SMTP Port |
|----------|-----------|-----------|-----------|-----------|
| **ProtonMail** | 127.0.0.1 | 1143 | 127.0.0.1 | 1025 |
| **Fastmail** | imap.fastmail.com | 993 | smtp.fastmail.com | 587 |
| **Tutanota** | imap.tutanota.com | 993 | smtp.tutanota.com | 587 |
| **Mailbox.org** | imap.mailbox.org | 993 | smtp.mailbox.org | 587 |
| **Custom Domain** | mail.yourdomain.com | 993 | mail.yourdomain.com | 587 |

---

## 📋 **Complete Implementation Checklist**

### **For OAuth Provider:**
- [ ] Create provider class (`YourProvider.ts`)
- [ ] Add OAuth methods to `OAuthService.ts`
- [ ] Update configuration types
- [ ] Register in `UnifiedEmailService.ts`
- [ ] Create OAuth callback component
- [ ] Add routes for OAuth callbacks
- [ ] Update UI in `EmailConfigurationPanel.tsx`
- [ ] Add environment variables guide

### **For IMAP/SMTP Provider:**
- [ ] Use existing `GenericProvider`
- [ ] Document IMAP/SMTP settings
- [ ] Test connection
- [ ] Add to provider list in UI

---

## 🌟 **Examples: Already Implemented**

### **✅ Zoho Mail**
- **OAuth Support**: ✅ Complete
- **IMAP/SMTP**: ✅ Fallback
- **Features**: Full API integration

### **✅ Yahoo Mail**
- **OAuth Support**: ✅ Complete
- **IMAP/SMTP**: ✅ Fallback
- **Features**: Full API integration

### **✅ Generic Provider**
- **IMAP/SMTP**: ✅ Universal support
- **Works with**: ProtonMail, Fastmail, Tutanota, custom domains

---

## 🔐 **Environment Variables**

Add to `.env` for new OAuth providers:
```bash
# Your Provider OAuth
VITE_YOURPROVIDER_CLIENT_ID=your_client_id_here
VITE_YOURPROVIDER_CLIENT_SECRET=your_client_secret_here
VITE_YOURPROVIDER_REDIRECT_URI=http://localhost:5173/oauth/yourprovider/callback
```

---

## 🧠 **AI Integration & Memory**

### **How AI Agents Use Email Data:**

1. **📥 Email Reading**
   ```typescript
   const emails = await unifiedEmailService.fetchEmails(userId, {
     since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
     limit: 100,
     unreadOnly: false
   });
   ```

2. **📊 Context Building**
   ```typescript
   // AI builds context from emails
   const emailContext = emails.map(email => ({
     subject: email.subject,
     content: email.content,
     sender: email.from.email,
     timestamp: email.timestamp,
     labels: email.labels
   }));
   ```

3. **💬 Intelligent Responses**
   ```typescript
   // AI can respond to emails
   const response = await aiAgent.generateEmailResponse({
     originalEmail: email,
     context: emailContext,
     userPreferences: userSettings
   });
   
   await unifiedEmailService.sendEmail(userId, response);
   ```

4. **🧠 Knowledge Base Integration**
   ```typescript
   // Emails automatically added to knowledge base
   await knowledgeBaseService.addDocuments(
     emails.map(email => ({
       content: `${email.subject}\n\n${email.content}`,
       metadata: {
         type: 'email',
         sender: email.from.email,
         timestamp: email.timestamp,
         provider: email.provider
       }
     }))
   );
   ```

---

## 🎯 **Memory & Context Continuation**

### **Cross-Agent Context Sharing:**
```typescript
// All agents share the same email context
const unifiedContext = await unifiedContextManager.getContext(userId);
const emailMemory = unifiedContext.emailContext;

// AI agents can reference email history
const response = await productivityAgent.processQuery(userQuery, {
  emailContext: emailMemory,
  documentContext: unifiedContext.documentContext,
  conversationHistory: unifiedContext.conversationHistory
});
```

### **Persistent Email Memory:**
- ✅ **Email content** stored in knowledge base
- ✅ **Sender relationships** tracked across emails
- ✅ **Email patterns** learned by AI
- ✅ **Context continuity** maintained across sessions
- ✅ **Multi-agent awareness** of email state

---

## 🚀 **Quick Start: Add New Provider**

1. **Copy existing provider** (e.g., `ZohoProvider.ts`)
2. **Update OAuth endpoints** and API calls
3. **Add to configuration types**
4. **Register in unified service**
5. **Test with real provider**

**Result**: Your new provider works seamlessly with the AI system! 🎉

---

## 📞 **Support**

The system is designed to be **provider-agnostic**. Any email service that supports:
- **OAuth 2.0** (preferred)
- **IMAP/SMTP** (universal)

Can be integrated quickly and will work with all AI features, memory, and context sharing.
