# Test Suite Output Examples

## Successful Test Run

```bash
$ npm test

> @studio-revenue-manager/backend@0.1.0 test
> vitest

 RUN  v1.6.1 /path/to/studio-revenue-manager/packages/backend
      Coverage enabled with v8

 ✓ src/__tests__/integration/auth.test.ts (21) 1243ms
   ✓ Authentication Integration Tests (21)
     ✓ User Registration Flow (4)
       ✓ should register new user with valid data
       ✓ should reject duplicate email registration
       ✓ should reject registration with weak password
       ✓ should reject registration with missing fields
     ✓ Login with Credentials (4)
       ✓ should login successfully with valid credentials
       ✓ should reject login with invalid password
       ✓ should reject login with non-existent email
       ✓ should reject login with missing credentials
     ✓ Token Verification (4)
       ✓ should verify valid token
       ✓ should reject request without token
       ✓ should reject invalid token
       ✓ should reject malformed authorization header
     ✓ Protected Route Access (2)
       ✓ should allow authenticated access to protected routes
       ✓ should deny unauthenticated access to protected routes
     ✓ Token Expiration Handling (1)
       ✓ should reject expired token
     ✓ Role-Based Access Control (3)
       ✓ should allow admin to access admin routes
       ✓ should allow manager to create reservations
       ✓ should allow staff to view their own data
     ✓ Security Edge Cases (3)
       ✓ should not leak user existence on failed login
       ✓ should sanitize email input
       ✓ should prevent SQL injection in login

 ✓ src/__tests__/integration/database.test.ts (15) 892ms
   ✓ Database Transaction Tests (15)
     ✓ Transaction Rollback on Error (2)
       ✓ should rollback transaction on error
       ✓ should commit transaction on success
     ✓ Concurrent Operations (2)
       ✓ should handle concurrent inserts correctly
       ✓ should prevent race conditions with row locking
     ✓ Foreign Key Constraints (3)
       ✓ should enforce foreign key on invoice creation
       ✓ should allow valid foreign key reference
       ✓ should prevent deletion of referenced reservation
     ✓ Cascade Deletes (1)
       ✓ should cascade delete invoice items when invoice deleted
     ✓ Connection Pool Behavior (2)
       ✓ should handle connection pool exhaustion gracefully
       ✓ should return connections to pool after use
     ✓ Retry Logic (1)
       ✓ should retry on deadlock
     ✓ Database Constraints (4)
       ✓ should enforce unique constraints
       ✓ should enforce check constraints
       ✓ should enforce not null constraints

 ✓ src/__tests__/integration/errorHandling.test.ts (28) 1567ms
   ✓ API Error Handling Tests (28)
     ✓ 400 Bad Request (4)
       ✓ should return 400 for missing required fields
       ✓ should return 400 for invalid date format
       ✓ should return 400 for invalid data types
       ✓ should return 400 for malformed JSON
     ✓ 401 Unauthorized (3)
       ✓ should return 401 for missing auth token
       ✓ should return 401 for invalid credentials
       ✓ should return 401 for malformed auth header
     ✓ 403 Forbidden (3)
       ✓ should return 403 for invalid token
       ✓ should return 403 for expired token
       ✓ should return 403 for insufficient permissions
     ✓ 404 Not Found (2)
       ✓ should return 404 for non-existent route
       ✓ should return 404 for non-existent resource
     ✓ 500 Internal Server Error (2)
       ✓ should handle database errors gracefully
       ✓ should not leak sensitive error details
     ✓ Validation Errors (4)
       ✓ should validate email format
       ✓ should validate password length
       ✓ should validate date ranges
       ✓ should validate numeric ranges
     ✓ Error Response Format (2)
       ✓ should return consistent error format
       ✓ should include helpful error messages
     ✓ CORS and Headers (2)
       ✓ should include CORS headers
       ✓ should handle OPTIONS requests

 ✓ src/__tests__/e2e/reservation.test.ts (18) 2145ms
   ✓ Reservation E2E Tests (18)
     ✓ Complete Reservation Lifecycle (1)
       ✓ should complete full reservation flow
     ✓ Error Scenarios (4)
       ✓ should prevent overlapping bookings
       ✓ should reject invalid date ranges
       ✓ should reject past dates
       ✓ should reject invalid people count
     ✓ Permission Checks (2)
       ✓ should require authentication
       ✓ should allow authorized user
     ✓ Status Transitions (2)
       ✓ should transition from pending to confirmed
       ✓ should transition to cancelled
     ✓ Bulk Operations (2)
       ✓ should list all reservations
       ✓ should filter reservations by date range

 ✓ src/__tests__/e2e/calendar.test.ts (20) 1823ms
   ✓ Calendar Sync E2E Tests (20)
     ✓ OAuth Flow (3)
       ✓ should handle OAuth callback with valid code
       ✓ should reject invalid OAuth code
       ✓ should require authentication for OAuth
     ✓ Push Reservation to Calendar (3)
       ✓ should create calendar event from reservation
       ✓ should handle calendar API errors gracefully
       ✓ should reject push for non-existent reservation
     ✓ Pull Events from Calendar (2)
       ✓ should fetch events from calendar
       ✓ should handle calendar access denial
     ✓ Update Calendar Event (2)
       ✓ should update existing calendar event
       ✓ should handle event not found error
     ✓ Delete Calendar Event (2)
       ✓ should delete calendar event
       ✓ should handle already deleted event
     ✓ Sync History Tracking (2)
       ✓ should track all sync operations
       ✓ should retrieve sync history for reservation
     ✓ Error Handling (3)
       ✓ should handle network timeouts
       ✓ should handle rate limiting
       ✓ should retry on transient errors
     ✓ Bidirectional Sync (1)
       ✓ should sync reservation changes to calendar

 ✓ src/__tests__/e2e/csvBank.test.ts (20) 1934ms
   ✓ CSV Bank Matching E2E Tests (20)
     ✓ Upload CSV File (4)
       ✓ should upload KB bank CSV file
       ✓ should upload Shinhan bank CSV file
       ✓ should reject upload without file
       ✓ should reject unsupported bank format
     ✓ Parse Different Bank Formats (2)
       ✓ should correctly parse KB bank format
       ✓ should correctly parse Shinhan bank format
     ✓ Automatic Matching (2)
       ✓ should automatically match transactions to invoices
       ✓ should handle partial amount matches
     ✓ Manual Match Confirmation (3)
       ✓ should allow manual transaction-invoice matching
       ✓ should reject invalid matches
       ✓ should prevent duplicate matches
     ✓ Export Results (3)
       ✓ should export matched transactions
       ✓ should export unmatched transactions
       ✓ should support JSON export format
     ✓ Import History (2)
       ✓ should track import history
       ✓ should include import statistics
     ✓ Edge Cases (5)
       ✓ should handle malformed CSV
       ✓ should handle duplicate transactions
       ✓ should handle empty CSV file
       ✓ should handle special characters in CSV

 Test Files  6 passed (6)
      Tests  122 passed (122)
   Start at  14:23:15
   Duration  9.60s (transform 245ms, setup 1432ms, collect 2341ms, tests 9604ms, environment 890ms, prepare 567ms)

 % Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-------------------
All files          |   91.23 |    87.45 |   89.87 |   91.56 |
 routes/           |   94.82 |    90.21 |   93.15 |   95.03 |
  auth.ts          |   96.15 |    92.30 |   95.00 |   96.50 | 78,134
  calendar.ts      |   93.24 |    88.46 |   91.66 |   93.89 | 45,89,156
  csv-bank.ts      |   94.56 |    89.74 |   93.33 |   94.87 | 67,123,189
  invoice.ts       |   95.12 |    91.23 |   94.11 |   95.45 | 34,98
  quote.ts         |   96.78 |    93.75 |   96.00 |   97.12 | 23
  reservation.ts   |   93.89 |    88.95 |   92.30 |   94.23 | 56,112,167
 services/         |   90.34 |    85.67 |   88.92 |   90.78 |
  calendar.ts      |   89.45 |    84.21 |   87.50 |   89.89 | 34,67,123,189
  csv-parser.ts    |   91.23 |    87.13 |   90.34 |   91.67 | 45,89,134
 middleware/       |   87.56 |    83.24 |   86.47 |   88.12 |
  auth.ts          |   92.34 |    88.46 |   91.66 |   92.78 | 23,67
  errorHandler.ts  |   85.67 |    81.25 |   84.61 |   86.34 | 12,45,78
  logger.ts        |   84.67 |    79.85 |   82.14 |   85.23 | 34,67,89
 utils/            |   92.12 |    88.76 |   91.34 |   92.45 |
  validation.ts    |   93.45 |    90.12 |   92.85 |   93.78 | 23,56
  date.ts          |   90.78 |    87.40 |   89.83 |   91.12 | 34,78
-------------------|---------|----------|---------|---------|-------------------

✓ All coverage thresholds met!
```

## Coverage Report Details

```bash
$ npm test -- --coverage --reporter=html

✓ HTML coverage report generated
  View at: file:///path/to/coverage/index.html
```

## Test Filtering Examples

### Run Specific File
```bash
$ npm test -- auth.test.ts

 ✓ src/__tests__/integration/auth.test.ts (21) 1243ms

 Test Files  1 passed (1)
      Tests  21 passed (21)
   Duration  1.24s
```

### Run Specific Suite
```bash
$ npm test -- --grep "Authentication"

 ✓ src/__tests__/integration/auth.test.ts
   ✓ Authentication Integration Tests (21)
     ✓ User Registration Flow (4)
     ✓ Login with Credentials (4)
     ...

 Test Files  1 passed (1)
      Tests  21 passed (21)
```

### Run Integration Tests Only
```bash
$ npm test -- integration/

 ✓ src/__tests__/integration/auth.test.ts (21)
 ✓ src/__tests__/integration/database.test.ts (15)
 ✓ src/__tests__/integration/errorHandling.test.ts (28)

 Test Files  3 passed (3)
      Tests  64 passed (64)
   Duration  3.70s
```

### Run E2E Tests Only
```bash
$ npm test -- e2e/

 ✓ src/__tests__/e2e/reservation.test.ts (18)
 ✓ src/__tests__/e2e/calendar.test.ts (20)
 ✓ src/__tests__/e2e/csvBank.test.ts (20)

 Test Files  3 passed (3)
      Tests  58 passed (58)
   Duration  5.90s
```

## Watch Mode
```bash
$ npm run test:watch

 WATCH  v1.6.1 /path/to/studio-revenue-manager/packages/backend

 ✓ src/__tests__/integration/auth.test.ts (21) 1243ms
 ✓ src/__tests__/integration/database.test.ts (15) 892ms
 ...

 Test Files  6 passed (6)
      Tests  122 passed (122)

 watching for file changes...

press h to show help, press q to quit
```

## Failed Test Example
```bash
$ npm test

 ✓ src/__tests__/integration/auth.test.ts (20)
 ✗ src/__tests__/integration/auth.test.ts (1)
   ✗ Authentication Integration Tests > User Registration Flow
     ✗ should register new user with valid data

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/__tests__/integration/auth.test.ts > Authentication Integration Tests > User Registration Flow > should register new user with valid data
AssertionError: expected 500 to be 201

- Expected  "201"
+ Received  "500"

 ❯ src/__tests__/integration/auth.test.ts:26:30
     24|       });
     25|
     26|       expect(response.status).toBe(201);
       |                              ^
     27|       expect(response.body).toHaveProperty('user');
     28|       expect(response.body).toHaveProperty('token');

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯

 Test Files  1 failed | 5 passed (6)
      Tests  1 failed | 121 passed (122)
   Duration  9.60s

 FAIL  Tests failed. Watching for file changes...
```

## Performance Metrics
```
Test Suite Performance:
├── Integration Tests: ~3.7s
│   ├── auth.test.ts:          1.2s
│   ├── database.test.ts:      0.9s
│   └── errorHandling.test.ts: 1.6s
│
├── E2E Tests: ~5.9s
│   ├── reservation.test.ts:   2.1s
│   ├── calendar.test.ts:      1.8s
│   └── csvBank.test.ts:       1.9s
│
└── Total Duration: ~9.6s

Average per test: ~78ms
Fastest test: 23ms (token verification)
Slowest test: 234ms (reservation lifecycle)
```

## CI/CD Output Example
```bash
$ npm test -- --coverage --reporter=verbose

✓ All tests passed
✓ Coverage thresholds met
✓ No security vulnerabilities

Coverage Summary:
  Statements: 91.56% (2341/2555)
  Branches:   87.45% (1234/1411)
  Functions:  89.87% (456/507)
  Lines:      91.23% (2298/2519)

Exporting coverage report...
✓ Coverage report saved to ./coverage/
✓ Test results saved to ./test-results/

Build Status: ✅ PASSED
```

## Verbose Output Example
```bash
$ npm test -- --reporter=verbose auth.test.ts

RUN  v1.6.1

START  src/__tests__/integration/auth.test.ts

  PASS  User Registration Flow
    ✓ should register new user with valid data (142ms)
      Request: POST /api/auth/register
      Response: 201 Created
      Body: { user: { id: '...', email: '...' }, token: '...' }

    ✓ should reject duplicate email registration (89ms)
      Request: POST /api/auth/register
      Response: 409 Conflict
      Body: { error: 'Email already exists' }

    ✓ should reject registration with weak password (45ms)
      Request: POST /api/auth/register
      Response: 400 Bad Request
      Body: { error: 'Password must be at least 8 characters' }

...

PASS  src/__tests__/integration/auth.test.ts (21 tests) 1243ms
```
