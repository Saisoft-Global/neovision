# 🐳 IDP Portal Docker Deployment Guide

## 📋 Prerequisites

- Docker (version 20.10+)
- Docker Compose (version 2.0+)
- At least 4GB RAM available
- At least 10GB disk space

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone <your-repo>
cd neocaptured-project
```

### 2. Configure Environment

```bash
# Copy environment template
cp env.example .env

# Edit environment variables
nano .env
```

**Required Environment Variables:**
```env
POSTGRES_PASSWORD=your_secure_password_here
SECRET_KEY=your_super_secret_key_here_change_in_production
```

### 3. Deploy

```bash
# Make deployment script executable (Linux/Mac)
chmod +x deploy.sh

# Deploy the application
./deploy.sh
```

**For Windows:**
```powershell
# Run deployment
docker-compose -f docker-compose.deploy.yml up --build -d
```

## 🌐 Access URLs

After successful deployment:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Database**: localhost:5432
- **Redis**: localhost:6379

## 🛠️ Management Commands

### View Logs
```bash
# All services
docker-compose -f docker-compose.deploy.yml logs -f

# Specific service
docker-compose -f docker-compose.deploy.yml logs -f backend
```

### Stop Services
```bash
docker-compose -f docker-compose.deploy.yml down
```

### Restart Services
```bash
docker-compose -f docker-compose.deploy.yml restart
```

### Update Services
```bash
# Clean rebuild
./deploy.sh --clean

# Or manually
docker-compose -f docker-compose.deploy.yml down
docker-compose -f docker-compose.deploy.yml up --build -d
```

### Scale Services
```bash
# Scale backend workers
docker-compose -f docker-compose.deploy.yml up --scale backend=3 -d
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_DB` | Database name | `neocaptured_db` |
| `POSTGRES_USER` | Database user | `neocaptured_user` |
| `POSTGRES_PASSWORD` | Database password | **Required** |
| `SECRET_KEY` | JWT secret key | **Required** |
| `VITE_API_URL` | Frontend API URL | `http://localhost:8000` |
| `FRONTEND_URL` | Backend CORS URL | `http://localhost:3000` |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:3000,http://localhost:5173` |

### Production Optimizations

1. **Use Environment Variables**: Never hardcode secrets
2. **Enable HTTPS**: Use SSL certificates with nginx
3. **Set Resource Limits**: Add memory/CPU limits to services
4. **Use Secrets Management**: Use Docker secrets for sensitive data
5. **Enable Logging**: Configure log rotation and monitoring

## 📊 Monitoring

### Health Checks

All services include health checks:

```bash
# Check backend health
curl http://localhost:8000/health

# Check frontend health
curl http://localhost:3000

# Check database
docker-compose -f docker-compose.deploy.yml exec postgres pg_isready

# Check Redis
docker-compose -f docker-compose.deploy.yml exec redis redis-cli ping
```

### Resource Usage

```bash
# View resource usage
docker stats

# View container details
docker-compose -f docker-compose.deploy.yml ps
```

## 🔒 Security

### Production Security Checklist

- [ ] Change default passwords
- [ ] Use strong SECRET_KEY
- [ ] Enable HTTPS with SSL certificates
- [ ] Configure firewall rules
- [ ] Use non-root users in containers
- [ ] Enable Docker content trust
- [ ] Regular security updates
- [ ] Backup database regularly

### SSL Configuration

To enable HTTPS:

1. Obtain SSL certificates
2. Place certificates in `nginx/ssl/` directory
3. Uncomment HTTPS server block in `nginx/nginx.conf`
4. Update `CORS_ORIGINS` to use HTTPS URLs

## 🗄️ Database Management

### Backup Database

```bash
# Create backup
docker-compose -f docker-compose.deploy.yml exec postgres pg_dump -U neocaptured_user neocaptured_db > backup.sql

# Restore backup
docker-compose -f docker-compose.deploy.yml exec -T postgres psql -U neocaptured_user neocaptured_db < backup.sql
```

### Database Migrations

```bash
# Run migrations (if needed)
docker-compose -f docker-compose.deploy.yml exec backend alembic upgrade head
```

## 🐛 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   netstat -tulpn | grep :8000
   
   # Stop conflicting services
   sudo systemctl stop apache2  # or nginx
   ```

2. **Permission Issues**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER .
   chmod +x deploy.sh
   ```

3. **Out of Memory**
   ```bash
   # Increase Docker memory limit
   # Or optimize container resource usage
   ```

4. **Database Connection Issues**
   ```bash
   # Check database logs
   docker-compose -f docker-compose.deploy.yml logs postgres
   
   # Restart database
   docker-compose -f docker-compose.deploy.yml restart postgres
   ```

### Debug Mode

Enable debug logging:

```env
# In .env file
ENVIRONMENT=development
DEBUG=true
```

## 📈 Scaling

### Horizontal Scaling

```bash
# Scale backend services
docker-compose -f docker-compose.deploy.yml up --scale backend=3 -d

# Scale with load balancer
docker-compose -f docker-compose.deploy.yml --profile nginx up -d
```

### Vertical Scaling

Add resource limits to services in `docker-compose.deploy.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'
```

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy
        run: |
          cp env.example .env
          echo "POSTGRES_PASSWORD=${{ secrets.POSTGRES_PASSWORD }}" >> .env
          echo "SECRET_KEY=${{ secrets.SECRET_KEY }}" >> .env
          docker-compose -f docker-compose.deploy.yml up -d
```

## 📞 Support

For issues and questions:

1. Check the logs: `docker-compose -f docker-compose.deploy.yml logs`
2. Verify environment variables
3. Check service health endpoints
4. Review this documentation

---

**Happy Deploying! 🚀**
