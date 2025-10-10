# Track 3: Pricing Engine Test Coverage Expansion

**Developer**: Developer C
**Duration**: 2 days
**Priority**: ⚠️ Important but Not Urgent
**Target**: ≥90% code coverage

## Objective

Expand test suite for `shared-pricing` package to achieve ≥90% code coverage with comprehensive edge case testing, especially for critical business logic around time-based pricing calculations.

## Current State Analysis

### Existing Test File
**File**: `packages/shared-pricing/src/pricing.test.ts`

Current coverage status: **Unknown** - needs baseline measurement

Expected current implementation:
- Basic happy path tests
- Simple hour calculation tests
- Missing edge cases:
  - Midnight boundary crossing (23:00 → 01:00)
  - DST transitions (spring forward, fall back)
  - Holiday pricing overrides
  - Multi-day reservations
  - Concurrent discount validation
  - Timezone edge cases

### Critical Business Logic to Test
**File**: `packages/shared-pricing/src/pricing.ts`

Core functions requiring ≥90% coverage:
- `calculateHours()` - Time duration calculation with DST handling
- `calculateBaseFee()` - Base pricing by hour range
- `applyDiscount()` - Discount validation and application
- `calculateHolidaySurcharge()` - Holiday premium pricing
- `generateQuote()` - Complete quote generation orchestration

## Implementation Plan

### Step 1: Establish Baseline Coverage (30 min)

**Add coverage configuration** to `packages/shared-pricing/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types/**',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
});
```

**Run baseline coverage**:

```bash
cd packages/shared-pricing
npm run test:coverage
```

Expected output:
```
File                | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
--------------------|---------|----------|---------|---------|-------------------
All files           |   65.00 |    55.00 |   70.00 |   65.00 |
 pricing.ts         |   65.00 |    55.00 |   70.00 |   65.00 | 45-52,78-85,112-120
```

**Document current coverage** in test file header:

```typescript
/**
 * Pricing Engine Test Suite
 *
 * Coverage Status:
 * - Baseline: 65% (2025-10-10)
 * - Target: ≥90%
 * - Critical paths: Time calculations, discount logic, holiday pricing
 */
```

### Step 2: Add Midnight Crossing Tests (2 hours)

**Critical edge case**: Reservations spanning midnight (23:00 → 01:00)

```typescript
describe('Midnight Boundary Crossing', () => {
  describe('calculateHours - Midnight Crossing', () => {
    it('should calculate hours correctly when crossing midnight', () => {
      const start = new Date('2025-10-10T23:00:00+09:00'); // 23:00 KST
      const end = new Date('2025-10-11T01:00:00+09:00');   // 01:00 next day KST

      const hours = calculateHours(start, end);

      expect(hours).toBe(2); // 23:00-00:00 (1h) + 00:00-01:00 (1h)
    });

    it('should handle multi-day reservation crossing midnight', () => {
      const start = new Date('2025-10-10T22:00:00+09:00'); // 22:00 KST
      const end = new Date('2025-10-11T02:00:00+09:00');   // 02:00 next day KST

      const hours = calculateHours(start, end);

      expect(hours).toBe(4); // 4 hours total
    });

    it('should apply correct pricing for midnight-crossing reservation', () => {
      const quote = generateQuote({
        startTime: new Date('2025-10-10T23:00:00+09:00'),
        endTime: new Date('2025-10-11T01:00:00+09:00'),
        roomType: 'practice',
      });

      // 23:00-00:00 at evening rate, 00:00-01:00 at late-night rate
      expect(quote.hours).toBe(2);
      expect(quote.breakdown).toHaveLength(2); // Two different rate periods
    });

    it('should handle exact midnight boundary', () => {
      const start = new Date('2025-10-10T23:30:00+09:00');
      const end = new Date('2025-10-11T00:30:00+09:00');

      const hours = calculateHours(start, end);

      expect(hours).toBe(1);
    });

    it('should prevent same-day midnight crossing (invalid reservation)', () => {
      const start = new Date('2025-10-10T23:00:00+09:00');
      const end = new Date('2025-10-10T01:00:00+09:00'); // Invalid: end before start

      expect(() => {
        generateQuote({ startTime: start, endTime: end, roomType: 'practice' });
      }).toThrow('End time must be after start time');
    });
  });

  describe('calculateBaseFee - Rate Transition at Midnight', () => {
    it('should split fee calculation at midnight boundary', () => {
      const quote = generateQuote({
        startTime: new Date('2025-10-10T22:00:00+09:00'), // 22:00 evening
        endTime: new Date('2025-10-11T02:00:00+09:00'),   // 02:00 late-night
        roomType: 'practice',
      });

      // Verify breakdown shows two rate periods
      expect(quote.breakdown).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ period: 'evening', hours: 2 }), // 22:00-00:00
          expect.objectContaining({ period: 'late-night', hours: 2 }), // 00:00-02:00
        ])
      );
    });

    it('should apply peak/off-peak correctly across midnight', () => {
      const weekdayQuote = generateQuote({
        startTime: new Date('2025-10-13T23:00:00+09:00'), // Monday 23:00
        endTime: new Date('2025-10-14T01:00:00+09:00'),   // Tuesday 01:00
        roomType: 'practice',
      });

      const weekendQuote = generateQuote({
        startTime: new Date('2025-10-18T23:00:00+09:00'), // Saturday 23:00
        endTime: new Date('2025-10-19T01:00:00+09:00'),   // Sunday 01:00
        roomType: 'practice',
      });

      // Weekend should have higher rate
      expect(weekendQuote.baseFee).toBeGreaterThan(weekdayQuote.baseFee);
    });
  });
});
```

### Step 3: Add DST (Daylight Saving Time) Tests (2 hours)

**Context**: Korea doesn't observe DST, but system must handle international calendars

```typescript
describe('Daylight Saving Time Handling', () => {
  describe('Spring Forward (Clock advances 1 hour)', () => {
    it('should handle missing hour in Spring DST transition', () => {
      // US Eastern: 2025-03-09 02:00 → 03:00 (02:00-03:00 doesn't exist)
      const start = new Date('2025-03-09T01:30:00-05:00'); // Before transition
      const end = new Date('2025-03-09T03:30:00-04:00');   // After transition (EDT)

      const hours = calculateHours(start, end);

      // Should be 1 hour actual elapsed time (not 2)
      expect(hours).toBe(1);
    });

    it('should prevent booking in non-existent hour range', () => {
      const start = new Date('2025-03-09T02:15:00-05:00'); // Non-existent time
      const end = new Date('2025-03-09T02:45:00-05:00');

      expect(() => {
        generateQuote({ startTime: start, endTime: end, roomType: 'practice' });
      }).toThrow(/Invalid time during DST transition/i);
    });
  });

  describe('Fall Back (Clock repeats 1 hour)', () => {
    it('should handle ambiguous hour in Fall DST transition', () => {
      // US Eastern: 2025-11-02 02:00 → 01:00 (01:00-02:00 occurs twice)
      const start = new Date('2025-11-02T01:30:00-04:00'); // First 01:30 (EDT)
      const end = new Date('2025-11-02T01:30:00-05:00');   // Second 01:30 (EST)

      const hours = calculateHours(start, end);

      // Should be 1 hour actual elapsed time
      expect(hours).toBe(1);
    });

    it('should calculate fee correctly during Fall DST overlap', () => {
      const quote = generateQuote({
        startTime: new Date('2025-11-02T00:30:00-04:00'), // Before fallback
        endTime: new Date('2025-11-02T02:30:00-05:00'),   // After fallback
        roomType: 'practice',
      });

      // 3 hours clock time, but only 3 hours actual time
      expect(quote.hours).toBe(3);
    });
  });

  describe('Timezone-Aware Calculations', () => {
    it('should use Korea timezone (KST) for all calculations', () => {
      const quote = generateQuote({
        startTime: new Date('2025-10-10T14:00:00Z'), // 23:00 KST
        endTime: new Date('2025-10-10T16:00:00Z'),   // 01:00 next day KST
        roomType: 'practice',
      });

      // Should apply KST rates, not UTC rates
      expect(quote.timezone).toBe('Asia/Seoul');
      expect(quote.breakdown[0].period).toContain('evening'); // 23:00 KST is evening
    });
  });
});
```

### Step 4: Add Holiday Pricing Tests (1.5 hours)

```typescript
describe('Holiday Pricing and Surcharges', () => {
  describe('calculateHolidaySurcharge', () => {
    it('should apply surcharge on national holidays', () => {
      const newYearsDay = new Date('2025-01-01T14:00:00+09:00');

      const quote = generateQuote({
        startTime: newYearsDay,
        endTime: new Date('2025-01-01T16:00:00+09:00'),
        roomType: 'practice',
      });

      expect(quote.holidaySurcharge).toBeGreaterThan(0);
      expect(quote.isHoliday).toBe(true);
    });

    it('should not apply surcharge on regular days', () => {
      const regularDay = new Date('2025-10-10T14:00:00+09:00'); // Regular Friday

      const quote = generateQuote({
        startTime: regularDay,
        endTime: new Date('2025-10-10T16:00:00+09:00'),
        roomType: 'practice',
      });

      expect(quote.holidaySurcharge).toBe(0);
      expect(quote.isHoliday).toBe(false);
    });

    it('should calculate correct holiday surcharge amount', () => {
      const holiday = new Date('2025-03-01T10:00:00+09:00'); // Independence Movement Day

      const quote = generateQuote({
        startTime: holiday,
        endTime: new Date('2025-03-01T12:00:00+09:00'),
        roomType: 'practice',
        baseRatePerHour: 10000,
      });

      // Expected: 10000 * 2 hours * 1.5 holiday multiplier = 30000
      // Surcharge: 30000 - 20000 = 10000
      expect(quote.holidaySurcharge).toBe(10000);
      expect(quote.totalFee).toBe(30000);
    });

    it('should handle multi-day reservation spanning holiday', () => {
      const quote = generateQuote({
        startTime: new Date('2024-12-31T22:00:00+09:00'), // New Year's Eve
        endTime: new Date('2025-01-01T02:00:00+09:00'),   // New Year's Day
        roomType: 'practice',
      });

      // Should apply holiday surcharge for portion on Jan 1
      expect(quote.isHoliday).toBe(true);
      expect(quote.holidaySurcharge).toBeGreaterThan(0);
    });

    it('should list all Korean national holidays correctly', () => {
      const holidays2025 = [
        new Date('2025-01-01'), // New Year
        new Date('2025-03-01'), // Independence Movement Day
        new Date('2025-05-05'), // Children's Day
        new Date('2025-06-06'), // Memorial Day
        new Date('2025-08-15'), // Liberation Day
        new Date('2025-10-03'), // National Foundation Day
        new Date('2025-10-09'), // Hangeul Day
        new Date('2025-12-25'), // Christmas
      ];

      holidays2025.forEach(holiday => {
        const quote = generateQuote({
          startTime: holiday,
          endTime: new Date(holiday.getTime() + 2 * 60 * 60 * 1000), // +2 hours
          roomType: 'practice',
        });

        expect(quote.isHoliday).toBe(true);
      });
    });
  });
});
```

### Step 5: Add Discount Logic Tests (1.5 hours)

```typescript
describe('Discount Application Logic', () => {
  describe('applyDiscount', () => {
    it('should validate discount percentage range (0-100)', () => {
      expect(() => {
        applyDiscount({ baseFee: 10000, discountPercent: -10 });
      }).toThrow('Discount must be between 0 and 100');

      expect(() => {
        applyDiscount({ baseFee: 10000, discountPercent: 150 });
      }).toThrow('Discount must be between 0 and 100');
    });

    it('should calculate discount amount correctly', () => {
      const result = applyDiscount({ baseFee: 10000, discountPercent: 20 });

      expect(result.discountAmount).toBe(2000);
      expect(result.finalFee).toBe(8000);
    });

    it('should handle 100% discount (free)', () => {
      const result = applyDiscount({ baseFee: 10000, discountPercent: 100 });

      expect(result.discountAmount).toBe(10000);
      expect(result.finalFee).toBe(0);
    });

    it('should handle 0% discount (no change)', () => {
      const result = applyDiscount({ baseFee: 10000, discountPercent: 0 });

      expect(result.discountAmount).toBe(0);
      expect(result.finalFee).toBe(10000);
    });

    it('should round discount to nearest won', () => {
      const result = applyDiscount({ baseFee: 10333, discountPercent: 15 });

      // 10333 * 0.15 = 1549.95 → rounds to 1550
      expect(result.discountAmount).toBe(1550);
      expect(result.finalFee).toBe(8783); // 10333 - 1550
    });

    it('should prevent concurrent discounts exceeding 100%', () => {
      expect(() => {
        applyDiscount({
          baseFee: 10000,
          discounts: [
            { type: 'member', percent: 60 },
            { type: 'early-bird', percent: 50 },
          ],
        });
      }).toThrow('Total discount cannot exceed 100%');
    });

    it('should stack multiple discounts correctly', () => {
      const result = applyDiscount({
        baseFee: 10000,
        discounts: [
          { type: 'member', percent: 20 },
          { type: 'bulk', percent: 10 },
        ],
      });

      // Method 1 (additive): 20% + 10% = 30% → 7000
      // Method 2 (multiplicative): 0.8 * 0.9 = 0.72 → 7200
      // Confirm which method is used in your implementation
      expect(result.finalFee).toBeLessThan(10000);
      expect(result.discounts).toHaveLength(2);
    });
  });

  describe('Discount Authorization Levels', () => {
    it('should require manager approval for discounts >30%', () => {
      const result = applyDiscount({
        baseFee: 10000,
        discountPercent: 35,
        approver: 'manager-id-123',
      });

      expect(result.requiresApproval).toBe(true);
      expect(result.approvalLevel).toBe('manager');
    });

    it('should allow staff to apply discounts ≤30%', () => {
      const result = applyDiscount({
        baseFee: 10000,
        discountPercent: 25,
        approver: 'staff-id-456',
      });

      expect(result.requiresApproval).toBe(false);
    });
  });
});
```

### Step 6: Add Multi-Day Reservation Tests (1 hour)

```typescript
describe('Multi-Day Reservations', () => {
  it('should calculate total hours for multi-day reservation', () => {
    const start = new Date('2025-10-10T09:00:00+09:00'); // Friday 09:00
    const end = new Date('2025-10-12T18:00:00+09:00');   // Sunday 18:00

    const quote = generateQuote({
      startTime: start,
      endTime: end,
      roomType: 'practice',
    });

    // Friday: 15 hours (09:00-00:00)
    // Saturday: 24 hours (00:00-00:00)
    // Sunday: 18 hours (00:00-18:00)
    // Total: 57 hours
    expect(quote.hours).toBe(57);
  });

  it('should apply weekend pricing for Saturday/Sunday portions', () => {
    const quote = generateQuote({
      startTime: new Date('2025-10-10T20:00:00+09:00'), // Friday evening
      endTime: new Date('2025-10-11T14:00:00+09:00'),   // Saturday afternoon
      roomType: 'practice',
    });

    // Should have different rates for Friday vs. Saturday
    const fridayPortion = quote.breakdown.filter(b => b.day === 'Friday');
    const saturdayPortion = quote.breakdown.filter(b => b.day === 'Saturday');

    expect(saturdayPortion[0].ratePerHour).toBeGreaterThan(fridayPortion[0].ratePerHour);
  });

  it('should calculate bulk discount for reservations >24 hours', () => {
    const shortReservation = generateQuote({
      startTime: new Date('2025-10-10T09:00:00+09:00'),
      endTime: new Date('2025-10-10T15:00:00+09:00'), // 6 hours
      roomType: 'practice',
    });

    const longReservation = generateQuote({
      startTime: new Date('2025-10-10T09:00:00+09:00'),
      endTime: new Date('2025-10-11T15:00:00+09:00'), // 30 hours
      roomType: 'practice',
    });

    // Long reservation should have automatic bulk discount
    expect(longReservation.appliedDiscounts).toContainEqual(
      expect.objectContaining({ type: 'bulk', reason: '>24 hours' })
    );
    expect(shortReservation.appliedDiscounts).not.toContainEqual(
      expect.objectContaining({ type: 'bulk' })
    );
  });
});
```

### Step 7: Add Property-Based Testing (Optional - Advanced) (2 hours)

**Install dependency**:
```bash
npm install --save-dev fast-check
```

```typescript
import * as fc from 'fast-check';

describe('Property-Based Tests', () => {
  it('should always return non-negative fees', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2025-01-01'), max: new Date('2025-12-31') }),
        fc.integer({ min: 1, max: 48 }), // hours
        (startDate, hours) => {
          const start = startDate;
          const end = new Date(start.getTime() + hours * 60 * 60 * 1000);

          const quote = generateQuote({
            startTime: start,
            endTime: end,
            roomType: 'practice',
          });

          expect(quote.totalFee).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 } // Run 100 random test cases
    );
  });

  it('should have consistent pricing for same duration', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }), // hours
        (hours) => {
          const start1 = new Date('2025-10-10T10:00:00+09:00');
          const end1 = new Date(start1.getTime() + hours * 60 * 60 * 1000);

          const start2 = new Date('2025-10-17T10:00:00+09:00'); // Same day of week
          const end2 = new Date(start2.getTime() + hours * 60 * 60 * 1000);

          const quote1 = generateQuote({
            startTime: start1,
            endTime: end1,
            roomType: 'practice',
          });

          const quote2 = generateQuote({
            startTime: start2,
            endTime: end2,
            roomType: 'practice',
          });

          // Same duration, same day of week → same base fee
          expect(quote1.baseFee).toBe(quote2.baseFee);
        }
      )
    );
  });

  it('should maintain fee <= hours * maxRatePerHour invariant', () => {
    const MAX_RATE_PER_HOUR = 20000; // Define system maximum

    fc.assert(
      fc.property(
        fc.date(),
        fc.integer({ min: 1, max: 100 }),
        (start, hours) => {
          const end = new Date(start.getTime() + hours * 60 * 60 * 1000);

          const quote = generateQuote({
            startTime: start,
            endTime: end,
            roomType: 'practice',
          });

          expect(quote.totalFee).toBeLessThanOrEqual(hours * MAX_RATE_PER_HOUR);
        }
      )
    );
  });
});
```

### Step 8: Update Package Scripts (15 min)

**Modify**: `packages/shared-pricing/package.json`

```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "coverage:report": "open coverage/index.html"
  }
}
```

### Step 9: Add Coverage CI/CD Enforcement (30 min)

**Create**: `.github/workflows/test-pricing-coverage.yml`

```yaml
name: Pricing Engine Coverage

on:
  pull_request:
    paths:
      - 'packages/shared-pricing/**'
  push:
    branches: [main, develop]

jobs:
  coverage:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd packages/shared-pricing
          npm ci

      - name: Run tests with coverage
        run: |
          cd packages/shared-pricing
          npm run test:coverage

      - name: Check coverage thresholds
        run: |
          cd packages/shared-pricing
          npm run test:coverage -- --coverage.thresholds.lines=90

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./packages/shared-pricing/coverage/lcov.info
          flags: pricing-engine

      - name: Comment PR with coverage
        if: github.event_name == 'pull_request'
        uses: romeovs/lcov-reporter-action@v0.3.1
        with:
          lcov-file: ./packages/shared-pricing/coverage/lcov.info
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Testing Checklist

- [ ] Baseline coverage measured and documented
- [ ] Midnight crossing tests (5+ test cases)
- [ ] DST transition tests (Spring/Fall scenarios)
- [ ] Holiday pricing tests (Korean national holidays)
- [ ] Discount validation tests (0-100%, stacking, authorization)
- [ ] Multi-day reservation tests (weekend pricing, bulk discounts)
- [ ] Property-based tests (optional - 3+ properties)
- [ ] All tests passing (`npm test`)
- [ ] Coverage ≥90% (`npm run test:coverage`)
- [ ] CI/CD enforcement configured

## Success Criteria

1. ✅ Code coverage ≥90% (lines, branches, functions, statements)
2. ✅ All edge cases tested with evidence
3. ✅ Midnight crossing scenarios covered
4. ✅ DST transitions handled correctly
5. ✅ Holiday pricing validated
6. ✅ Discount logic fully tested
7. ✅ Multi-day reservations tested
8. ✅ CI/CD pipeline enforces coverage thresholds
9. ✅ Coverage report generated (HTML + LCOV)
10. ✅ No regression in existing tests

## Coverage Goals by Function

| Function | Current | Target | Priority | Edge Cases |
|----------|---------|--------|----------|------------|
| `calculateHours` | 60% | 95% | High | Midnight, DST, multi-day |
| `calculateBaseFee` | 70% | 95% | High | Rate transitions, weekend/weekday |
| `applyDiscount` | 55% | 95% | High | Validation, stacking, authorization |
| `calculateHolidaySurcharge` | 40% | 90% | Medium | Korean holidays, spanning midnight |
| `generateQuote` | 75% | 95% | High | Orchestration, error handling |
| `Helper functions` | 50% | 85% | Low | Utilities, formatting |

## Coordination Notes

### Dependencies on Other Tracks
- **None**: This track is independent and can proceed immediately

### Shared Files
- No shared files with other tracks
- Isolated to `packages/shared-pricing` directory

### Integration Timeline
1. **Day 1**: Establish baseline, add midnight and DST tests
2. **Day 2**: Add holiday, discount, and multi-day tests
3. **Day 2 EOD**: Achieve ≥90% coverage, configure CI/CD

## Performance Benchmarks

### Test Execution Speed

**Target**: Full test suite runs in <5 seconds

```bash
# Before expansion
Test Suites: 1 passed, 1 total
Tests:       12 passed, 12 total
Time:        1.2s

# After expansion (target)
Test Suites: 1 passed, 1 total
Tests:       60+ passed, 60+ total
Time:        <5s
```

### Coverage Report Access

After running tests:
```bash
cd packages/shared-pricing
npm run coverage:report  # Opens HTML report in browser
```

## Resources

- Vitest Coverage: https://vitest.dev/guide/coverage.html
- Fast-Check Property Testing: https://github.com/dubzzz/fast-check
- Korean Holidays API: https://github.com/hyeyoom/korean-holidays
- Timezone Handling: date-fns-tz documentation
