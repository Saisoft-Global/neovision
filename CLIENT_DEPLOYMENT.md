# 🌐 IDP Portal Client Deployment Guide

## 📋 Deployment Options

### 1. 🚀 **Render.com (Recommended for Clients)**
### 2. 🐧 **Ubuntu VPS (Full Control)**
### 3. 🐳 **Docker Anywhere**

---

## 🌟 **Option 1: Render.com Deployment (Easiest)**

### **Quick Deploy Button:**
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

### **Manual Setup:**

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up for free account

2. **Connect Repository**
   - Connect your GitHub repository
   - Or upload your code directly

3. **Deploy Configuration**
   - Render will automatically detect `render.yaml`
   - Creates web service, PostgreSQL, and Redis

4. **Access Your App**
   - Get your unique URL: `https://your-app-name.onrender.com`
   - API docs: `https://your-app-name.onrender.com/docs`

### **Render.com Features:**
- ✅ **Free tier available**
- ✅ **Automatic SSL certificates**
- ✅ **Auto-scaling**
- ✅ **Built-in monitoring**
- ✅ **Zero configuration**
- ✅ **Custom domains**

---

## 🐧 **Option 2: Ubuntu VPS Deployment**

### **Server Requirements:**
- Ubuntu 20.04+ (LTS recommended)
- 2GB RAM minimum (4GB recommended)
- 20GB disk space
- Root or sudo access

### **Quick Deploy:**
```bash
# On your Ubuntu server
curl -fsSL https://raw.githubusercontent.com/your-repo/idp-portal/main/deploy-ubuntu.sh | bash
```

### **Manual Deploy:**
```bash
# 1. Clone repository
git clone https://github.com/your-repo/idp-portal.git
cd idp-portal

# 2. Run deployment script
chmod +x deploy-ubuntu.sh
./deploy-ubuntu.sh

# 3. Access your application
curl http://$(curl -s ifconfig.me)
```

### **Ubuntu Features:**
- ✅ **Full server control**
- ✅ **Custom domain support**
- ✅ **SSL certificates (Let's Encrypt)**
- ✅ **Firewall configuration**
- ✅ **System monitoring**
- ✅ **Backup management**

---

## 🐳 **Option 3: Docker Deployment**

### **Any Linux Server:**
```bash
# 1. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 2. Clone and deploy
git clone https://github.com/your-repo/idp-portal.git
cd idp-portal

# 3. Configure environment
cp env.example .env
nano .env  # Edit with your settings

# 4. Deploy
docker-compose -f docker-compose.deploy.yml up -d
```

### **Docker Features:**
- ✅ **Portable deployment**
- ✅ **Easy updates**
- ✅ **Resource isolation**
- ✅ **Quick rollback**
- ✅ **Multi-server scaling**

---

## 🎯 **Client Deployment Recommendations**

### **For Small Businesses:**
- **Use Render.com** - Zero maintenance, automatic updates
- **Cost**: Free tier or $7/month
- **Setup time**: 5 minutes

### **For Enterprises:**
- **Use Ubuntu VPS** - Full control, custom configurations
- **Cost**: $10-50/month depending on server size
- **Setup time**: 30 minutes

### **For Developers:**
- **Use Docker** - Easy development, testing, production
- **Cost**: Varies by hosting provider
- **Setup time**: 15 minutes

---

## 📊 **Deployment Comparison**

| Feature | Render.com | Ubuntu VPS | Docker |
|---------|------------|------------|--------|
| **Setup Time** | 5 min | 30 min | 15 min |
| **Maintenance** | None | Manual | Low |
| **Cost** | Free-$25/mo | $10-50/mo | Variable |
| **Control** | Limited | Full | Medium |
| **Scaling** | Automatic | Manual | Manual |
| **SSL** | Auto | Manual | Manual |
| **Monitoring** | Built-in | Manual | Manual |

---

## 🔧 **Post-Deployment Configuration**

### **1. Domain Setup (Optional)**
```bash
# For Ubuntu VPS
sudo certbot --nginx -d your-domain.com

# Update CORS_ORIGINS in .env
CORS_ORIGINS=https://your-domain.com
```

### **2. Email Configuration**
```env
# Add to .env file
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### **3. File Storage**
```env
# Configure file upload limits
MAX_FILE_SIZE=50MB
ALLOWED_FILE_TYPES=pdf,jpg,jpeg,png,doc,docx,txt
```

---

## 🛡️ **Security Configuration**

### **Production Security Checklist:**
- [ ] Change default passwords
- [ ] Enable SSL/HTTPS
- [ ] Configure firewall
- [ ] Set up monitoring
- [ ] Enable backups
- [ ] Update regularly

### **Firewall Rules (Ubuntu):**
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

---

## 📈 **Monitoring & Maintenance**

### **Health Checks:**
```bash
# Check application health
curl https://your-domain.com/health

# Check database
docker-compose -f docker-compose.deploy.yml exec postgres pg_isready

# Check Redis
docker-compose -f docker-compose.deploy.yml exec redis redis-cli ping
```

### **Log Monitoring:**
```bash
# View application logs
docker-compose -f docker-compose.deploy.yml logs -f

# View system logs (Ubuntu)
sudo journalctl -u idp-portal -f
```

### **Backup Database:**
```bash
# Create backup
docker-compose -f docker-compose.deploy.yml exec postgres pg_dump -U neocaptured_user neocaptured_db > backup.sql

# Restore backup
docker-compose -f docker-compose.deploy.yml exec -T postgres psql -U neocaptured_user neocaptured_db < backup.sql
```

---

## 🚀 **Quick Start Commands**

### **Render.com:**
1. Fork repository
2. Connect to Render
3. Deploy automatically
4. Access your URL

### **Ubuntu VPS:**
```bash
curl -fsSL https://raw.githubusercontent.com/your-repo/idp-portal/main/deploy-ubuntu.sh | bash
```

### **Docker:**
```bash
git clone https://github.com/your-repo/idp-portal.git
cd idp-portal
docker-compose -f docker-compose.deploy.yml up -d
```

---

## 📞 **Support & Troubleshooting**

### **Common Issues:**

1. **Port Already in Use**
   ```bash
   sudo netstat -tulpn | grep :8000
   sudo systemctl stop conflicting-service
   ```

2. **Permission Denied**
   ```bash
   sudo chown -R $USER:$USER /opt/idp-portal
   chmod +x deploy-ubuntu.sh
   ```

3. **Out of Memory**
   ```bash
   # Increase swap space
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

### **Getting Help:**
- Check logs: `docker-compose logs -f`
- Verify environment: `cat .env`
- Test connectivity: `curl localhost:8000/health`
- Review documentation: `README.md`

---

## 🎉 **Success!**

After deployment, your IDP portal will be available at:
- **Frontend**: Your deployment URL
- **API**: Your deployment URL + `/api`
- **Documentation**: Your deployment URL + `/docs`

**Happy Document Processing! 📄✨**
