# Parallel Development Coordination Guide

**Project**: Studio Revenue Manager
**Strategy**: 5-Track Parallel Development
**Timeline**: 4 days (vs. 10-13 days sequential)
**Team Size**: 5 developers (A, B, C, D, E)

## Quick Start

Each developer should:
1. Read this coordination guide
2. Review their assigned track implementation guide
3. Create feature branch: `feature/{track-name}`
4. Attend daily 15-minute sync meetings
5. Follow merge strategy below

## Track Assignments

| Track | Developer | Duration | Priority | Files Modified |
|-------|-----------|----------|----------|----------------|
| **Track 1** | Developer A | 2-3 days | 🚨 Urgent | auth.ts, invoice.ts, users table |
| **Track 2** | Developer B | 1 day | 🚨 Urgent | db/index.ts, db/retry.ts, db/health.ts |
| **Track 3** | Developer C | 2 days | ⚠️ Important | pricing.test.ts, vitest.config.ts |
| **Track 4** | Developer D | 3-4 days | ⚠️ Important | calendar.ts (NEW), reservations schema |
| **Track 5** | Developer E | 2-3 days | ⚠️ Important | csv-parser.ts (NEW), transactions schema |

### Detailed Track Information

#### Track 1: Authentication System
**Guide**: `TRACK-1-AUTH-SYSTEM.md`
**Objective**: Replace hard-coded 'system' user with JWT authentication
**Key Deliverables**:
- JWT middleware and token generation
- User registration/login endpoints
- Protected routes for all mutations
- Database users table migration

**Critical Blocker**: invoice.ts:114 hard-coded user

#### Track 2: Database Connection Pooling
**Guide**: `TRACK-2-DB-POOLING.md`
**Objective**: Production-ready connection pooling with retry logic
**Key Deliverables**:
- Pool configuration (max 20, min 2)
- Exponential backoff retry logic
- Health check endpoint
- Query timeout handling (5s)

**Risk**: Connection exhaustion under load

#### Track 3: Pricing Engine Test Coverage
**Guide**: `TRACK-3-TEST-COVERAGE.md`
**Objective**: Achieve ≥90% code coverage
**Key Deliverables**:
- Midnight crossing tests
- DST transition tests
- Holiday pricing tests
- Discount validation tests
- Multi-day reservation tests

**Target**: ≥90% lines, branches, functions, statements

#### Track 4: Google Calendar Integration
**Guide**: `TRACK-4-GOOGLE-CALENDAR.md`
**Objective**: Bidirectional sync (Calendar ↔ Database)
**Key Deliverables**:
- Service Account authentication
- Calendar event CRUD operations
- Bidirectional sync service
- Reservation hooks for auto-sync

**Value**: Automation of manual scheduling

#### Track 5: CSV Upload & Bank Transaction Matching
**Guide**: `TRACK-5-CSV-BANK-MATCHING.md`
**Objective**: Auto-matching bank transactions with invoices
**Key Deliverables**:
- CSV parser (KB, Shinhan, Woori formats)
- Auto-matching algorithm (≥85% accuracy)
- Matching queue UI for manual review
- Approve/reject workflow

**Value**: 80% reduction in reconciliation time

## Daily Coordination Schedule

### Daily Sync Meeting (15 minutes)

**Time**: 9:00 AM daily
**Format**: Stand-up style

**Each developer reports**:
1. **Completed**: What I finished yesterday
2. **Current**: What I'm working on today
3. **Blockers**: What's blocking me (if any)

**Example**:
> **Developer A**: Completed JWT middleware and auth routes. Working on invoice.ts updates today. No blockers.
>
> **Developer B**: Completed pool configuration. Working on retry logic tests. No blockers.

### Coordination Checkpoints

**Day 1 End** (6:00 PM):
- Developer B (Track 2): Should have database pooling complete
- All developers: Share progress on day 1 goals

**Day 2 End** (6:00 PM):
- Developer A (Track 1): Auth system ready for integration
- Developer C (Track 3): Baseline coverage measured, midnight tests complete
- Coordinate merge order for `app.ts` (Track 1 → Track 4 → Track 5)

**Day 3 End** (6:00 PM):
- Developer C (Track 3): Test coverage ≥90% achieved
- All tracks: Prepare for integration testing

**Day 4** (Final Day):
- Developer D (Track 4): Calendar integration complete
- Developer E (Track 5): CSV matching complete
- Final integration testing and merge to `develop`

## File Conflict Prevention

### High-Risk Files (Multiple Tracks)

#### `packages/backend/src/app.ts`
**Modified by**: Track 1, Track 4, Track 5

**Coordination**:
1. **Track 1** (Developer A): Add auth routes **first**
   ```typescript
   app.use('/api/auth', authRoutes);
   ```

2. **Track 4** (Developer D): Add calendar routes **after Track 1 merges**
   ```typescript
   app.use('/api/calendar', calendarRoutes);
   ```

3. **Track 5** (Developer E): Add transaction routes **last**
   ```typescript
   app.use('/api/transactions', transactionRoutes);
   ```

**Strategy**: Sequential merge in dependency order

#### `packages/backend/src/db/index.ts`
**Modified by**: Track 1, Track 2

**Coordination**:
- **Track 2** (Developer B): Modifies pool configuration and exports
- **Track 1** (Developer A): Imports pool for auth queries

**Strategy**: Track 2 merges first, Track 1 rebases

#### `packages/backend/src/routes/reservation.ts`
**Modified by**: Track 1, Track 4

**Coordination**:
- **Track 1**: Adds `authenticateToken` middleware to routes
- **Track 4**: Adds calendar sync hooks after CRUD operations

**Strategy**: Track 1 adds auth, Track 4 adds sync logic inside protected routes

### Medium-Risk Files

#### `packages/backend/src/routes/invoice.ts`
**Modified by**: Track 1 only

**Critical change**: Line 114 - Replace `'system'` with `req.user?.id`

#### `packages/shared-pricing/src/pricing.test.ts`
**Modified by**: Track 3 only

**No conflicts expected**

## Branch Strategy

### Branch Naming Convention

```
feature/auth-system          # Track 1
feature/db-pooling           # Track 2
feature/pricing-tests        # Track 3
feature/google-calendar      # Track 4
feature/csv-bank-matching    # Track 5
```

### Merge Order (Dependency-Based)

```
Day 1-2:  feature/db-pooling → develop
Day 2-3:  feature/auth-system → develop
Day 2-3:  feature/pricing-tests → develop
Day 3-4:  feature/google-calendar → develop
Day 3-4:  feature/csv-bank-matching → develop
Day 4:    develop → main (after integration tests pass)
```

**Critical Rule**: Wait for dependencies before merging
- Track 2 (DB Pooling) must merge **before** Track 1 (Auth)
- Track 1 (Auth) must merge **before** Track 4 (Calendar) and Track 5 (CSV)

## CI/CD Integration

### GitHub Actions Workflow

Each feature branch triggers:
1. **Linting**: ESLint + Prettier
2. **Type Check**: TypeScript compilation
3. **Unit Tests**: Package-specific tests
4. **Integration Tests**: Cross-package tests

**Merge Requirement**: All checks must pass ✅

### Test Coverage Requirements

| Package | Coverage Target | Enforced By |
|---------|-----------------|-------------|
| `shared-pricing` | ≥90% | Track 3 + CI/CD |
| `backend` | ≥80% | CI/CD |
| `frontend` | ≥70% | CI/CD |

## Integration Testing Plan

### Day 4: Full Integration Test

**Test Scenarios**:

1. **End-to-End Reservation Flow**:
   - User registers → logs in (Track 1)
   - Creates reservation → auto-syncs to calendar (Track 4)
   - Generates invoice → uploads bank CSV (Track 5)
   - Auto-matches transaction → marks invoice as paid

2. **Database Resilience**:
   - Simulate connection failure → verify retry logic (Track 2)
   - High load test → verify pool handles 50+ concurrent requests

3. **Pricing Calculation Accuracy**:
   - Midnight crossing reservation → verify correct fee split
   - Holiday reservation → verify surcharge applied
   - Multi-discount → verify stacking logic (Track 3)

4. **Authentication Security**:
   - Unauthenticated request → verify 401 response
   - Expired token → verify 403 response
   - Role-based access → verify staff vs. admin permissions

### Integration Test Checklist

- [ ] All 5 feature branches merged to `develop`
- [ ] Database migrations run successfully
- [ ] Full E2E test suite passes
- [ ] No console errors in browser
- [ ] API response times <200ms (excluding external APIs)
- [ ] No connection pool exhaustion under load
- [ ] Calendar sync works bidirectionally
- [ ] CSV auto-matching achieves ≥85% accuracy

## Communication Channels

### Slack/Discord Channels

- **#parallel-dev-general**: General coordination
- **#parallel-dev-track1**: Auth system discussions
- **#parallel-dev-track2**: Database pooling
- **#parallel-dev-track3**: Test coverage
- **#parallel-dev-track4**: Calendar integration
- **#parallel-dev-track5**: CSV matching
- **#parallel-dev-blockers**: Report blockers immediately

### Code Review Protocol

**Review Requirements**:
- ≥1 approval from another track developer
- All CI/CD checks passing
- No merge conflicts

**Review Priority**:
1. **Track 2** (DB Pooling): Highest priority (all tracks depend on it)
2. **Track 1** (Auth): Second priority (Track 4 & 5 depend on it)
3. **Track 3, 4, 5**: Equal priority (independent)

## Rollback Plan

### If Track Fails

**Track 1 (Auth) Fails**:
- Impact: Track 4, 5 blocked
- Rollback: Revert to public endpoints temporarily
- Timeline: +1 day to fix

**Track 2 (DB Pooling) Fails**:
- Impact: All tracks affected
- Rollback: Use default pool settings
- Timeline: +0.5 day to fix

**Track 3 (Tests) Fails**:
- Impact: Quality metrics not met
- Rollback: Deploy without ≥90% coverage (document debt)
- Timeline: Can fix post-deployment

**Track 4 (Calendar) Fails**:
- Impact: Manual scheduling continues
- Rollback: Disable calendar routes
- Timeline: Non-blocking, fix in next sprint

**Track 5 (CSV) Fails**:
- Impact: Manual reconciliation continues
- Rollback: Disable transaction routes
- Timeline: Non-blocking, fix in next sprint

## Success Metrics

### Velocity Improvement
- **Sequential**: 10-13 days
- **Parallel**: 4 days
- **Improvement**: 60-70% faster

### Quality Metrics
- Test coverage ≥80% overall
- Zero production-blocking bugs
- All auth endpoints protected
- Calendar sync >95% success rate
- CSV auto-match ≥85% accuracy

### Team Coordination
- ≤2 merge conflicts total
- Daily sync meetings ≤15 minutes
- Zero deployment rollbacks

## Resources

### Documentation
- [Track 1: Authentication System](./TRACK-1-AUTH-SYSTEM.md)
- [Track 2: Database Pooling](./TRACK-2-DB-POOLING.md)
- [Track 3: Test Coverage](./TRACK-3-TEST-COVERAGE.md)
- [Track 4: Google Calendar](./TRACK-4-GOOGLE-CALENDAR.md)
- [Track 5: CSV Bank Matching](./TRACK-5-CSV-BANK-MATCHING.md)

### Quick Reference Commands

```bash
# Start development
npm run dev

# Run all tests
npm test

# Run specific package tests
cd packages/backend && npm test
cd packages/shared-pricing && npm test

# Check coverage
npm run test:coverage

# Database migration
cd packages/backend && npm run db:migrate

# Type check
npm run type-check

# Lint and format
npm run lint
npm run format

# Build production
npm run build
```

### Emergency Contacts

- **Project Lead**: [Name] - [Email/Slack]
- **Backend Lead**: [Name] - [Email/Slack]
- **Frontend Lead**: [Name] - [Email/Slack]
- **DevOps**: [Name] - [Email/Slack]

---

## Getting Started Checklist

**Before starting development**:

- [ ] Read this coordination guide
- [ ] Review your track implementation guide
- [ ] Create feature branch with correct naming
- [ ] Set up local development environment
- [ ] Join relevant Slack/Discord channels
- [ ] Attend Day 1 sync meeting

**During development**:

- [ ] Attend daily 15-minute sync meetings
- [ ] Check coordination notes in your track guide
- [ ] Communicate blockers immediately
- [ ] Follow merge order for shared files
- [ ] Write tests alongside code
- [ ] Update documentation

**Before merging**:

- [ ] All tests passing locally
- [ ] CI/CD checks passing
- [ ] Code reviewed and approved
- [ ] No merge conflicts with `develop`
- [ ] Documentation updated
- [ ] Coordination checkpoints met

---

## Final Integration Day (Day 4)

### Morning (9:00 AM - 12:00 PM)
- Final sync meeting
- Merge all feature branches to `develop`
- Resolve any merge conflicts
- Run full test suite

### Afternoon (1:00 PM - 5:00 PM)
- Integration testing
- Performance testing
- Security testing
- Bug fixes

### Evening (5:00 PM - 6:00 PM)
- Code freeze
- Final code review
- Prepare deployment
- Celebrate successful parallel development! 🎉

---

**Last Updated**: 2025-10-10
**Version**: 1.0
**Status**: Ready for execution
