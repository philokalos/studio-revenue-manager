# Deployment Guide

Comprehensive deployment guide for Studio Revenue Manager covering development, staging, and production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Development Deployment](#development-deployment)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [Environment Variables](#environment-variables)
- [Health Checks](#health-checks)
- [Monitoring](#monitoring)
- [Backup and Recovery](#backup-and-recovery)
- [Rollback Procedures](#rollback-procedures)

## Prerequisites

### Required Software

- **Node.js**: 18.x or higher
  ```bash
  node --version  # Should output v18.x.x or higher
  ```

- **PostgreSQL**: 15 or higher
  ```bash
  psql --version  # Should output 15.x or higher
  ```

- **npm**: 9.x or higher
  ```bash
  npm --version  # Should output 9.x.x or higher
  ```

- **Docker**: 20.x or higher (for containerized deployment)
  ```bash
  docker --version
  docker-compose --version
  ```

### System Requirements

**Development Environment:**
- RAM: 4GB minimum, 8GB recommended
- Disk Space: 2GB minimum
- CPU: 2 cores minimum

**Production Environment:**
- RAM: 8GB minimum, 16GB recommended
- Disk Space: 20GB minimum (with logs and backups)
- CPU: 4 cores minimum
- Network: Stable internet connection with static IP (recommended)

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/philokalos/studio-revenue-manager.git
cd studio-revenue-manager
```

### 2. Install Dependencies

```bash
# Install all workspace dependencies
npm install

# Verify installation
npm run type-check
```

### 3. Configure Environment Variables

```bash
# Copy environment templates
cp .env.example .env
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env
```

See [Environment Variables](#environment-variables) section for detailed configuration.

## Database Setup

### Local PostgreSQL Setup

#### Option 1: Manual Installation

**macOS (Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
createdb studio_revenue_manager
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql-15 postgresql-contrib-15
sudo systemctl start postgresql
sudo -u postgres createdb studio_revenue_manager
```

**Windows:**
Download and install from [PostgreSQL Downloads](https://www.postgresql.org/download/windows/)

#### Option 2: Docker PostgreSQL

```bash
docker run --name postgres-studio \
  -e POSTGRES_DB=studio_revenue_manager \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  -v postgres-data:/var/lib/postgresql/data \
  -d postgres:15-alpine
```

### Database Configuration

1. **Create database user** (if not using postgres user):
```sql
CREATE USER studio_admin WITH PASSWORD 'your_secure_password';
ALTER USER studio_admin WITH SUPERUSER;
```

2. **Grant permissions**:
```sql
GRANT ALL PRIVILEGES ON DATABASE studio_revenue_manager TO studio_admin;
```

3. **Enable required extensions**:
```sql
\c studio_revenue_manager
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search
```

### Run Migrations

```bash
# Run all migrations
npm run db:migrate

# Check migration status
cd packages/backend && npm run db:migrate:status

# Seed database (optional, for development)
npm run db:seed
```

### Database Backup

```bash
# Create backup
pg_dump studio_revenue_manager > backup_$(date +%Y%m%d_%H%M%S).sql

# Or use the provided script
cd packages/backend && npm run db:backup
```

## Development Deployment

### Quick Start

```bash
# Start both backend and frontend
npm run dev
```

This will start:
- Backend API: http://localhost:3000
- Frontend: http://localhost:5173
- API Documentation: http://localhost:3000/api-docs

### Individual Services

```bash
# Backend only
npm run dev:backend

# Frontend only
npm run dev:frontend
```

### Development with Hot Reload

The development setup includes:
- **Backend**: Nodemon with tsx for TypeScript hot reload
- **Frontend**: Vite HMR (Hot Module Replacement)

## Docker Deployment

### Docker Compose Setup

#### 1. Configure Environment

```bash
# Copy Docker environment template
cp .env.docker.example .env.docker

# Edit .env.docker with your configuration
nano .env.docker
```

#### 2. Build and Start Services

```bash
# Build images
docker-compose build

# Start all services in detached mode
docker-compose up -d

# View logs
docker-compose logs -f
```

#### 3. Initialize Database

```bash
# Run migrations
docker-compose exec backend npm run db:migrate

# Seed database (optional)
docker-compose exec backend npm run db:seed
```

#### 4. Verify Deployment

```bash
# Check service health
docker-compose ps

# Test backend health endpoint
curl http://localhost:3000/health

# Check database connectivity
docker-compose exec postgres psql -U postgres -d studio_revenue_manager -c "SELECT version();"
```

### Docker Commands Reference

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v

# Restart specific service
docker-compose restart backend

# View service logs
docker-compose logs backend -f

# Execute command in container
docker-compose exec backend sh

# Scale services (if needed)
docker-compose up -d --scale backend=2
```

## Production Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production` in environment variables
- [ ] Configure strong JWT secrets (32+ characters)
- [ ] Set up SSL/TLS certificates
- [ ] Configure production database credentials
- [ ] Set up database backups (automated)
- [ ] Configure logging with rotation
- [ ] Set up monitoring and alerting
- [ ] Configure firewall rules
- [ ] Set up reverse proxy (nginx/Apache)
- [ ] Enable rate limiting
- [ ] Configure CORS for production domain
- [ ] Set up CI/CD pipeline
- [ ] Configure error tracking (Sentry, etc.)

### Build for Production

```bash
# Build all packages
npm run build

# Test production build locally
NODE_ENV=production npm start
```

### Deployment Options

#### Option 1: Traditional VPS/Dedicated Server

**1. Server Setup:**
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql-15

# Install PM2 for process management
sudo npm install -g pm2
```

**2. Deploy Application:**
```bash
# Clone and build
git clone https://github.com/philokalos/studio-revenue-manager.git
cd studio-revenue-manager
npm install
npm run build

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**3. Configure Nginx:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Frontend static files
    location / {
        root /var/www/studio-revenue-manager/packages/frontend/dist;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /var/www/studio-revenue-manager/packages/frontend/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Option 2: Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy backend
cd packages/backend
railway up

# Set environment variables via Railway dashboard
# DATABASE_URL will be provided automatically for PostgreSQL plugin
```

#### Option 3: Render

**Backend (Web Service):**
1. Connect GitHub repository
2. Build Command: `cd packages/backend && npm install && npm run build`
3. Start Command: `cd packages/backend && npm start`
4. Add PostgreSQL database
5. Set environment variables in dashboard

**Frontend (Static Site):**
1. Build Command: `cd packages/frontend && npm install && npm run build`
2. Publish Directory: `packages/frontend/dist`
3. Set `VITE_API_URL` environment variable

#### Option 4: AWS/Azure/GCP

Follow platform-specific deployment guides:
- **AWS**: Deploy using Elastic Beanstalk, ECS, or EC2
- **Azure**: Use App Service or Container Instances
- **GCP**: Deploy via App Engine or Cloud Run

### Post-Deployment Steps

```bash
# 1. Run database migrations
npm run db:migrate

# 2. Verify health check
curl https://yourdomain.com/health

# 3. Test API endpoints
curl https://yourdomain.com/api/

# 4. Monitor logs
pm2 logs  # for PM2
docker-compose logs -f  # for Docker
```

## Environment Variables

### Backend Configuration

#### Required Variables

```bash
# Server Configuration
NODE_ENV=production                    # production | development | test
PORT=3000                             # Server port

# Database Configuration
DB_HOST=localhost                     # Database host
DB_PORT=5432                         # Database port
DB_NAME=studio_revenue_manager       # Database name
DB_USER=postgres                     # Database user
DB_PASSWORD=your_secure_password     # Database password (REQUIRED)
DB_SSL=true                          # Enable SSL for production

# Authentication
JWT_SECRET=your_jwt_secret_min_32_chars              # REQUIRED, 32+ chars
JWT_EXPIRES_IN=1h                                    # Token expiration
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars  # REQUIRED, 32+ chars
JWT_REFRESH_EXPIRES_IN=7d                           # Refresh token expiration
```

#### Optional Variables

```bash
# Security
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
RATE_LIMIT_WHITELIST=127.0.0.1,::1

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@yourdomain.com

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback

# Google Calendar API
GOOGLE_CALENDAR_API_KEY=your_api_key
GOOGLE_SERVICE_ACCOUNT_EMAIL=service@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# File Upload
MAX_FILE_SIZE=5242880  # 5MB in bytes
UPLOAD_DIR=./uploads
```

### Frontend Configuration

```bash
# API URL (REQUIRED)
VITE_API_URL=https://api.yourdomain.com  # Production API URL
# VITE_API_URL=http://localhost:3000     # Development API URL
```

### Generating Secure Secrets

```bash
# Generate JWT secrets (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate strong password
openssl rand -base64 32
```

## Health Checks

### Endpoints

```bash
# System health
GET /health

# Database metrics
GET /api/metrics/db

# Performance metrics
GET /api/monitoring/metrics
```

### Health Check Script

```bash
#!/bin/bash
# health-check.sh

BACKEND_URL="http://localhost:3000"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $BACKEND_URL/health)

if [ $RESPONSE -eq 200 ]; then
    echo "✅ Backend is healthy"
    exit 0
else
    echo "❌ Backend is unhealthy (HTTP $RESPONSE)"
    exit 1
fi
```

### Kubernetes Health Probes

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Monitoring

### Logs

**Backend Logs Location:**
- Development: `packages/backend/logs/`
- Production: Configure log aggregation (e.g., CloudWatch, Datadog)

**Log Files:**
- `error-YYYY-MM-DD.log`: Error logs only
- `combined-YYYY-MM-DD.log`: All logs
- Daily rotation with 30-day retention

**View Logs:**
```bash
# Tail error logs
tail -f packages/backend/logs/error-$(date +%Y-%m-%d).log

# View combined logs
tail -f packages/backend/logs/combined-$(date +%Y-%m-%d).log

# Docker logs
docker-compose logs -f backend
```

### Performance Monitoring

**Built-in Metrics:**
- Request count
- Response times
- Error rates
- Database query performance
- Connection pool status

**Access Metrics:**
```bash
curl http://localhost:3000/api/monitoring/metrics
```

**Recommended Monitoring Tools:**
- **Application**: New Relic, Datadog, or PM2 Plus
- **Infrastructure**: CloudWatch, Prometheus + Grafana
- **Error Tracking**: Sentry
- **Uptime**: UptimeRobot, Pingdom

## Backup and Recovery

### Database Backup

**Automated Backup Script:**
```bash
#!/bin/bash
# backup-db.sh

BACKUP_DIR="/var/backups/studio-revenue"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

mkdir -p $BACKUP_DIR

# Create backup
pg_dump -h localhost -U postgres studio_revenue_manager > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Delete backups older than 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

**Schedule with cron:**
```cron
# Run daily at 2 AM
0 2 * * * /path/to/backup-db.sh
```

### Database Restore

```bash
# Restore from backup
gunzip backup_20250110_020000.sql.gz
psql -h localhost -U postgres -d studio_revenue_manager < backup_20250110_020000.sql
```

### Application Backup

```bash
# Backup uploads and logs
tar -czf backup_files_$(date +%Y%m%d).tar.gz \
  packages/backend/uploads \
  packages/backend/logs
```

## Rollback Procedures

### Database Rollback

```bash
# Rollback last migration
npm run db:rollback

# Rollback to specific version
cd packages/backend
tsx src/db/rollback.ts --to 20250110000000
```

### Application Rollback

**PM2:**
```bash
# List previous versions
pm2 list

# Restart from previous version
git checkout previous-tag
npm install
npm run build
pm2 restart all
```

**Docker:**
```bash
# Rollback to previous image
docker-compose down
docker-compose pull  # Get previous image from registry
docker-compose up -d
```

**Railway/Render:**
- Use platform dashboard to rollback to previous deployment

### Emergency Rollback Checklist

1. [ ] Stop current application
2. [ ] Restore database from backup (if needed)
3. [ ] Checkout previous stable version
4. [ ] Install dependencies
5. [ ] Build application
6. [ ] Start application
7. [ ] Verify health checks
8. [ ] Monitor error logs
9. [ ] Notify stakeholders
10. [ ] Document incident

## CI/CD Pipeline

### GitHub Actions

The project includes automated CI/CD workflows in `.github/workflows/`:

- **`ci.yml`**: Run tests and linting on PRs
- **`deploy.yml`**: Deploy to production on merge to main

### Manual Deployment

```bash
# Build and test
npm run build
npm test

# Deploy to production
git push origin main  # Triggers CI/CD

# Or manual deploy
npm run deploy  # If deploy script is configured
```

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common deployment issues and solutions.

## Support

For deployment issues:
- Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- Review [GitHub Issues](https://github.com/philokalos/studio-revenue-manager/issues)
- Contact: support@yourdomain.com

---

**Last Updated**: 2025-10-10
