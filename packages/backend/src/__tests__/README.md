# Backend Test Suite

Comprehensive test suite for Studio Revenue Manager backend API.

## Quick Start

### Prerequisites

1. PostgreSQL installed and running
2. Node.js 20+ installed
3. Test database created

### Setup

1. Create test database:
```bash
createdb studio_revenue_test
```

2. Copy environment file:
```bash
cp .env.example .env.test
```

3. Update `.env.test` with test database credentials:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/studio_revenue_test
DB_NAME=studio_revenue_test
```

4. Run migrations on test database:
```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/studio_revenue_test npm run db:migrate
```

5. Install dependencies:
```bash
npm install
```

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (for development)
```bash
npm run test:watch
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

### Run Only Integration Tests
```bash
npm test -- integration/
```

### Run Only E2E Tests
```bash
npm test -- e2e/
```

## Test Organization

```
__tests__/
├── README.md                    # This file
├── setup.ts                     # Global test setup
├── utils/                       # Test utilities
│   ├── testDb.ts               # Database helpers
│   ├── testAuth.ts             # Auth helpers
│   ├── testData.ts             # Data factories
│   └── mockApis.ts             # API mocks
├── integration/                 # Integration tests
│   ├── auth.test.ts            # Auth flow tests
│   ├── database.test.ts        # DB transaction tests
│   └── errorHandling.test.ts   # Error scenarios
└── e2e/                        # End-to-end tests
    ├── reservation.test.ts     # Reservation lifecycle
    ├── calendar.test.ts        # Calendar sync
    └── csvBank.test.ts         # CSV bank matching
```

## Test Types

### Integration Tests
Test individual features with real database:
- Authentication flows
- Database transactions
- Error handling

### E2E Tests
Test complete user workflows:
- Reservation lifecycle (quote → reservation → invoice)
- Calendar synchronization
- CSV import and matching

## Writing Tests

### Example Test Structure

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../index';
import { TestDb } from '../utils/testDb';
import { TestAuth } from '../utils/testAuth';
import { TestData } from '../utils/testData';

describe('Feature Name', () => {
  let authToken: string;

  beforeAll(async () => {
    await TestDb.clean();
    const { token } = await TestAuth.createUserWithToken();
    authToken = token;
  });

  afterAll(async () => {
    await TestDb.clean();
  });

  beforeEach(async () => {
    await TestData.cleanup();
  });

  it('should do something', async () => {
    const response = await request(app)
      .post('/api/endpoint')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ data: 'value' });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });
});
```

### Using Test Utilities

#### Creating Test Users
```typescript
import { TestAuth } from '../utils/testAuth';

// Simple user
const { user, token } = await TestAuth.createUserWithToken();

// With specific role
const { user, token } = await TestAuth.createUserWithToken(
  'admin@test.com',
  'password123',
  'Admin User',
  'admin'
);
```

#### Creating Test Data
```typescript
import { TestData } from '../utils/testData';

// Create reservation
const reservation = await TestData.createReservation();

// Create invoice
const invoice = await TestData.createInvoice(reservation.id, {
  totalAmount: 100000
});

// Create bank transaction
const transaction = await TestData.createBankTransaction({
  amount: 50000,
  description: 'Studio payment'
});
```

#### Mocking External APIs
```typescript
import { MockApis } from '../utils/mockApis';

beforeAll(() => {
  MockApis.disableNetConnect();
});

afterAll(() => {
  MockApis.enableNetConnect();
});

beforeEach(() => {
  // Mock successful calendar event creation
  MockApis.mockCalendarCreateEvent(true);
});

afterEach(() => {
  MockApis.cleanAll();
});
```

#### Database Operations
```typescript
import { TestDb } from '../utils/testDb';

// Clean all test data
await TestDb.clean();

// Execute in transaction (auto-rollback)
const result = await TestDb.withTransaction(async (client) => {
  return await client.query('SELECT * FROM users');
});

// Check connection
const isConnected = await TestDb.isConnected();

// Get row count
const count = await TestDb.count('reservations');
```

## Best Practices

### 1. Test Isolation
```typescript
beforeEach(async () => {
  await TestData.cleanup(); // Clean data before each test
});
```

### 2. Descriptive Test Names
```typescript
// Good
it('should reject login with invalid password', async () => {});

// Bad
it('login test', async () => {});
```

### 3. Clear Assertions
```typescript
// Good
expect(response.status).toBe(201);
expect(response.body.user.email).toBe('test@example.com');
expect(response.body.user).not.toHaveProperty('password');

// Bad
expect(response).toBeTruthy();
```

### 4. Test Both Success and Failure
```typescript
describe('User Registration', () => {
  it('should register with valid data', async () => {
    // Test success case
  });

  it('should reject with invalid email', async () => {
    // Test failure case
  });
});
```

### 5. Use Factories for Test Data
```typescript
// Good
const reservation = await TestData.createReservation();

// Bad
const reservation = await pool.query(
  'INSERT INTO reservations ... VALUES ...'
);
```

## Debugging Tests

### Run Single Test
```bash
npm test -- --grep "should register new user"
```

### Show Console Output
```bash
npm test -- --reporter=verbose
```

### Debug in VS Code
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["test"],
  "console": "integratedTerminal"
}
```

## Coverage Goals

| Category | Target | Current |
|----------|--------|---------|
| Overall | 90% | TBD |
| Routes | 95% | TBD |
| Services | 90% | TBD |
| Middleware | 85% | TBD |
| Utils | 90% | TBD |

## Common Issues

### Database Connection Errors
```
Error: Must use test database!
```
**Solution**: Ensure `.env.test` has correct DATABASE_URL with 'test' in name

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution**: Kill process on port 3000 or change PORT in `.env.test`

### Migration Errors
```
Error: relation "users" does not exist
```
**Solution**: Run migrations on test database:
```bash
DATABASE_URL=<test-db-url> npm run db:migrate
```

### Timeout Errors
```
Error: Test timeout of 5000ms exceeded
```
**Solution**: Increase timeout in vitest.config.ts or specific test:
```typescript
it('should do something', async () => {
  // test code
}, 10000); // 10 second timeout
```

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Commits to main
- Pre-deployment

### GitHub Actions Example
```yaml
- name: Run Tests
  run: npm test -- --coverage
  env:
    DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
    JWT_SECRET: ${{ secrets.JWT_SECRET }}
```

## Performance

- Tests should complete in < 2 minutes
- Individual tests should take < 5 seconds
- Use parallel execution where possible
- Mock external services to avoid network delays

## Security

- Never commit `.env.test` with real credentials
- Use separate test database
- Clean up sensitive data after tests
- Don't test with production data

## Contributing

1. Write tests for new features
2. Maintain >90% coverage
3. Follow existing patterns
4. Update this README if adding new utilities
5. Ensure all tests pass before PR

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Nock Documentation](https://github.com/nock/nock)

## Support

For questions or issues:
1. Check this README
2. Review existing tests for examples
3. Check TEST_COVERAGE_REPORT.md
4. Ask the backend team
