# Docker Deployment Guide

Studio Revenue Manager - Docker containerization documentation.

## Quick Start

### 1. Setup Environment Variables

```bash
# Copy the example environment file
cp .env.docker.example .env.docker

# Edit .env.docker and set your values
# IMPORTANT: Change POSTGRES_PASSWORD and JWT_SECRET!
```

### 2. Build and Start Services

```bash
# Build and start all services in detached mode
docker-compose --env-file .env.docker up --build -d

# Or use the default .env file if you rename .env.docker to .env
docker-compose up --build -d
```

### 3. Verify Deployment

```bash
# Check running containers
docker ps

# Check logs
docker-compose logs -f backend
docker-compose logs -f postgres

# Test health endpoint
curl http://localhost:3000/health
```

## Container Architecture

### Services

1. **PostgreSQL Database** (`postgres`)
   - Image: `postgres:15-alpine`
   - Port: 5432 (configurable)
   - Volume: `postgres-data` for data persistence
   - Health checks enabled

2. **Backend API** (`backend`)
   - Built from `./packages/backend/Dockerfile`
   - Port: 3000 (configurable)
   - Depends on PostgreSQL
   - Multi-stage build for optimization
   - Non-root user for security

### Network

- Network: `studio-network` (bridge driver)
- Internal service communication via service names

## Docker Commands

### Starting Services

```bash
# Start all services
docker-compose up -d

# Start with rebuild
docker-compose up --build -d

# Start specific service
docker-compose up -d backend
```

### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f postgres

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Database Operations

```bash
# Access PostgreSQL shell
docker-compose exec postgres psql -U postgres -d studio_revenue_manager

# Run database migrations (if available)
docker-compose exec backend npm run db:migrate

# Backup database
docker-compose exec postgres pg_dump -U postgres studio_revenue_manager > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres studio_revenue_manager < backup.sql
```

### Container Management

```bash
# View running containers
docker-compose ps

# Restart a service
docker-compose restart backend

# Execute command in container
docker-compose exec backend sh

# View resource usage
docker stats
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_PASSWORD` | Database password | `secure_password_123` |
| `JWT_SECRET` | JWT signing secret | `random_64_char_hex` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_DB` | Database name | `studio_revenue_manager` |
| `POSTGRES_USER` | Database user | `postgres` |
| `PORT` | Backend port | `3000` |
| `NODE_ENV` | Environment | `production` |

## Security Considerations

1. **Secrets Management**
   - Never commit `.env.docker` to version control
   - Use strong, randomly generated secrets
   - Rotate secrets regularly

2. **Container Security**
   - Backend runs as non-root user (nodejs:1001)
   - Minimal alpine-based images
   - Health checks enabled
   - No unnecessary ports exposed

3. **Network Security**
   - Database not exposed to host by default
   - Backend communicates internally via service name
   - Bridge network isolation

## Production Deployment

### Generate Secure Secrets

```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate PostgreSQL password
openssl rand -base64 32
```

### Resource Limits (Add to docker-compose.yml)

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### Persistent Logs

```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Troubleshooting

### Backend Can't Connect to Database

```bash
# Check if postgres is healthy
docker-compose ps

# Check postgres logs
docker-compose logs postgres

# Verify DATABASE_URL format
docker-compose exec backend env | grep DATABASE_URL
```

### Port Already in Use

```bash
# Change port in .env.docker
BACKEND_PORT=3001

# Or stop conflicting service
lsof -ti:3000 | xargs kill
```

### Container Keeps Restarting

```bash
# Check logs for errors
docker-compose logs --tail=50 backend

# Check health status
docker inspect studio-revenue-backend | grep -A 10 Health
```

### Database Connection Refused

```bash
# Wait for postgres to be ready
docker-compose logs postgres | grep "ready to accept connections"

# Test connection manually
docker-compose exec postgres psql -U postgres -c "SELECT 1"
```

## Cleanup

```bash
# Stop and remove containers, networks
docker-compose down

# Remove volumes (WARNING: deletes database)
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Complete cleanup
docker system prune -a --volumes
```

## Development vs Production

### Development Setup

```bash
# Use .env.docker.example as template
cp .env.docker.example .env.docker

# Set NODE_ENV=development
# Use weaker passwords for local dev
```

### Production Setup

```bash
# Use strong secrets
# Set NODE_ENV=production
# Enable resource limits
# Configure log rotation
# Use HTTPS reverse proxy (nginx/traefik)
```

## Next Steps

1. Configure reverse proxy (nginx) for HTTPS
2. Set up automated backups
3. Implement monitoring (Prometheus/Grafana)
4. Configure log aggregation
5. Set up CI/CD pipeline

## Support

For issues and questions:
- Check logs: `docker-compose logs -f`
- Health check: `curl http://localhost:3000/health`
- Database metrics: `curl http://localhost:3000/api/metrics/db`
