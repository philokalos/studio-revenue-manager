# System Architecture

Detailed architectural overview of the Studio Revenue Manager system.

## High-Level Architecture

```
┌─────────────────┐
│   Web Browser   │
│   (Frontend)    │
└────────┬────────┘
         │ HTTPS
         │
┌────────▼────────────────────┐
│   React 19 Frontend        │
│   - Vite Build             │
│   - TanStack Query         │
│   - React Router v7        │
│   - Tailwind CSS           │
└────────┬────────────────────┘
         │ REST API
         │ (JSON)
┌────────▼────────────────────┐
│   Express.js Backend       │
│   - TypeScript             │
│   - JWT Auth               │
│   - Rate Limiting          │
│   - Logging (Winston)      │
└────────┬────────────────────┘
         │
    ┌────┴─────┬─────────────┐
    │          │             │
┌───▼───┐  ┌──▼──────┐  ┌──▼──────────┐
│ PostgreSQL│ │Google    │  │File Storage│
│  Database││ │Calendar  │  │(Uploads)   │
│          ││ │API       │  │            │
└──────────┘  └──────────┘  └────────────┘
```

## Technology Stack

### Backend Architecture

**Core Framework**
- **Runtime**: Node.js 18+ (LTS)
- **Framework**: Express.js 4.18
- **Language**: TypeScript 5.3
- **Database Client**: node-postgres (pg)

**Key Layers**

1. **API Layer** (`src/routes/`)
   - RESTful endpoints
   - Request validation (Zod)
   - Authentication middleware
   - Rate limiting

2. **Business Logic** (`src/`)
   - Pricing engine
   - Reservation management
   - Invoice generation
   - CSV parsing and matching

3. **Data Access** (`src/db/`)
   - Migration system
   - Query builders
   - Connection pooling
   - Transaction management

4. **Integration** (`src/`)
   - Google Calendar sync
   - Email notifications
   - File upload handling

**Middleware Stack**
```
Request
  ↓
Security Headers (Helmet)
  ↓
CORS Protection
  ↓
Rate Limiting
  ↓
Body Parsing
  ↓
HTTP Logging
  ↓
Performance Monitoring
  ↓
Authentication (JWT)
  ↓
Route Handlers
  ↓
Error Handler
  ↓
Response
```

### Frontend Architecture

**Framework**: React 19 with TypeScript

**Key Components**

1. **Pages** (`src/pages/`)
   - Dashboard
   - Reservations
   - Invoices
   - Reports
   - Settings

2. **Components** (`src/components/`)
   - Reusable UI components
   - Forms and inputs
   - Charts and visualizations
   - Layout components

3. **State Management**
   - TanStack Query for server state
   - React hooks for local state
   - Context for global state (auth, theme)

4. **Routing**
   - React Router v7
   - Protected routes
   - Lazy loading
   - Error boundaries

**Build Process**
```
TypeScript → Vite → Optimized Bundle
   ↓          ↓          ↓
Type Check  Tree Shake  Minify
            Code Split  Compress
```

## Database Architecture

### PostgreSQL Schema

**Core Tables**

1. **users**
   - Authentication and authorization
   - Password hashing (bcrypt)
   - JWT token management

2. **reservations**
   - Reservation details
   - Time slots
   - People count
   - Channel information

3. **invoices**
   - Billing information
   - Discount application
   - Payment status
   - Links to reservations

4. **bank_transactions**
   - CSV upload data
   - Matching status
   - Links to invoices

5. **costs**
   - Monthly expenses
   - Fixed and variable costs
   - Category breakdown

6. **goals**
   - Revenue targets
   - Achievement tracking

**Key Indexes**
```sql
-- Performance critical indexes
CREATE INDEX idx_reservations_dates ON reservations(start_at, end_at);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_bank_tx_status ON bank_transactions(status);
CREATE INDEX idx_bank_tx_date ON bank_transactions(date);
```

**Connection Pooling**
- Min: 2 connections
- Max: 20 connections
- Idle timeout: 30 seconds
- Health check interval: 10 seconds

## Pricing Engine

**30-Minute Time Slicing Algorithm**

```
Input: startAt, endAt, people, discount
  ↓
Validate (minimum 2 hours, valid times)
  ↓
Split into 30-minute segments
  ↓
For each segment:
  - Determine rate (DAY/NIGHT)
  - Calculate base cost
  - Add extra people cost (if > 3)
  ↓
Sum all segments
  ↓
Apply discount (amount or percentage)
  ↓
Return final amount + breakdown
```

**Rate Rules**
- DAY (08:00-20:00): 40,000 KRW/hour
- NIGHT (20:00-08:00): 20,000 KRW/hour
- Base capacity: 3 people
- Extra person: 5,000 KRW/hour

**Edge Cases Handled**
- Midnight crossing (22:00-02:00)
- Day/night boundary (19:00-21:00)
- Mid-session people changes
- Discount conflicts (amount vs percentage)

## Security Architecture

### Authentication Flow

```
1. User Login
   ↓
2. Verify Credentials (bcrypt)
   ↓
3. Generate JWT (access + refresh)
   ↓
4. Return Tokens
   ↓
5. Subsequent Requests
   ↓
6. Verify JWT
   ↓
7. Grant/Deny Access
```

**Token Strategy**
- Access Token: 1 hour expiry
- Refresh Token: 7 days expiry
- Secure HTTP-only cookies (production)
- Token rotation on refresh

### Security Layers

1. **Network Security**
   - HTTPS only (production)
   - CORS whitelist
   - Rate limiting (100 req/15min)
   - IP whitelisting support

2. **Application Security**
   - Input validation (Zod schemas)
   - SQL injection prevention (parameterized queries)
   - XSS protection (React escaping)
   - CSRF protection (SameSite cookies)

3. **Data Security**
   - Password hashing (bcrypt, salt rounds: 10)
   - Environment variable secrets
   - Database encryption at rest
   - Secure session management

4. **Logging & Monitoring**
   - Winston logging with daily rotation
   - Audit trails for critical operations
   - Error tracking and alerting
   - Performance metrics

## API Design

### RESTful Principles

**Resource Naming**
```
/api/auth           - Authentication
/api/quote          - Quote calculations
/api/reservation    - Reservations
/api/invoice        - Invoices
/api/calendar       - Google Calendar
/api/csv-bank       - Bank transactions
/api/monitoring     - System metrics
```

**HTTP Methods**
- GET: Retrieve resources
- POST: Create resources
- PATCH: Partial update
- DELETE: Remove resources

**Response Format**
```json
{
  "data": { ... },        // Success response
  "error": {              // Error response
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { ... }
  }
}
```

**Pagination**
```
GET /api/reservation?page=1&limit=20
```

**Filtering**
```
GET /api/invoice?status=OPEN&startDate=2025-10-01
```

## Integration Architecture

### Google Calendar Integration

```
┌─────────────┐         ┌──────────────┐
│   Scheduler │         │  Google      │
│   (Cron)    │────────▶│  Calendar    │
└─────────────┘         │  API         │
      │                 └──────────────┘
      │                        │
      ▼                        │
┌─────────────┐                │
│  Pull       │◀───────────────┘
│  Events     │
└─────────────┘
      │
      ▼
┌─────────────┐
│  Parse      │
│  Metadata   │
└─────────────┘
      │
      ▼
┌─────────────┐
│  Create/    │
│  Update     │
│  Reservations│
└─────────────┘
```

**Sync Strategy**
- Frequency: Hourly (configurable)
- Event window: 30 days past, 90 days future
- Conflict resolution: Calendar as source of truth
- Error handling: Retry with exponential backoff

### CSV Bank Matching

```
CSV Upload
    ↓
Parse CSV
    ↓
Normalize Data (amount, date, name)
    ↓
For each transaction:
    ├─ Find candidate invoices
    │  (by date ±3 days, amount ±1%, name similarity)
    ├─ Score matches (0.0-1.0)
    └─ Auto-match if score > 0.9
       or Mark as PENDING_REVIEW
```

**Matching Algorithm**
- Date match: ±3 days
- Amount match: Exact or ±1%
- Name match: Fuzzy string similarity (Levenshtein)
- Combined score: weighted average
  - Date: 40%
  - Amount: 40%
  - Name: 20%

## Performance Optimization

### Database Optimization

1. **Query Optimization**
   - Strategic indexes
   - Query logging and monitoring
   - Slow query analysis
   - Connection pooling

2. **Caching Strategy**
   - In-memory caching (planned)
   - Query result caching
   - Static asset caching

3. **Database Monitoring**
   - Connection pool metrics
   - Query performance tracking
   - Lock monitoring

### Frontend Optimization

1. **Code Splitting**
   - Route-based splitting
   - Component lazy loading
   - Vendor bundle separation

2. **Asset Optimization**
   - Image optimization
   - SVG usage
   - Font subset loading

3. **Build Optimization**
   - Tree shaking
   - Minification
   - Gzip compression

## Monitoring & Observability

### Logging Strategy

**Log Levels**
- ERROR: System errors requiring attention
- WARN: Warning conditions
- INFO: General informational messages
- DEBUG: Detailed debugging information

**Log Destinations**
- Development: Console + files
- Production: Files + log aggregation service

**Log Rotation**
- Daily rotation
- 30-day retention
- Compressed archives

### Metrics Collected

1. **Application Metrics**
   - Request count
   - Response times
   - Error rates
   - Active users

2. **System Metrics**
   - CPU usage
   - Memory usage
   - Disk I/O
   - Network traffic

3. **Business Metrics**
   - Reservations created
   - Invoices generated
   - Matching accuracy
   - Revenue tracking

## Scalability Considerations

### Horizontal Scaling

**Backend**
- Stateless API design
- Load balancer ready
- Session management (Redis for multi-instance)
- Database read replicas

**Frontend**
- CDN distribution
- Static asset optimization
- Progressive Web App support

### Vertical Scaling

**Database**
- Connection pool tuning
- Query optimization
- Index optimization
- Partitioning (future)

**Application**
- Worker processes
- Memory optimization
- Async/await patterns
- Stream processing

## Deployment Architecture

### Development
```
Local Machine
  ├─ Backend (nodemon)
  ├─ Frontend (Vite dev server)
  └─ PostgreSQL (local)
```

### Production
```
Load Balancer
  │
  ├─ Backend (PM2/Docker)
  │   ├─ Instance 1
  │   ├─ Instance 2
  │   └─ Instance N
  │
  ├─ Frontend (Static CDN)
  │
  └─ Database (PostgreSQL)
      ├─ Primary
      └─ Replica (read-only)
```

## Future Enhancements

1. **Microservices** (Phase 2)
   - Separate pricing service
   - Notification service
   - Analytics service

2. **Real-time Features** (Phase 3)
   - WebSocket support
   - Live dashboard updates
   - Notification system

3. **Multi-tenancy** (Phase 4)
   - Organization support
   - Role-based access control
   - Data isolation

---

**Last Updated**: 2025-10-10
