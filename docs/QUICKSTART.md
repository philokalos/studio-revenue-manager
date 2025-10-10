# Quick Start Guide

Get Studio Revenue Manager up and running in 5 minutes.

## Prerequisites Check

```bash
# Check Node.js version (need 18+)
node --version

# Check PostgreSQL (need 15+)
psql --version

# Check npm (need 9+)
npm --version
```

If any are missing, install them from:
- Node.js: https://nodejs.org/
- PostgreSQL: https://www.postgresql.org/download/

## Setup Steps

### 1. Clone and Install

```bash
# Clone repository
git clone https://github.com/philokalos/studio-revenue-manager.git
cd studio-revenue-manager

# Install dependencies (takes 1-2 minutes)
npm install
```

### 2. Database Setup

```bash
# Create database
createdb studio_revenue_manager

# Or using psql
psql -U postgres
CREATE DATABASE studio_revenue_manager;
\q
```

### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env file - IMPORTANT: Set these variables
nano .env
```

**Minimum required in .env:**
```bash
# Database
DB_PASSWORD=your_postgres_password

# JWT Secrets (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your_generated_32_char_secret_here
JWT_REFRESH_SECRET=your_generated_32_char_refresh_secret_here
```

### 4. Initialize Database

```bash
# Run migrations
npm run db:migrate

# Seed with sample data (optional)
npm run db:seed
```

### 5. Start Development Servers

```bash
# Start both backend and frontend
npm run dev
```

**You're done!** Open your browser:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Docs: http://localhost:3000/api-docs

## Default Test Account

After seeding the database, use these credentials to login:

```
Email: admin@studiomorph.com
Password: admin123
```

**IMPORTANT**: Change this password in production!

## Quick Test

### 1. Test Backend Health

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": {
    "healthy": true
  }
}
```

### 2. Test Quote Calculation

```bash
curl -X POST http://localhost:3000/api/quote/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "startAt": "2025-10-09T10:00:00+09:00",
    "endAt": "2025-10-09T12:00:00+09:00",
    "people": 3
  }'
```

### 3. Access Frontend

Open http://localhost:5173 and login with the test account.

## Common Commands

```bash
# Start development
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Database commands
npm run db:migrate      # Run migrations
npm run db:rollback     # Rollback last migration
npm run db:seed         # Seed data
npm run db:reset        # Reset (rollback all + migrate + seed)

# Code quality
npm run lint            # Run ESLint
npm run type-check      # TypeScript type checking
```

## Docker Quick Start

Prefer Docker? Use this instead:

```bash
# Copy Docker environment
cp .env.docker.example .env.docker

# Start all services
docker-compose up -d

# Run migrations
docker-compose exec backend npm run db:migrate

# View logs
docker-compose logs -f
```

Access:
- Backend: http://localhost:3000
- Frontend: Build separately or add to docker-compose

## Project Structure

```
studio-revenue-manager/
├── packages/
│   ├── backend/         # Express API
│   ├── frontend/        # React app
│   └── shared-pricing/  # Pricing engine
├── docs/               # Documentation
└── .github/           # CI/CD workflows
```

## Next Steps

1. **Read Documentation**
   - [Architecture](./ARCHITECTURE.md)
   - [API Examples](./API_EXAMPLES.md)
   - [Deployment Guide](./DEPLOYMENT.md)

2. **Explore Features**
   - Quote calculation
   - Reservation management
   - CSV bank matching
   - Dashboard analytics

3. **Start Development**
   - Check [ROADMAP.md](../ROADMAP.md) for planned features
   - Review [GitHub Issues](https://github.com/philokalos/studio-revenue-manager/issues)
   - Read [TRD.md](../TRD.md) and [PRD.md](../PRD.md)

## Troubleshooting

**Database connection failed?**
```bash
# Check PostgreSQL is running
pg_isready

# Check credentials in .env match your PostgreSQL setup
```

**Port 3000 already in use?**
```bash
# Change PORT in .env file
echo "PORT=3001" >> .env
```

**npm install fails?**
```bash
# Clear cache and retry
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

For more issues, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

## Support

- Documentation: [docs/](../docs/)
- Issues: [GitHub Issues](https://github.com/philokalos/studio-revenue-manager/issues)
- API Docs: http://localhost:3000/api-docs

---

**Happy Coding!** 🚀
