# Docker Quick Start Guide
## Studio Revenue Manager - 5-Minute Setup

---

## 🚀 Prerequisites

1. Install Docker Desktop: https://www.docker.com/products/docker-desktop
2. Start Docker Desktop application
3. Verify: `docker --version`

---

## ⚡ Quick Start (3 Commands)

```bash
# 1. Configure environment (edit POSTGRES_PASSWORD and JWT_SECRET)
cp .env.docker.example .env.docker
nano .env.docker  # or use your preferred editor

# 2. Build and start
docker compose --env-file .env.docker up --build -d

# 3. Verify
curl http://localhost:3000/health
```

---

## 🔐 Generate Secure Secrets

```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Database Password
openssl rand -base64 32
```

---

## 📊 Essential Commands

```bash
# Check status
docker compose ps

# View logs
docker compose logs -f backend

# Restart
docker compose restart backend

# Stop all
docker compose down

# Complete cleanup
docker compose down -v
```

---

## ✅ Health Checks

```bash
# System health
curl http://localhost:3000/health

# Database metrics
curl http://localhost:3000/api/metrics/db

# Container status
docker compose ps
```

---

## 🔧 Database Access

```bash
# PostgreSQL shell
docker compose exec postgres psql -U postgres -d studio_revenue_manager

# Run migrations
docker compose exec backend npm run db:migrate

# Backup
docker compose exec postgres pg_dump -U postgres studio_revenue_manager > backup.sql
```

---

## 🐛 Troubleshooting

### Port in use?
```bash
# Change in .env.docker
BACKEND_PORT=3001
```

### Container won't start?
```bash
# Check logs
docker compose logs --tail=50 backend

# Clean rebuild
docker compose down -v
docker compose up --build -d
```

### Database connection issues?
```bash
# Wait for postgres
docker compose logs postgres | grep "ready to accept"

# Test connection
docker compose exec postgres psql -U postgres -c "SELECT 1"
```

---

## 📚 Full Documentation

- **Comprehensive Guide**: `DOCKER.md`
- **Deployment Report**: `DOCKER_DEPLOYMENT_REPORT.md`
- **Verification Script**: `./docker-verify.sh`

---

## 🎯 Access URLs

| Service | URL |
|---------|-----|
| API | http://localhost:3000 |
| Health | http://localhost:3000/health |
| Metrics | http://localhost:3000/api/metrics/db |
| Docs | http://localhost:3000/api-docs |

---

## ⚠️ Important Notes

1. **Always** change `POSTGRES_PASSWORD` and `JWT_SECRET` in production
2. **Never** commit `.env.docker` to version control
3. **Test** health endpoints after deployment
4. **Monitor** logs during first startup

---

## 🚀 You're all set!

For detailed information, see:
- `DOCKER.md` - Comprehensive Docker guide
- `DOCKER_DEPLOYMENT_REPORT.md` - Complete deployment report
- Run `./docker-verify.sh` to check your setup
