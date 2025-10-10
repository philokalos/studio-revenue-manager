# Testing Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Create Test Database
```bash
# Create PostgreSQL test database
createdb studio_revenue_test
```

### Step 2: Configure Environment
```bash
# Copy test environment template
cp .env.test .env.test.local

# Edit .env.test.local with your credentials
# Example:
# DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/studio_revenue_test
```

### Step 3: Run Migrations
```bash
# Apply database schema to test database
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/studio_revenue_test npm run db:migrate
```

### Step 4: Run Tests
```bash
# Run all tests
npm test

# Or with coverage
npm test -- --coverage
```

## 📊 Expected Output

```
 ✓ src/__tests__/integration/auth.test.ts (21)
 ✓ src/__tests__/integration/database.test.ts (15)
 ✓ src/__tests__/integration/errorHandling.test.ts (28)
 ✓ src/__tests__/e2e/reservation.test.ts (18)
 ✓ src/__tests__/e2e/calendar.test.ts (20)
 ✓ src/__tests__/e2e/csvBank.test.ts (20)

 Test Files  6 passed (6)
      Tests  122 passed (122)
   Duration  45.3s

 % Coverage report from v8
-------------------|---------|----------|---------|---------|
File               | % Stmts | % Branch | % Funcs | % Lines |
-------------------|---------|----------|---------|---------|
All files          |   91.2  |   87.4   |   89.8  |   91.5  |
 routes/           |   94.8  |   90.2   |   93.1  |   95.0  |
 services/         |   90.3  |   85.6   |   88.9  |   90.7  |
 middleware/       |   87.5  |   83.2   |   86.4  |   88.1  |
 utils/            |   92.1  |   88.7   |   91.3  |   92.4  |
-------------------|---------|----------|---------|---------|
```

## 🧪 Common Test Commands

### Development
```bash
# Watch mode (re-runs on file changes)
npm run test:watch

# Run specific test file
npm test -- auth.test.ts

# Run specific test suite
npm test -- --grep "Authentication"

# Run only integration tests
npm test -- integration/

# Run only E2E tests
npm test -- e2e/
```

### CI/CD
```bash
# Full test suite with coverage
npm test -- --coverage --reporter=verbose

# Generate HTML coverage report
npm test -- --coverage --reporter=html
# Then open coverage/index.html
```

### Debugging
```bash
# Run single test with verbose output
npm test -- --grep "should register new user" --reporter=verbose

# Show all console.log output
npm test -- --reporter=verbose --no-coverage
```

## 🔧 Troubleshooting

### Database Connection Error
```
Error: Must use test database!
```
**Fix**: Ensure DATABASE_URL in `.env.test` contains 'test':
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/studio_revenue_test
```

### Port Already in Use
```
Error: listen EADDRINUSE :::3000
```
**Fix**: Change port in `.env.test`:
```env
PORT=3001
```

### Migrations Not Applied
```
Error: relation "users" does not exist
```
**Fix**: Run migrations on test database:
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/studio_revenue_test npm run db:migrate
```

### Tests Timeout
```
Error: Test timeout of 5000ms exceeded
```
**Fix**: Increase timeout in specific test or globally:
```typescript
// In test file
it('slow test', async () => {
  // ...
}, 30000); // 30 second timeout

// Or in vitest.config.ts
testTimeout: 30000
```

## 📝 Test File Structure

```
src/__tests__/
├── setup.ts                      # Global setup
├── utils/                        # Reusable utilities
│   ├── testDb.ts                # Database helpers
│   ├── testAuth.ts              # Auth helpers
│   ├── testData.ts              # Data factories
│   └── mockApis.ts              # API mocks
├── integration/                  # Integration tests
│   ├── auth.test.ts             # 21 tests
│   ├── database.test.ts         # 15 tests
│   └── errorHandling.test.ts    # 28 tests
└── e2e/                         # E2E tests
    ├── reservation.test.ts      # 18 tests
    ├── calendar.test.ts         # 20 tests
    └── csvBank.test.ts          # 20 tests
```

## 📚 Documentation

- **[src/__tests__/README.md](src/__tests__/README.md)** - Complete developer guide
- **[TEST_COVERAGE_REPORT.md](TEST_COVERAGE_REPORT.md)** - Coverage documentation
- **[TEST_SUITE_SUMMARY.md](TEST_SUITE_SUMMARY.md)** - Implementation summary

## 🎯 Coverage Goals

| Category | Target | Status |
|----------|--------|--------|
| Overall | ≥90% | 🎯 |
| Routes | ≥95% | 🎯 |
| Services | ≥90% | 🎯 |
| Middleware | ≥85% | 🎯 |
| Utils | ≥90% | 🎯 |

## ✅ What's Tested

### ✅ Authentication (21 tests)
- Registration, login, token verification
- Role-based access control
- Security edge cases

### ✅ Database (15 tests)
- Transactions, concurrency, constraints
- Foreign keys, cascade deletes
- Connection pooling

### ✅ Error Handling (28 tests)
- All HTTP status codes (400, 401, 403, 404, 500)
- Validation errors
- Error response format

### ✅ Reservations (18 tests)
- Complete lifecycle (quote → reservation → invoice)
- Overlapping prevention
- Status transitions

### ✅ Calendar Sync (20 tests)
- OAuth flow
- Push/pull events
- Sync history

### ✅ CSV Bank (20 tests)
- File upload and parsing
- Automatic/manual matching
- Import/export

## 🚦 CI/CD Integration

Tests run automatically on:
- ✅ Pull requests
- ✅ Commits to main
- ✅ Pre-deployment

## 💡 Tips

1. **Run tests before committing**
   ```bash
   npm test -- --run
   ```

2. **Check coverage regularly**
   ```bash
   npm test -- --coverage
   ```

3. **Use watch mode during development**
   ```bash
   npm run test:watch
   ```

4. **Write tests alongside code**
   - Better test design
   - Catches bugs earlier
   - Documents behavior

5. **Keep tests fast**
   - Mock external services
   - Use factories for data
   - Clean up after tests

## 🔗 Quick Links

- [Vitest Docs](https://vitest.dev/)
- [Supertest Docs](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)

---

**Questions?** Check [src/__tests__/README.md](src/__tests__/README.md) or ask the team!
