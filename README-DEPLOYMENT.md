# 🌐 IDP Portal - Client Deployment Guide

## 🚀 **Quick Start for Clients**

### **Option 1: One-Click Deploy (Recommended)**
```bash
curl -fsSL https://raw.githubusercontent.com/your-repo/idp-portal/main/deploy-client.sh | bash
```

### **Option 2: Render.com (Cloud)**
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

---

## 📋 **What You Get**

### **🎯 Complete IDP Solution:**
- ✅ **Document Upload & Processing**
- ✅ **OCR Text Extraction**
- ✅ **Smart Field Detection**
- ✅ **Custom Model Training**
- ✅ **Interactive Annotation**
- ✅ **Template Management**
- ✅ **API Documentation**
- ✅ **User Feedback System**

### **🔧 Technical Features:**
- ✅ **Multi-format Support** (PDF, Images, Documents)
- ✅ **Handwritten Text Recognition**
- ✅ **Layout Analysis**
- ✅ **Pattern-based Extraction**
- ✅ **Machine Learning Models**
- ✅ **Real-time Processing**
- ✅ **RESTful API**

---

## 🌟 **Deployment Options**

### **1. 🖥️ Local Installation (Ubuntu/Linux)**
**Perfect for:** Internal use, development, testing

```bash
# One command deployment
curl -fsSL https://raw.githubusercontent.com/your-repo/idp-portal/main/deploy-client.sh | bash

# Access at: http://localhost
```

**Features:**
- ✅ Full local control
- ✅ No internet required after setup
- ✅ Custom configurations
- ✅ Easy updates

---

### **2. ☁️ Render.com (Cloud)**
**Perfect for:** Small businesses, quick deployment, zero maintenance

1. **Fork the repository**
2. **Connect to Render.com**
3. **Auto-deploy with `render.yaml`**
4. **Get your URL instantly**

**Features:**
- ✅ Zero maintenance
- ✅ Automatic SSL
- ✅ Auto-scaling
- ✅ Free tier available
- ✅ Custom domains

---

### **3. 🐳 Docker Anywhere**
**Perfect for:** Existing infrastructure, custom servers

```bash
# Clone and deploy
git clone https://github.com/your-repo/idp-portal.git
cd idp-portal
docker-compose -f docker-compose.production.yml up -d

# Access at: http://localhost
```

**Features:**
- ✅ Portable deployment
- ✅ Easy updates
- ✅ Resource isolation
- ✅ Multi-server support

---

## 🎯 **Client Use Cases**

### **📄 Document Processing:**
- **Invoice Processing** - Extract vendor, amount, date
- **Receipt Management** - Extract merchant, items, total
- **Contract Analysis** - Extract key terms, dates, parties
- **Form Processing** - Extract form fields automatically
- **Report Generation** - Process structured documents

### **🏢 Business Applications:**
- **Accounting** - Process invoices and receipts
- **HR Management** - Process employee documents
- **Legal** - Analyze contracts and legal documents
- **Healthcare** - Process medical forms and records
- **Real Estate** - Process property documents

### **🔧 Technical Integration:**
- **API Integration** - RESTful API for custom apps
- **Webhook Support** - Real-time processing notifications
- **Batch Processing** - Handle multiple documents
- **Custom Models** - Train on your specific documents
- **Template Management** - Create document templates

---

## 📊 **System Requirements**

### **Minimum Requirements:**
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB
- **OS**: Ubuntu 20.04+, macOS, Windows

### **Recommended for Production:**
- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Storage**: 50GB+ SSD
- **Network**: Stable internet connection

---

## 🛠️ **Management Commands**

### **Local Installation:**
```bash
# Start the portal
./start-idp-portal.sh

# Stop the portal
./stop-idp-portal.sh

# Update to latest version
./update-idp-portal.sh

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

### **Render.com:**
- **Automatic management**
- **Web dashboard**
- **Built-in monitoring**

### **Docker:**
```bash
# Start
docker-compose -f docker-compose.production.yml up -d

# Stop
docker-compose -f docker-compose.production.yml down

# Update
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up --build -d
```

---

## 🔧 **Configuration**

### **Environment Variables:**
```env
# Database
POSTGRES_DB=neocaptured_db
POSTGRES_USER=neocaptured_user
POSTGRES_PASSWORD=secure_password

# Security
SECRET_KEY=your_secret_key

# URLs
VITE_API_URL=http://localhost
FRONTEND_URL=http://localhost
CORS_ORIGINS=http://localhost

# Application
VITE_APP_NAME=IDP Portal
ENVIRONMENT=production
```

### **Custom Configuration:**
- **File upload limits**
- **Processing timeouts**
- **Model configurations**
- **API rate limits**
- **Logging levels**

---

## 📈 **Monitoring & Health**

### **Health Checks:**
```bash
# Application health
curl http://localhost/health

# API status
curl http://localhost/docs

# Database status
docker-compose -f docker-compose.production.yml exec postgres pg_isready
```

### **Logs:**
```bash
# Application logs
docker-compose -f docker-compose.production.yml logs -f

# Specific service logs
docker-compose -f docker-compose.production.yml logs -f app
```

---

## 🔒 **Security Features**

### **Built-in Security:**
- ✅ **HTTPS/SSL Support**
- ✅ **CORS Configuration**
- ✅ **Input Validation**
- ✅ **File Type Validation**
- ✅ **Rate Limiting**
- ✅ **Secure Headers**

### **Production Security:**
- ✅ **Environment-based Config**
- ✅ **Secure Defaults**
- ✅ **Non-root Containers**
- ✅ **Resource Limits**
- ✅ **Health Monitoring**

---

## 📞 **Support & Troubleshooting**

### **Common Issues:**

1. **Port Already in Use**
   ```bash
   sudo netstat -tulpn | grep :80
   sudo systemctl stop apache2  # or nginx
   ```

2. **Permission Denied**
   ```bash
   sudo chown -R $USER:$USER ~/idp-portal
   chmod +x *.sh
   ```

3. **Out of Memory**
   ```bash
   # Check memory usage
   free -h
   # Increase swap space if needed
   ```

### **Getting Help:**
- 📖 **Documentation**: `CLIENT_DEPLOYMENT.md`
- 🐛 **Issues**: GitHub Issues
- 💬 **Support**: Contact support team
- 📧 **Email**: support@yourcompany.com

---

## 🎉 **Success Checklist**

After deployment, verify:

- [ ] **Application loads** at http://localhost
- [ ] **API docs accessible** at http://localhost/docs
- [ ] **Health check passes** at http://localhost/health
- [ ] **Document upload works**
- [ ] **Processing functions correctly**
- [ ] **Model training available**
- [ ] **Feedback system operational**

---

## 🚀 **Next Steps**

1. **Test the application** with sample documents
2. **Train custom models** on your documents
3. **Configure templates** for your use cases
4. **Integrate with your systems** via API
5. **Set up monitoring** and backups
6. **Train your team** on the interface

---

## 📊 **Performance Tips**

### **Optimization:**
- **Use SSD storage** for better I/O
- **Allocate sufficient RAM** for ML models
- **Enable GPU acceleration** if available
- **Configure caching** for repeated operations
- **Monitor resource usage** regularly

### **Scaling:**
- **Horizontal scaling** with load balancer
- **Database optimization** for large datasets
- **CDN integration** for static assets
- **Microservices architecture** for complex needs

---

**🎯 Your IDP Portal is ready to revolutionize document processing!**

**📧 Need help? Contact us at support@yourcompany.com**
