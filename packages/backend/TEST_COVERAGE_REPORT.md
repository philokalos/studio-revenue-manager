# Test Coverage Report

## Overview

This document provides a comprehensive overview of the test suite for the Studio Revenue Manager backend.

## Test Structure

```
src/__tests__/
├── setup.ts                          # Global test setup
├── utils/
│   ├── testDb.ts                    # Database utilities
│   ├── testAuth.ts                  # Authentication helpers
│   ├── testData.ts                  # Test data factories
│   └── mockApis.ts                  # External API mocks
├── integration/
│   ├── auth.test.ts                 # Auth integration tests
│   ├── database.test.ts             # Database transaction tests
│   └── errorHandling.test.ts        # Error handling tests
└── e2e/
    ├── reservation.test.ts          # Reservation lifecycle tests
    ├── calendar.test.ts             # Calendar sync tests
    └── csvBank.test.ts              # CSV bank matching tests
```

## Test Coverage Goals

| Category | Target | Status |
|----------|--------|--------|
| Overall | ≥90% | In Progress |
| Routes | ≥95% | In Progress |
| Services | ≥90% | In Progress |
| Middleware | ≥85% | In Progress |
| Utils | ≥90% | In Progress |

## Test Suites

### 1. Authentication Integration Tests (`auth.test.ts`)

**Coverage**: 110 test cases

#### Test Categories:
- **User Registration Flow** (4 tests)
  - Valid registration
  - Duplicate email rejection
  - Weak password rejection
  - Missing fields validation

- **Login with Credentials** (4 tests)
  - Valid credentials
  - Invalid password
  - Non-existent email
  - Missing credentials

- **Token Verification** (4 tests)
  - Valid token verification
  - Missing token rejection
  - Invalid token rejection
  - Malformed header rejection

- **Protected Route Access** (2 tests)
  - Authenticated access
  - Unauthenticated denial

- **Token Expiration** (1 test)
  - Expired token rejection

- **Role-Based Access Control** (3 tests)
  - Admin access
  - Manager access
  - Staff access

- **Security Edge Cases** (3 tests)
  - User existence leak prevention
  - Email sanitization
  - SQL injection prevention

### 2. Database Transaction Tests (`database.test.ts`)

**Coverage**: 15 test cases

#### Test Categories:
- **Transaction Rollback** (2 tests)
  - Rollback on error
  - Commit on success

- **Concurrent Operations** (2 tests)
  - Concurrent inserts
  - Row locking

- **Foreign Key Constraints** (3 tests)
  - Invalid FK enforcement
  - Valid FK reference
  - Referenced row deletion prevention

- **Cascade Deletes** (1 test)
  - Invoice items cascade

- **Connection Pool** (2 tests)
  - Pool exhaustion handling
  - Connection release

- **Retry Logic** (1 test)
  - Deadlock retry

- **Constraints** (3 tests)
  - Unique constraints
  - Check constraints
  - NOT NULL constraints

### 3. Error Handling Tests (`errorHandling.test.ts`)

**Coverage**: 28 test cases

#### Test Categories:
- **400 Bad Request** (4 tests)
  - Missing required fields
  - Invalid date format
  - Invalid data types
  - Malformed JSON

- **401 Unauthorized** (3 tests)
  - Missing auth token
  - Invalid credentials
  - Malformed auth header

- **403 Forbidden** (3 tests)
  - Invalid token
  - Expired token
  - Insufficient permissions

- **404 Not Found** (2 tests)
  - Non-existent route
  - Non-existent resource

- **500 Internal Server Error** (2 tests)
  - Database error handling
  - Sensitive data leak prevention

- **Validation Errors** (4 tests)
  - Email format
  - Password length
  - Date ranges
  - Numeric ranges

- **Error Response Format** (2 tests)
  - Consistent format
  - Helpful messages

- **CORS and Headers** (2 tests)
  - CORS headers
  - OPTIONS requests

### 4. Reservation E2E Tests (`reservation.test.ts`)

**Coverage**: 18 test cases

#### Test Categories:
- **Complete Lifecycle** (1 comprehensive test)
  - Quote creation
  - Reservation from quote
  - View details
  - Headcount change
  - Update reservation
  - Delete reservation

- **Error Scenarios** (4 tests)
  - Overlapping bookings
  - Invalid date ranges
  - Past dates
  - Invalid people count

- **Permission Checks** (2 tests)
  - Authentication requirement
  - Authorized access

- **Status Transitions** (2 tests)
  - Pending to confirmed
  - Transition to cancelled

- **Bulk Operations** (2 tests)
  - List all reservations
  - Filter by date range

### 5. Calendar Sync E2E Tests (`calendar.test.ts`)

**Coverage**: 20 test cases

#### Test Categories:
- **OAuth Flow** (3 tests)
  - Valid code handling
  - Invalid code rejection
  - Authentication requirement

- **Push to Calendar** (3 tests)
  - Event creation
  - API error handling
  - Non-existent reservation

- **Pull from Calendar** (2 tests)
  - Fetch events
  - Access denial

- **Update Event** (2 tests)
  - Successful update
  - Event not found

- **Delete Event** (2 tests)
  - Successful deletion
  - Already deleted

- **Sync History** (2 tests)
  - Track operations
  - Retrieve history

- **Error Handling** (3 tests)
  - Network timeouts
  - Rate limiting
  - Retry logic

- **Bidirectional Sync** (1 test)
  - Reservation to calendar sync

### 6. CSV Bank Matching E2E Tests (`csvBank.test.ts`)

**Coverage**: 20 test cases

#### Test Categories:
- **File Upload** (4 tests)
  - KB bank upload
  - Shinhan bank upload
  - Missing file rejection
  - Unsupported format

- **Bank Format Parsing** (2 tests)
  - KB format parsing
  - Shinhan format parsing

- **Automatic Matching** (2 tests)
  - Full amount match
  - Partial amount match

- **Manual Matching** (3 tests)
  - Manual confirmation
  - Invalid match rejection
  - Duplicate prevention

- **Export Results** (3 tests)
  - Export matched transactions
  - Export unmatched transactions
  - JSON export format

- **Import History** (2 tests)
  - History tracking
  - Statistics inclusion

- **Edge Cases** (5 tests)
  - Malformed CSV
  - Duplicate transactions
  - Empty CSV
  - Special characters
  - Large files

## Test Utilities

### TestDb
Provides database management utilities:
- `clean()` - Clean all test data
- `seed()` - Seed test data
- `withTransaction()` - Execute in rollback transaction
- `isConnected()` - Check connectivity
- `count()` - Get row count

### TestAuth
Provides authentication helpers:
- `createUser()` - Create test user
- `generateToken()` - Generate JWT
- `createUserWithToken()` - Create user + token
- `cleanup()` - Remove test users
- `verifyToken()` - Verify token
- `generateExpiredToken()` - Create expired token

### TestData
Provides test data factories:
- `createQuote()` - Create test quote
- `createReservation()` - Create test reservation
- `createInvoice()` - Create test invoice
- `createBankTransaction()` - Create test transaction
- `createHeadcountChange()` - Create headcount change
- `generateBankCSV()` - Generate CSV data
- `cleanup()` - Remove all test data

### MockApis
Provides external API mocking:
- `mockGoogleOAuth()` - Mock OAuth flow
- `mockCalendarCreateEvent()` - Mock event creation
- `mockCalendarUpdateEvent()` - Mock event update
- `mockCalendarDeleteEvent()` - Mock event deletion
- `mockCalendarListEvents()` - Mock event listing
- `cleanAll()` - Clean all mocks
- `disableNetConnect()` / `enableNetConnect()` - Control network

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode
```bash
npm test:watch
```

### Coverage Report
```bash
npm test -- --coverage
```

### Specific Test File
```bash
npm test -- auth.test.ts
```

### Specific Test Suite
```bash
npm test -- --grep "Authentication"
```

## Test Database Setup

1. Create test database:
```sql
CREATE DATABASE studio_revenue_test;
```

2. Run migrations:
```bash
npm run db:migrate
```

3. Set environment variables in `.env.test`:
```
DATABASE_URL=postgresql://user:pass@localhost:5432/studio_revenue_test
```

## Coverage Thresholds

Configured in `vitest.config.ts`:
```typescript
coverage: {
  thresholds: {
    lines: 90,
    functions: 90,
    branches: 85,
    statements: 90
  }
}
```

## Best Practices

1. **Isolation**: Each test is isolated with `beforeEach` cleanup
2. **Realistic Data**: Use factory functions for consistent test data
3. **Mocking**: External APIs are mocked to prevent network calls
4. **Assertions**: Clear, specific assertions with helpful messages
5. **Error Cases**: Both success and failure paths tested
6. **Transaction Safety**: Use test database with automatic rollback
7. **Performance**: Tests run in parallel where possible

## CI/CD Integration

Tests run automatically on:
- Pull request creation
- Commits to main branch
- Pre-deployment validation

## Known Issues

None currently.

## Future Improvements

1. Add performance benchmarking tests
2. Add load testing for concurrent operations
3. Expand security testing (XSS, CSRF)
4. Add snapshot testing for API responses
5. Implement visual regression testing for generated PDFs
6. Add mutation testing for test quality validation

## Maintenance

- Tests should be updated whenever routes/services change
- Coverage reports should be reviewed regularly
- Flaky tests should be identified and fixed immediately
- Test data should be kept minimal and focused

## Contact

For questions about tests, contact the backend team.
