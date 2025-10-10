# Troubleshooting Guide

Common issues and solutions for Studio Revenue Manager.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Database Issues](#database-issues)
- [Build Issues](#build-issues)
- [Runtime Errors](#runtime-errors)
- [Docker Issues](#docker-issues)
- [Authentication Issues](#authentication-issues)
- [API Issues](#api-issues)
- [Performance Issues](#performance-issues)

## Installation Issues

### npm install fails

**Problem**: Dependencies installation fails

**Solutions**:
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install

# If still fails, try with legacy peer deps
npm install --legacy-peer-deps
```

### Node version incompatibility

**Problem**: `error Unsupported engine`

**Solution**:
```bash
# Check Node version
node --version

# Should be 18.x or higher
# Install Node 18 LTS via nvm
nvm install 18
nvm use 18
```

### PostgreSQL not found

**Problem**: `psql: command not found`

**Solutions**:

**macOS**:
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian**:
```bash
sudo apt update
sudo apt install postgresql-15
sudo systemctl start postgresql
```

**Windows**: Download from https://www.postgresql.org/download/windows/

## Database Issues

### Connection refused

**Problem**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Checklist**:
1. PostgreSQL is running:
   ```bash
   pg_isready
   # or
   brew services list | grep postgresql  # macOS
   sudo systemctl status postgresql      # Linux
   ```

2. Check port in .env matches PostgreSQL port:
   ```bash
   DB_PORT=5432  # Default PostgreSQL port
   ```

3. Check PostgreSQL is listening:
   ```bash
   lsof -i :5432
   ```

4. Verify credentials:
   ```bash
   psql -U postgres -d studio_revenue_manager
   ```

### Database does not exist

**Problem**: `error: database "studio_revenue_manager" does not exist`

**Solution**:
```bash
# Create database
createdb studio_revenue_manager

# Or using psql
psql -U postgres
CREATE DATABASE studio_revenue_manager;
\q
```

### Migration fails

**Problem**: `ERROR:  relation "users" already exists`

**Solutions**:
```bash
# Check migration status
cd packages/backend
npm run db:migrate:status

# Reset database (WARNING: deletes all data)
npm run db:reset

# Or manually rollback
npm run db:rollback
```

### Permission denied

**Problem**: `ERROR: permission denied for database`

**Solution**:
```sql
-- Grant permissions to your user
psql -U postgres
GRANT ALL PRIVILEGES ON DATABASE studio_revenue_manager TO your_user;
\q
```

### Connection pool exhausted

**Problem**: `TimeoutError: ResourceRequest timed out`

**Solutions**:
1. Increase pool size in `src/db/index.ts`:
   ```typescript
   max: 30,  // Increase from 20
   ```

2. Close connections properly in your code

3. Check for long-running queries:
   ```sql
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query
   FROM pg_stat_activity
   WHERE state = 'active'
   ORDER BY duration DESC;
   ```

## Build Issues

### TypeScript compilation errors

**Problem**: `error TS2304: Cannot find name 'X'`

**Solutions**:
```bash
# Clean build
rm -rf dist

# Rebuild
npm run build

# Check tsconfig.json is correct
npm run type-check
```

### Module not found

**Problem**: `Cannot find module '@/utils/helper'`

**Solution**:
Check path alias in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

### Vite build fails (Frontend)

**Problem**: Build fails with memory errors

**Solutions**:
```bash
# Increase Node memory
NODE_OPTIONS=--max-old-space-size=4096 npm run build

# Or add to package.json scripts
"build": "NODE_OPTIONS=--max-old-space-size=4096 vite build"
```

## Runtime Errors

### Port already in use

**Problem**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solutions**:
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change port in .env
PORT=3001
```

### JWT token errors

**Problem**: `JsonWebTokenError: invalid signature`

**Causes**:
1. JWT_SECRET changed after tokens were issued
2. Different secrets between environments
3. Token tampering

**Solutions**:
```bash
# 1. Ensure JWT_SECRET is set and consistent
echo $JWT_SECRET

# 2. Re-login to get new token

# 3. Check .env file has correct secret
cat .env | grep JWT_SECRET
```

### CORS errors

**Problem**: `Access-Control-Allow-Origin header is missing`

**Solutions**:

1. Check frontend URL is allowed in backend CORS config:
   ```typescript
   // packages/backend/src/middleware/cors.ts
   const allowedOrigins = [
     'http://localhost:5173',  // Add your frontend URL
     process.env.ALLOWED_ORIGINS
   ];
   ```

2. Set ALLOWED_ORIGINS in .env:
   ```bash
   ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com
   ```

### File upload fails

**Problem**: `PayloadTooLargeError: request entity too large`

**Solutions**:

1. Increase body size limit in `src/index.ts`:
   ```typescript
   app.use(express.json({ limit: '10mb' }));
   ```

2. Check MAX_FILE_SIZE in .env:
   ```bash
   MAX_FILE_SIZE=10485760  # 10MB
   ```

## Docker Issues

### Container fails to start

**Problem**: Backend container exits immediately

**Solutions**:
```bash
# Check logs
docker-compose logs backend

# Common causes:
# 1. Database not ready - add depends_on with healthcheck
# 2. Environment variables missing - check .env.docker
# 3. Migration fails - run migrations manually
docker-compose exec backend npm run db:migrate
```

### Cannot connect to database from container

**Problem**: `getaddrinfo ENOTFOUND postgres`

**Solutions**:

1. Check database service name in docker-compose.yml:
   ```yaml
   services:
     postgres:
       container_name: studio-revenue-db
   ```

2. Use service name in DATABASE_URL:
   ```bash
   DATABASE_URL=postgresql://postgres:password@postgres:5432/studio_revenue_manager
   ```

3. Ensure containers are on same network:
   ```yaml
   networks:
     - studio-network
   ```

### Volume permission issues

**Problem**: `EACCES: permission denied`

**Solutions**:
```bash
# Fix volume permissions
docker-compose exec backend chown -R node:node /app

# Or run container as root (not recommended for production)
user: root
```

### Docker build is slow

**Solutions**:
```bash
# Use BuildKit
DOCKER_BUILDKIT=1 docker-compose build

# Add .dockerignore file
echo "node_modules" > .dockerignore
echo "dist" >> .dockerignore
echo ".git" >> .dockerignore
```

## Authentication Issues

### Login fails with correct credentials

**Problem**: Login returns 401 with correct password

**Checklist**:
1. Check user exists:
   ```sql
   SELECT * FROM users WHERE email = 'user@example.com';
   ```

2. Check password hash:
   ```bash
   # Password should be hashed with bcrypt
   # If plain text, recreate user
   ```

3. Check JWT_SECRET is set:
   ```bash
   echo $JWT_SECRET
   ```

### Token expired immediately

**Problem**: Token expires right after login

**Solution**:
Check JWT_EXPIRES_IN in .env:
```bash
JWT_EXPIRES_IN=1h  # Should be at least 15m
```

### Refresh token not working

**Problem**: Token refresh returns 401

**Checklist**:
1. Refresh token is valid (not expired)
2. JWT_REFRESH_SECRET is set correctly
3. Refresh token matches database record

## API Issues

### 429 Too Many Requests

**Problem**: Rate limit exceeded

**Solutions**:
1. Wait for rate limit window to reset (15 minutes)

2. Check rate limit headers:
   ```
   X-RateLimit-Limit: 100
   X-RateLimit-Remaining: 0
   X-RateLimit-Reset: 1633024800
   ```

3. Add IP to whitelist in .env:
   ```bash
   RATE_LIMIT_WHITELIST=127.0.0.1,::1,your.ip.address
   ```

### 500 Internal Server Error

**Problem**: Generic server error

**Solutions**:
1. Check backend logs:
   ```bash
   tail -f packages/backend/logs/error-$(date +%Y-%m-%d).log
   ```

2. Enable debug logging:
   ```bash
   LOG_LEVEL=debug npm run dev:backend
   ```

3. Check database connection

4. Verify environment variables are set

### Validation errors

**Problem**: Request fails with validation error

**Example**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "startAt",
        "message": "Invalid date format"
      }
    ]
  }
}
```

**Solutions**:
1. Check API documentation for correct format
2. Ensure dates are in ISO 8601 format: `2025-10-09T10:00:00+09:00`
3. Verify required fields are included
4. Check data types (numbers vs strings)

## Performance Issues

### Slow API responses

**Problem**: API takes >3 seconds to respond

**Solutions**:

1. Check database query performance:
   ```bash
   curl http://localhost:3000/api/metrics/db
   ```

2. Enable query logging:
   ```typescript
   // Add to src/db/index.ts
   pool.on('query', (query) => {
     console.log('QUERY:', query);
   });
   ```

3. Check for N+1 query problems

4. Add database indexes:
   ```sql
   CREATE INDEX idx_reservations_dates
   ON reservations(start_at, end_at);
   ```

### High memory usage

**Problem**: Node process using >500MB RAM

**Solutions**:

1. Check for memory leaks:
   ```bash
   node --inspect packages/backend/dist/index.js
   # Use Chrome DevTools to profile
   ```

2. Limit connection pool size:
   ```typescript
   max: 10,  // Reduce if memory constrained
   ```

3. Enable garbage collection:
   ```bash
   node --expose-gc dist/index.js
   ```

### Frontend slow to load

**Solutions**:

1. Check bundle size:
   ```bash
   npm run build:frontend
   # Check dist/ size
   ```

2. Enable code splitting:
   ```typescript
   const Dashboard = lazy(() => import('./pages/Dashboard'));
   ```

3. Optimize images:
   ```bash
   # Use WebP format
   # Compress images before upload
   ```

## Google Calendar Integration Issues

### Calendar sync fails

**Problem**: No events synced from Google Calendar

**Checklist**:
1. Check API credentials:
   ```bash
   echo $GOOGLE_CALENDAR_API_KEY
   echo $GOOGLE_SERVICE_ACCOUNT_EMAIL
   ```

2. Verify service account has calendar access

3. Check calendar ID is correct

4. Review sync logs:
   ```bash
   tail -f packages/backend/logs/combined-$(date +%Y-%m-%d).log | grep calendar
   ```

### OAuth errors

**Problem**: `invalid_grant` or `unauthorized_client`

**Solutions**:
1. Regenerate service account key
2. Check redirect URI matches exactly
3. Verify OAuth scopes are correct
4. Check service account is enabled

## CSV Bank Matching Issues

### CSV parse errors

**Problem**: CSV upload fails with parse errors

**Solutions**:

1. Check CSV format (UTF-8 encoding):
   ```bash
   file -I transactions.csv
   ```

2. Verify CSV headers match expected format

3. Remove BOM if present:
   ```bash
   sed -i '1s/^\xEF\xBB\xBF//' transactions.csv
   ```

### No matches found

**Problem**: Bank transactions don't match any invoices

**Checklist**:
1. Transaction date within ±3 days of invoice
2. Amount matches within ±1%
3. Depositor name similar to payer name
4. Invoice status is OPEN (not already PAID)

## Getting Help

If your issue isn't covered here:

1. **Check logs**:
   ```bash
   # Backend logs
   tail -f packages/backend/logs/error-$(date +%Y-%m-%d).log

   # Docker logs
   docker-compose logs -f
   ```

2. **Enable debug mode**:
   ```bash
   NODE_ENV=development
   LOG_LEVEL=debug
   ```

3. **Review documentation**:
   - [QUICKSTART.md](./QUICKSTART.md)
   - [DEPLOYMENT.md](./DEPLOYMENT.md)
   - [API_EXAMPLES.md](./API_EXAMPLES.md)

4. **Check GitHub Issues**:
   - Search existing issues
   - Create new issue with:
     - Environment details
     - Steps to reproduce
     - Error logs
     - Expected vs actual behavior

5. **Ask for help**:
   - GitHub Discussions
   - Stack Overflow (tag: studio-revenue-manager)

---

**Last Updated**: 2025-10-10
