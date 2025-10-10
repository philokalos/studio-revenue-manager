# Studio Revenue Manager

**Studio Morph 매출 관리 시스템** - Professional revenue, reservation, and expense management system for studio operations.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)

## Overview

Studio Revenue Manager is a comprehensive web-based system designed to streamline revenue management for studio operations. It integrates reservation management, automated pricing calculations, revenue tracking, and expense management into a single, efficient platform.

### Key Features

- **Automated Pricing Engine**: 30-minute time slicing with DAY/NIGHT rate differentiation
- **Google Calendar Integration**: Automatic reservation synchronization
- **Revenue Matching**: Intelligent bank transaction CSV upload and matching
- **Expense Tracking**: Fixed and variable cost management with monthly goals
- **Dashboard Analytics**: Real-time revenue, costs, profit, and utilization metrics
- **Multi-tier Testing**: Unit, integration, and E2E test coverage

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL 15
- **Authentication**: JWT with bcrypt
- **API Documentation**: Swagger/OpenAPI
- **Testing**: Vitest
- **Logging**: Winston with daily rotation

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **UI Components**: Radix UI + Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router v7
- **Charts**: Recharts
- **Forms**: React Hook Form

### Shared
- **Monorepo**: npm workspaces
- **Language**: TypeScript 5.3+
- **Validation**: Zod schemas
- **Date Handling**: date-fns with timezone support

## Project Structure

```
studio-revenue-manager/
├── packages/
│   ├── backend/              # Express API server
│   │   ├── src/
│   │   │   ├── routes/       # API routes
│   │   │   ├── middleware/   # Express middleware
│   │   │   ├── db/          # Database migrations & queries
│   │   │   ├── utils/       # Helper functions
│   │   │   └── config/      # Configuration files
│   │   └── __tests__/       # Test suites
│   ├── frontend/            # React web application
│   │   ├── src/
│   │   │   ├── components/  # Reusable components
│   │   │   ├── pages/       # Route pages
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   ├── api/         # API client
│   │   │   └── lib/         # Utilities
│   │   └── public/          # Static assets
│   └── shared-pricing/      # Shared pricing calculation engine
├── docs/                    # Documentation
│   ├── QUICKSTART.md       # Quick start guide
│   ├── DEPLOYMENT.md       # Deployment instructions
│   ├── API_EXAMPLES.md     # API usage examples
│   ├── ARCHITECTURE.md     # System architecture
│   └── TROUBLESHOOTING.md  # Common issues & solutions
├── .github/
│   └── workflows/          # CI/CD pipelines
├── docker-compose.yml      # Docker orchestration
└── package.json            # Root workspace config
```

## Quick Start

### Prerequisites

- Node.js 18.x or higher
- PostgreSQL 15 or higher
- npm 9.x or higher
- Docker & Docker Compose (optional, for containerized setup)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/philokalos/studio-revenue-manager.git
cd studio-revenue-manager

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your database credentials and configuration

# 4. Setup database
npm run db:migrate
npm run db:seed  # Optional: seed with sample data

# 5. Start development servers
npm run dev
```

The application will be available at:
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api-docs
- **Frontend**: http://localhost:5173

### Docker Setup (Alternative)

```bash
# 1. Copy environment files
cp .env.docker.example .env.docker

# 2. Start all services
docker-compose up -d

# 3. Run migrations
docker-compose exec backend npm run db:migrate
```

## Development

### Available Commands

```bash
# Development
npm run dev              # Run both backend and frontend
npm run dev:backend      # Run backend only (with hot reload)
npm run dev:frontend     # Run frontend only (with HMR)

# Build
npm run build            # Build entire project
npm run build:backend    # Build backend (TypeScript → JavaScript)
npm run build:frontend   # Build frontend (Vite production build)

# Testing
npm test                 # Run all tests
npm run test:unit        # Run unit tests only
npm run test:integration # Run integration tests
npm run test:coverage    # Run tests with coverage report

# Code Quality
npm run lint             # Run ESLint on all packages
npm run type-check       # TypeScript type checking

# Database
npm run db:migrate       # Run database migrations
npm run db:rollback      # Rollback last migration
npm run db:seed          # Seed database with sample data
npm run db:reset         # Reset database (rollback all + migrate + seed)
```

### Testing Strategy

- **Unit Tests**: ≥90% coverage for pricing engine and core utilities
- **Integration Tests**: ≥80% coverage for API endpoints
- **E2E Tests**: Complete user workflows including authentication, reservations, and revenue matching

## Documentation

- **[Quick Start Guide](docs/QUICKSTART.md)** - Get started in 5 minutes
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment instructions
- **[API Examples](docs/API_EXAMPLES.md)** - Practical API usage examples
- **[Architecture](docs/ARCHITECTURE.md)** - System design and architecture
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions

### Design Documents

- **[PRD.md](PRD.md)** - Product Requirements Document
- **[TRD.md](TRD.md)** - Technical Requirements Document
- **[ERD.md](ERD.md)** - Entity Relationship Diagram
- **[API_SPECIFICATION.md](API_SPECIFICATION.md)** - Complete API specification
- **[PRICING_ENGINE_SPEC.md](PRICING_ENGINE_SPEC.md)** - Pricing engine detailed spec
- **[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)** - UI design system
- **[USER_JOURNEY.md](USER_JOURNEY.md)** - User scenarios and workflows

## Core Features

### 1. Pricing Engine
- 30-minute time slicing for accurate billing
- DAY (08:00-20:00): 40,000 KRW/hour
- NIGHT (20:00-08:00): 20,000 KRW/hour
- Base capacity: 3 people
- Extra person: 5,000 KRW/hour per person
- Discount support (percentage or fixed amount)
- Minimum 2-hour reservation

### 2. Reservation Management
- Google Calendar automatic synchronization
- Manual reservation creation/editing
- Price adjustment with memo support
- Reservation status tracking
- Conflict detection and validation

### 3. Revenue Management
- Bank transaction CSV upload (KakaoBank format)
- Intelligent matching (time + amount + depositor name)
- Manual matching override
- Outstanding and refund tracking
- Invoice generation and management

### 4. Expense & Goal Management
- Monthly cost input (fixed + variable)
- Expense categories: rent, utilities, ads, supplies, maintenance
- Monthly revenue goal setting
- Achievement rate tracking
- Rolling 3-month average for utilities

### 5. Dashboard & Analytics
- Daily/weekly/monthly revenue statistics
- Cost vs. revenue analysis
- Goal achievement visualization
- Utilization rate metrics
- Export capabilities

## Security Features

- **Environment Variables**: Sensitive data management
- **Parameterized Queries**: SQL injection prevention
- **CORS Protection**: Frontend-only access
- **Rate Limiting**: API abuse prevention
- **Input Validation**: Zod schema validation
- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with salt
- **Security Headers**: Helmet.js protection
- **Logging**: Winston with audit trails

## Performance

- **Connection Pooling**: Optimized database connections
- **Query Optimization**: Indexed queries with monitoring
- **Caching**: Strategic data caching
- **Performance Monitoring**: Real-time metrics tracking
- **Health Checks**: Database and system health endpoints

## Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Update documentation as needed
- Follow the existing code style
- Run linting and type-checking before commits

## Roadmap

See [ROADMAP.md](ROADMAP.md) for detailed development roadmap and upcoming features.

**Current Progress**:
- ✅ Milestone 1: Foundation (Week 1)
- 🔄 Milestone 2: Core Features (Week 2-3)
- ⏳ Milestone 3: Integration (Week 4-5)
- ⏳ Milestone 4: Testing & Polish (Week 6-7)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues, questions, or suggestions:
- **GitHub Issues**: [Create an issue](https://github.com/philokalos/studio-revenue-manager/issues)
- **Documentation**: Check the [docs](docs/) directory
- **Email**: Contact the maintainer

## Acknowledgments

- **Maintainer**: philokalos
- **Framework**: Built with Express.js, React, and PostgreSQL
- **Community**: Thanks to all contributors and the open-source community

---

**Made with ❤️ for Studio Morph**
