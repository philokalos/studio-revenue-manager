# Firestore Data Model & Migration Guide

## 📋 Collection Overview

Studio Revenue Manager uses 10 Firestore collections to manage studio operations:

### Core Collections
1. **users** - User accounts with role-based access
2. **reservations** - Studio booking records
3. **quotes** - Customer price quotes
4. **invoices** - Billing and payments

### Integration Collections
5. **calendarSyncLog** - Google Calendar sync tracking
6. **bankTransactions** - CSV bank statement data
7. **transactionMatches** - Automated payment matching

### Analytics Collections
8. **costs** - Monthly operational expenses
9. **goals** - Monthly revenue targets
10. **monthlySummaries** - Cached performance metrics

## 🏗️ Collection Schemas

### 1. Users Collection
```typescript
/users/{userId}
{
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'staff' | 'customer';
  phone?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes:**
- email (auto)
- role + createdAt (composite)

### 2. Reservations Collection
```typescript
/reservations/{reservationId}
{
  id: string;
  googleCalendarEventId?: string;
  startTime: Timestamp;
  endTime: Timestamp;
  initialHeadcount: number;
  headcountChanges: HeadcountChange[];
  channel: 'default' | 'hourplace' | 'spacecloud';
  status: 'CONFIRMED' | 'CANCELLED';
  notes?: string;
  needsCorrection: boolean;
  correctedAt?: Timestamp;

  // Metadata
  payerName?: string;
  phone?: string;
  peopleCount?: number;
  parkingCount: number;
  shootingPurpose?: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Composite Indexes:**
1. status + startTime (DESC)
2. customerEmail + createdAt (DESC)
3. channel + startTime (DESC)
4. needsCorrection + createdAt (DESC)

### 3. Quotes Collection
```typescript
/quotes/{quoteId}
{
  id: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  startTime: Timestamp;
  endTime: Timestamp;
  headcount: number;
  lineItems: QuoteLineItem[];
  subtotal: number;
  tax?: number;
  totalAmount: number;
  validUntil: Timestamp;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  notes?: string;
  reservationId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Composite Indexes:**
1. status + createdAt (DESC)
2. customerEmail + createdAt (DESC)
3. status + validUntil (ASC)

### 4. Invoices Collection
```typescript
/invoices/{invoiceId}
{
  id: string;
  reservationId: string;
  expectedAmount: number;
  discountType?: 'amount' | 'rate';
  discountValue?: number;
  discountAmount: number;
  finalAmount: number;
  status: 'OPEN' | 'PAID' | 'PARTIAL' | 'VOID';
  paidAmount?: number;
  paymentDate?: Timestamp;
  paymentMethod?: string;
  discountLogs: DiscountLog[];
  dueDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Composite Indexes:**
1. status + dueDate (ASC)
2. reservationId + createdAt (DESC)
3. status + createdAt (DESC)

### 5. Calendar Sync Log Collection
```typescript
/calendarSyncLog/{syncId}
{
  id: string;
  reservationId: string;
  calendarEventId: string;
  syncDirection: 'TO_CALENDAR' | 'FROM_CALENDAR';
  syncStatus: 'SUCCESS' | 'FAILED' | 'DELETED';
  errorMessage?: string;
  syncedAt: Timestamp;
  changeType?: 'CREATE' | 'UPDATE' | 'DELETE';
  changedFields?: string[];
  createdAt: Timestamp;
}
```

**Composite Indexes:**
1. reservationId + syncedAt (DESC)
2. syncStatus + syncedAt (DESC)
3. syncDirection + syncedAt (DESC)

### 6. Bank Transactions Collection
```typescript
/bankTransactions/{transactionId}
{
  id: string;
  transactionDate: Timestamp;
  amount: number;
  depositorName?: string;
  memo?: string;
  transactionType: 'DEPOSIT' | 'WITHDRAWAL';
  matchedInvoiceId?: string;
  status: 'UNMATCHED' | 'MATCHED' | 'PENDING_REVIEW';
  rawData: object;
  uploadedBy: string;
  uploadedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Composite Indexes:**
1. status + transactionDate (DESC)
2. transactionType + transactionDate (DESC)
3. matchedInvoiceId + transactionDate (DESC)

### 7. Transaction Matches Collection
```typescript
/transactionMatches/{matchId}
{
  id: string;
  transactionId: string;
  invoiceId: string;
  matchConfidence: number;
  matchReason: string;
  matchType: 'AUTO' | 'MANUAL';
  verifiedBy?: string;
  verifiedAt?: Timestamp;
  verified: boolean;
  transactionAmount: number;
  invoiceAmount: number;
  amountDifference: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Composite Indexes:**
1. transactionId + createdAt (DESC)
2. invoiceId + createdAt (DESC)
3. verified + matchConfidence (DESC)
4. matchType + createdAt (DESC)

### 8. Costs Collection (Monthly)
```typescript
/costs/{YYYY-MM}
{
  id: string;  // Same as month
  month: string;  // YYYY-MM format
  rent: number;
  utilities: number;
  adsTotal: number;
  supplies: number;
  maintenance: number;
  channelBreakdown?: object;
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 9. Goals Collection (Monthly)
```typescript
/goals/{YYYY-MM}
{
  id: string;  // Same as month
  month: string;  // YYYY-MM format
  revenueTarget: number;
  notifiedAt?: Timestamp;
  actualRevenue?: number;
  achievementRate?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 10. Monthly Summaries Collection
```typescript
/monthlySummaries/{YYYY-MM}
{
  id: string;  // Same as month
  month: string;  // YYYY-MM format
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  utilizationRate: number;
  goalAchievementRate?: number;
  reservationCount: number;
  averageReservationValue: number;
  channelBreakdown?: object;
  lastCalculatedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## 🔄 PostgreSQL → Firestore Migration

### Key Differences

| PostgreSQL | Firestore | Notes |
|------------|-----------|-------|
| UUID primary keys | Document IDs | Use UUID as doc ID |
| Foreign keys | Document references | Store referenced doc ID |
| Subcollections via JOIN | Embedded arrays or subcollections | discount_logs → embedded array |
| DATE type | String (YYYY-MM) | For monthly collections |
| TIMESTAMPTZ | Timestamp | Native Firestore type |
| JSONB | Native object | Direct mapping |
| Triggers | Cloud Functions | Automated calculations |

### Migration Steps

#### 1. Install Dependencies
```bash
cd firestore/migrations
npm install
```

#### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/studio_revenue_manager
FIREBASE_PROJECT_ID=studio-revenue-manager
GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccountKey.json
```

#### 3. Run Migration
```bash
npm run migrate
```

#### 4. Verify Migration
```bash
firebase firestore:indexes
firebase firestore:rules
```

### Migration Script Features

- **Batch Writing**: Processes 500 documents per batch for efficiency
- **Error Handling**: Continues on individual failures, logs errors
- **Progress Tracking**: Real-time console updates
- **Statistics**: Comprehensive migration summary
- **Data Transformation**:
  - UUID → document ID
  - PostgreSQL timestamps → Firestore Timestamps
  - snake_case → camelCase
  - discount_logs table → embedded array in invoices

## 🌱 Seed Data for Development

Create test data for local development:

```bash
cd firestore/migrations
npm run seed
```

**Creates:**
- 3 test users (admin, staff, customer)
- 3 reservations
- 3 invoices
- Monthly cost/goal/summary data

**Test Accounts:**
- Admin: `admin@studio.com` / `admin123`
- Staff: `staff@studio.com` / `staff123`
- Customer: `customer@example.com` / `customer123`

## 🔒 Security Rules

See `firestore.rules` for complete security rules.

**Key Rules:**
- **Authentication required** for all operations
- **Role-based access**:
  - `admin`: Full access to all collections
  - `staff`: Read + write access to business data
  - `customer`: Limited read access to own data
- **Field validation** via Firestore rules
- **Cascading permissions** via helper functions

## 📊 Indexing Strategy

### Composite Indexes
All composite indexes are defined in `firestore.indexes.json`:
- Reservation queries by status and time
- Invoice queries by status and due date
- Bank transaction queries by status and date
- Customer-specific queries by email

### Single-Field Indexes
Auto-created by Firestore for:
- All timestamp fields
- All status fields
- All foreign key references

## 🚀 Query Patterns

### Common Queries

```typescript
// Get upcoming reservations
const reservations = await db.collection('reservations')
  .where('startTime', '>=', Timestamp.now())
  .where('status', '==', 'CONFIRMED')
  .orderBy('startTime', 'asc')
  .limit(10)
  .get();

// Get unpaid invoices
const invoices = await db.collection('invoices')
  .where('status', 'in', ['OPEN', 'PARTIAL'])
  .where('dueDate', '<=', Timestamp.now())
  .orderBy('dueDate', 'asc')
  .get();

// Get unmatched bank transactions
const transactions = await db.collection('bankTransactions')
  .where('status', '==', 'UNMATCHED')
  .where('transactionType', '==', 'DEPOSIT')
  .orderBy('transactionDate', 'desc')
  .get();

// Get monthly summary
const summary = await db.collection('monthlySummaries')
  .doc('2025-01')
  .get();
```

## 💾 Backup Strategy

### Automated Backups
- Firebase automatically backs up Firestore data
- Point-in-time recovery available (Blaze plan)

### Manual Export
```bash
gcloud firestore export gs://bucket-name/folder-name
```

### Manual Import
```bash
gcloud firestore import gs://bucket-name/folder-name
```

## 📈 Performance Considerations

### Optimization Tips
1. **Use composite indexes** for multi-field queries
2. **Limit result sets** with `.limit()`
3. **Use pagination** for large datasets via cursors
4. **Denormalize data** for common queries
5. **Cache frequently accessed** documents client-side
6. **Batch operations** for bulk writes

### Firestore Limits
- Max document size: 1 MB
- Max writes per second per document: 1
- Max composite index entries per document: 40,000
- Max subcollections per document: Unlimited

## 🔧 Troubleshooting

### Common Issues

**Error: "9 FAILED_PRECONDITION: The query requires an index"**
- Solution: Run `firebase deploy --only firestore:indexes`

**Error: "Missing or insufficient permissions"**
- Solution: Check `firestore.rules` and user authentication

**Slow Queries**
- Solution: Add appropriate composite indexes
- Solution: Reduce result set size with `.limit()`

**Migration Failures**
- Check PostgreSQL connection string
- Verify Firebase service account permissions
- Review error logs in console output

## 📚 Additional Resources

- [Firestore Data Model Best Practices](https://firebase.google.com/docs/firestore/data-model)
- [Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
- [Query Performance](https://firebase.google.com/docs/firestore/query-data/queries)
- [Pricing Calculator](https://firebase.google.com/pricing)
