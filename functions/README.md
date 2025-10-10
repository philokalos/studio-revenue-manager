# Firebase Functions - Studio Revenue Manager

## 📋 Overview

Firebase Functions backend implementation for Studio Revenue Manager. This replaces the Express.js API with serverless Firebase Cloud Functions.

## 🏗️ Architecture

```
functions/
├── src/
│   ├── auth/                    # Authentication Functions (3)
│   │   ├── register.ts          # User registration
│   │   ├── login.ts             # User login
│   │   └── refreshToken.ts      # Token refresh
│   │
│   ├── reservations/            # Reservations CRUD (5)
│   │   ├── createReservation.ts
│   │   ├── getReservations.ts
│   │   ├── getReservation.ts
│   │   ├── updateReservation.ts
│   │   └── deleteReservation.ts
│   │
│   ├── quotes/                  # Quotes CRUD (5)
│   │   ├── createQuote.ts
│   │   ├── getQuotes.ts
│   │   ├── getQuote.ts
│   │   ├── updateQuote.ts
│   │   └── deleteQuote.ts
│   │
│   ├── invoices/                # Invoices CRUD (5)
│   │   ├── createInvoice.ts
│   │   ├── getInvoices.ts
│   │   ├── getInvoice.ts
│   │   ├── updateInvoice.ts
│   │   └── deleteInvoice.ts
│   │
│   ├── bankTransactions/        # Bank Transactions CRUD (5)
│   │   ├── uploadTransactions.ts
│   │   ├── getTransactions.ts
│   │   ├── getTransaction.ts
│   │   ├── matchTransaction.ts
│   │   └── deleteTransaction.ts
│   │
│   ├── scheduled/               # Scheduled Functions (2)
│   │   ├── calculateMonthlySummary.ts  # Runs monthly at midnight
│   │   └── cleanupExpiredQuotes.ts     # Runs daily at midnight
│   │
│   ├── triggers/                # Firestore Triggers (3)
│   │   ├── autoGenerateInvoice.ts      # On reservation create/confirm
│   │   ├── recalculateMonthlySummary.ts # On invoice update
│   │   └── autoMatchTransaction.ts      # On transaction create
│   │
│   ├── utils/                   # Utility Functions (3)
│   │   ├── auth.ts              # Authentication helpers
│   │   ├── response.ts          # Response formatting
│   │   └── validation.ts        # Input validation
│   │
│   └── index.ts                 # Main entry point
│
├── package.json
├── tsconfig.json
└── .eslintrc.js
```

## 🚀 Functions Summary

### Total: 28 Functions

| Category | Count | Functions |
|----------|-------|-----------|
| **Authentication** | 3 | register, login, refreshToken |
| **Reservations CRUD** | 5 | create, get, getAll, update, delete |
| **Quotes CRUD** | 5 | create, get, getAll, update, delete |
| **Invoices CRUD** | 5 | create, get, getAll, update, delete |
| **Bank Transactions CRUD** | 5 | upload, get, getAll, match, delete |
| **Scheduled** | 2 | monthly summary, cleanup quotes |
| **Triggers** | 3 | auto invoice, recalculate, auto match |
| **Total** | **28** | |

## 🔐 Authentication & Authorization

All HTTP Functions use Bearer token authentication via `Authorization` header.

### Role-Based Access Control

| Role | Access Level |
|------|-------------|
| **admin** | Full access to all functions |
| **staff** | Create, read, update operations |
| **customer** | Read-only access to own data |

### Utility Functions

- `verifyToken(request)` - Validates JWT and returns user info
- `requireAdmin(user)` - Checks admin role
- `requireStaff(user)` - Checks staff or admin role

## 📡 HTTP Functions (23)

### Authentication (3)

**POST /register**
- Create new user account
- Default role: customer
- Returns custom token for immediate login

**POST /login**
- Authenticate user
- Returns custom token

**POST /refreshToken**
- Refresh authentication token
- Requires valid Bearer token

### Reservations (5)

**POST /createReservation** (Staff/Admin)
- Create new reservation
- Validates dates, channel, headcount
- Auto-generates invoice if status is CONFIRMED

**GET /getReservations** (Authenticated)
- List reservations with filtering
- Query params: status, channel, startDate, endDate, limit
- Default limit: 50, max: 100

**GET /getReservation?reservationId={id}** (Authenticated)
- Get single reservation by ID

**PUT/PATCH /updateReservation** (Staff/Admin)
- Update reservation details
- Supports partial updates

**DELETE /deleteReservation?reservationId={id}** (Admin)
- Delete reservation permanently

### Quotes (5)

**POST /createQuote** (Staff/Admin)
- Create price quote for customer
- Auto-calculates totals from line items
- Default validUntil: 7 days from creation

**GET /getQuotes** (Authenticated)
- List quotes with filtering
- Query params: status, customerEmail, startDate, endDate, limit

**GET /getQuote?quoteId={id}** (Authenticated)
- Get single quote by ID

**PUT/PATCH /updateQuote** (Staff/Admin)
- Update quote details
- Recalculates totals when lineItems change

**DELETE /deleteQuote?quoteId={id}** (Admin)
- Delete quote
- Prevents deletion if linked to reservation

### Invoices (5)

**POST /createInvoice** (Staff/Admin)
- Create invoice for reservation
- Validates reservation exists
- Calculates discounts (amount or rate)
- Tracks discount changes in discountLogs

**GET /getInvoices** (Authenticated)
- List invoices with filtering
- Query params: status, reservationId, dueDate, limit

**GET /getInvoice?invoiceId={id}** (Authenticated)
- Get single invoice by ID

**PUT/PATCH /updateInvoice** (Staff/Admin)
- Update invoice and record payments
- Auto-updates status based on paidAmount:
  - PAID: paidAmount >= finalAmount
  - PARTIAL: 0 < paidAmount < finalAmount
  - OPEN: paidAmount = 0
- Cannot update VOID invoices

**DELETE /deleteInvoice?invoiceId={id}** (Admin)
- Voids invoice (soft delete)
- Sets status to VOID

### Bank Transactions (5)

**POST /uploadTransactions** (Staff/Admin)
- Upload CSV bank statement
- Batch creates multiple transactions
- Validates transaction type and amount signs

**GET /getTransactions** (Staff/Admin)
- List transactions with filtering
- Query params: status, transactionType, startDate, endDate, limit

**GET /getTransaction?transactionId={id}** (Staff/Admin)
- Get single transaction by ID

**POST /matchTransaction** (Staff/Admin)
- Manually match transaction to invoice
- Validates both transaction and invoice exist
- Updates status to MATCHED

**DELETE /deleteTransaction?transactionId={id}** (Admin)
- Delete transaction
- Prevents deletion of matched transactions

## ⏰ Scheduled Functions (2)

### Calculate Monthly Summary

**Schedule**: `0 0 1 * *` (Midnight on 1st of every month)
**Timezone**: Asia/Seoul
**Purpose**: Calculate and store monthly performance metrics

**Calculates**:
- Total revenue from paid invoices
- Total costs from costs collection
- Net profit
- Utilization rate (booked hours / available hours)
- Goal achievement rate
- Reservation count and average value
- Revenue breakdown by channel (default, hourplace, spacecloud)

**Writes to**:
- `monthlySummaries/{YYYY-MM}` - Aggregated metrics
- `goals/{YYYY-MM}` - Updates actualRevenue and achievementRate

### Cleanup Expired Quotes

**Schedule**: `0 0 * * *` (Daily at midnight)
**Timezone**: Asia/Seoul
**Purpose**: Mark expired quotes as EXPIRED

**Logic**:
- Finds quotes with status DRAFT or SENT
- Where validUntil < now
- Batch updates status to EXPIRED

## 🔥 Firestore Triggers (3)

### Auto-Generate Invoice

**Trigger**: `onDocumentCreated` and `onDocumentUpdated` on `reservations/{reservationId}`
**Purpose**: Automatically create invoice when reservation is confirmed

**Logic**:
- Triggers when reservation status becomes CONFIRMED
- Checks if invoice already exists (prevents duplicates)
- Calculates expectedAmount based on:
  - Duration in hours
  - Channel-specific hourly rate:
    - default: ₩50,000/hour
    - hourplace: ₩45,000/hour
    - spacecloud: ₩45,000/hour
- Creates invoice with status OPEN, paidAmount 0

### Recalculate Monthly Summary

**Trigger**: `onDocumentUpdated` on `invoices/{invoiceId}`
**Purpose**: Update monthly summary when payment is recorded

**Logic**:
- Triggers when invoice paidAmount or status changes
- Determines month from paymentDate
- Recalculates totalRevenue for that month
- Updates channelBreakdown by fetching reservation channels
- Recalculates goalAchievementRate
- Updates `monthlySummaries/{YYYY-MM}` and `goals/{YYYY-MM}`

### Auto-Match Transaction

**Trigger**: `onDocumentCreated` on `bankTransactions/{transactionId}`
**Purpose**: Automatically match bank deposits to open invoices

**Matching Algorithm**:
1. **Amount Match** (50% confidence)
   - Finds invoices within 5% of transaction amount
   - Calculates amount similarity score

2. **Name Match** (50% confidence)
   - Compares depositor name with reservation payer name
   - Uses Levenshtein distance for similarity

3. **Auto-Match Threshold**: >80% confidence
   - Creates match record in `transactionMatches` collection
   - Updates transaction status to PENDING_REVIEW
   - Sets matchedInvoiceId reference

**Note**: Auto-matches require manual verification by staff before payment is recorded.

## 🛠️ Utility Functions (3)

### Authentication Utilities (`utils/auth.ts`)

```typescript
interface AuthUser {
  uid: string;
  email: string;
  role: 'admin' | 'staff' | 'customer';
}

// Verify and decode ID token
async function verifyToken(request: Request): Promise<AuthUser>

// Check if user has required role
function requireRole(user: AuthUser, allowedRoles: string[]): void

// Convenience functions
function requireAdmin(user: AuthUser): void
function requireStaff(user: AuthUser): void
```

### Response Utilities (`utils/response.ts`)

```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

function successResponse<T>(data: T, message?: string): ApiResponse<T>
function errorResponse(error: string): ApiResponse
function handleError(error: unknown): string
```

### Validation Utilities (`utils/validation.ts`)

```typescript
function validateRequired(data: any, fields: string[]): void
function validateEmail(email: string): boolean
function validatePhoneNumber(phone: string): boolean
function validateReservationStatus(status: string): boolean
function validateQuoteStatus(status: string): boolean
function validateInvoiceStatus(status: string): boolean
function validateChannel(channel: string): boolean
```

## 🚀 Deployment

### Prerequisites

1. **Firebase CLI**: `npm install -g firebase-tools`
2. **Firebase Project**: Must be created via Firebase Console
3. **Service Account**: For Firebase Admin SDK
4. **Environment Variables**: Set in `.env` file

### Build Functions

```bash
cd functions
npm install
npm run build
```

### Deploy All Functions

```bash
firebase deploy --only functions
```

### Deploy Specific Functions

```bash
# Deploy authentication functions only
firebase deploy --only functions:register,functions:login,functions:refreshToken

# Deploy reservations CRUD only
firebase deploy --only functions:createReservation,functions:getReservations,functions:getReservation,functions:updateReservation,functions:deleteReservation

# Deploy scheduled functions only
firebase deploy --only functions:calculateMonthlySummary,functions:cleanupExpiredQuotes
```

### Test with Emulator

```bash
firebase emulators:start --only functions,firestore
```

## 📊 Error Handling

All functions follow consistent error handling:

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST (create) |
| 400 | Bad Request | Validation errors, invalid input |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 405 | Method Not Allowed | Wrong HTTP method |
| 409 | Conflict | Duplicate resource (e.g., email exists) |
| 500 | Internal Server Error | Unexpected errors |

### Error Response Format

```json
{
  "success": false,
  "error": "Error message here"
}
```

### Success Response Format

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

## 🔍 Monitoring & Logs

### Firebase Console

- **Functions Logs**: Firebase Console → Functions → Logs
- **Firestore Usage**: Firebase Console → Firestore → Usage
- **Performance**: Firebase Console → Performance Monitoring

### Log Patterns

```typescript
console.log('✅ Success message');    // Success
console.log('⚠️  Warning message');   // Warning
console.error('❌ Error message');    // Error
```

## 🧪 Testing

### Manual Testing with cURL

See individual function README files:
- `/functions/src/reservations/README.md`
- `/functions/src/invoices/README.md`

### Unit Testing (To be implemented)

```bash
npm test
```

## 📈 Performance Considerations

### Cold Start

- **First invocation**: 1-3 seconds (cold start)
- **Subsequent invocations**: <100ms (warm instances)
- **Mitigation**: Keep functions small and focused

### Firestore Queries

- All queries use composite indexes defined in `firestore.indexes.json`
- Pagination implemented with configurable limits
- Default limit: 50, max limit: 100

### Batch Operations

- Bank transactions upload uses Firestore batch writes (500 docs/batch)
- Scheduled functions use batch updates for efficiency

## 🔐 Security

### Firestore Security Rules

All data access is controlled by `firestore.rules`:
- Authentication required for all operations
- Role-based access control (admin, staff, customer)
- Field validation via security rules

### API Security

- Bearer token authentication on all HTTP functions
- Custom claims for role-based access
- Input validation on all user inputs
- SQL injection prevention (NoSQL database)

## 💰 Cost Optimization

### Firebase Functions Pricing

- **Invocations**: $0.40 per million invocations
- **Compute Time**: $0.0000025 per GB-second
- **Free Tier**: 2 million invocations/month, 400,000 GB-seconds/month

### Optimization Strategies

1. **Minimize cold starts**: Keep functions small and focused
2. **Use caching**: Implement in-memory caching for frequently accessed data
3. **Batch operations**: Use Firestore batch writes when possible
4. **Set timeouts**: Configure appropriate timeout values
5. **Monitor usage**: Use Firebase Console to track costs

## 🔄 Future Enhancements

- [ ] Google Calendar integration functions
- [ ] Email notification functions
- [ ] SMS notification functions
- [ ] Payment gateway integration (Toss, KakaoPay)
- [ ] Advanced analytics functions
- [ ] AI-powered matching improvements
- [ ] Webhook endpoints for external services

## 📚 Additional Resources

- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Project-specific Firestore Documentation](../firestore/README.md)
