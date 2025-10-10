# API Examples

Practical API usage examples for Studio Revenue Manager including authentication, quotes, reservations, invoices, and CSV bank matching.

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://api.yourdomain.com/api`

## Authentication

### Register New User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@studiomorph.com",
    "password": "SecurePassword123!",
    "name": "Studio Admin"
  }'
```

**Response:**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "admin@studiomorph.com",
    "name": "Studio Admin"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@studiomorph.com",
    "password": "SecurePassword123!"
  }'
```

### Refresh Token

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your_refresh_token_here"
  }'
```

### Get Current User

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer your_access_token_here"
```

## Quote Calculation

### Basic Quote (2 hours, 3 people)

```bash
curl -X POST http://localhost:3000/api/quote/calculate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_token" \
  -d '{
    "startAt": "2025-10-09T10:00:00+09:00",
    "endAt": "2025-10-09T12:00:00+09:00",
    "people": 3,
    "channel": "default"
  }'
```

**Response:**
```json
{
  "segments": [
    {
      "from": "2025-10-09T10:00:00+09:00",
      "to": "2025-10-09T12:00:00+09:00",
      "rate": "DAY",
      "unit": 40000,
      "hours": 2
    }
  ],
  "baseAmount": 80000,
  "extraPeopleAmount": 0,
  "discountApplied": null,
  "finalAmount": 80000
}
```

### Quote with Extra People (5 people)

```bash
curl -X POST http://localhost:3000/api/quote/calculate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_token" \
  -d '{
    "startAt": "2025-10-09T10:00:00+09:00",
    "endAt": "2025-10-09T14:00:00+09:00",
    "people": 5,
    "channel": "default"
  }'
```

**Response:**
```json
{
  "segments": [
    {
      "from": "2025-10-09T10:00:00+09:00",
      "to": "2025-10-09T14:00:00+09:00",
      "rate": "DAY",
      "unit": 40000,
      "hours": 4
    }
  ],
  "baseAmount": 160000,
  "extraPeopleAmount": 40000,
  "discountApplied": null,
  "finalAmount": 200000
}
```

### Quote with Day/Night Boundary (19:00-21:00)

```bash
curl -X POST http://localhost:3000/api/quote/calculate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_token" \
  -d '{
    "startAt": "2025-10-09T19:00:00+09:00",
    "endAt": "2025-10-09T21:00:00+09:00",
    "people": 4,
    "channel": "default"
  }'
```

**Response:**
```json
{
  "segments": [
    {
      "from": "2025-10-09T19:00:00+09:00",
      "to": "2025-10-09T20:00:00+09:00",
      "rate": "DAY",
      "unit": 40000,
      "hours": 1
    },
    {
      "from": "2025-10-09T20:00:00+09:00",
      "to": "2025-10-09T21:00:00+09:00",
      "rate": "NIGHT",
      "unit": 20000,
      "hours": 1
    }
  ],
  "baseAmount": 60000,
  "extraPeopleAmount": 10000,
  "discountApplied": null,
  "finalAmount": 70000
}
```

### Quote with Percentage Discount

```bash
curl -X POST http://localhost:3000/api/quote/calculate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_token" \
  -d '{
    "startAt": "2025-10-09T10:00:00+09:00",
    "endAt": "2025-10-09T14:00:00+09:00",
    "people": 3,
    "channel": "default",
    "discount": {
      "type": "rate",
      "value": 10
    }
  }'
```

**Response:**
```json
{
  "segments": [...],
  "baseAmount": 160000,
  "extraPeopleAmount": 0,
  "discountApplied": {
    "type": "rate",
    "value": 10,
    "amount": 16000
  },
  "finalAmount": 144000
}
```

### Quote with Amount Discount

```bash
curl -X POST http://localhost:3000/api/quote/calculate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_token" \
  -d '{
    "startAt": "2025-10-09T10:00:00+09:00",
    "endAt": "2025-10-09T14:00:00+09:00",
    "people": 3,
    "channel": "default",
    "discount": {
      "type": "amount",
      "value": 15000
    }
  }'
```

## Reservations

### Create Reservation

```bash
curl -X POST http://localhost:3000/api/reservation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_token" \
  -d '{
    "startAt": "2025-10-09T10:00:00+09:00",
    "endAt": "2025-10-09T14:00:00+09:00",
    "people": 5,
    "channel": "default",
    "notes": "입금자명: 윤아영\n연락처: 010-2344-4564\n인원: 5명\n주차: 2대\n촬영내용: 룩북",
    "meta": {
      "payerName": "윤아영",
      "phone": "01023444564",
      "peopleCount": 5,
      "parkingCount": 2,
      "shootingPurpose": "룩북"
    }
  }'
```

**Response:**
```json
{
  "id": "res_abc123",
  "startAt": "2025-10-09T10:00:00+09:00",
  "endAt": "2025-10-09T14:00:00+09:00",
  "people": 5,
  "channel": "default",
  "status": "CONFIRMED",
  "notes": "...",
  "createdAt": "2025-10-09T09:00:00+09:00"
}
```

### Get All Reservations

```bash
curl -X GET "http://localhost:3000/api/reservation?startDate=2025-10-01&endDate=2025-10-31" \
  -H "Authorization: Bearer your_token"
```

### Get Reservation by ID

```bash
curl -X GET http://localhost:3000/api/reservation/res_abc123 \
  -H "Authorization: Bearer your_token"
```

### Update Reservation

```bash
curl -X PATCH http://localhost:3000/api/reservation/res_abc123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_token" \
  -d '{
    "people": 6,
    "notes": "Updated: 인원 변경 (5→6명)"
  }'
```

### Delete Reservation

```bash
curl -X DELETE http://localhost:3000/api/reservation/res_abc123 \
  -H "Authorization: Bearer your_token"
```

## Invoices

### Create Invoice from Reservation

```bash
curl -X POST http://localhost:3000/api/invoice \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_token" \
  -d '{
    "reservationId": "res_abc123",
    "discount": {
      "type": "amount",
      "value": 15000
    }
  }'
```

**Response:**
```json
{
  "id": "inv_xyz789",
  "reservationId": "res_abc123",
  "expectedAmount": 200000,
  "discountType": "amount",
  "discountValue": 15000,
  "finalAmount": 185000,
  "status": "OPEN",
  "createdAt": "2025-10-09T10:00:00+09:00"
}
```

### Get All Invoices

```bash
curl -X GET "http://localhost:3000/api/invoice?status=OPEN" \
  -H "Authorization: Bearer your_token"
```

### Get Invoice by ID

```bash
curl -X GET http://localhost:3000/api/invoice/inv_xyz789 \
  -H "Authorization: Bearer your_token"
```

### Apply Discount to Invoice

```bash
curl -X POST http://localhost:3000/api/invoice/inv_xyz789/discount \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_token" \
  -d '{
    "type": "rate",
    "value": 10
  }'
```

### Update Invoice Status

```bash
curl -X PATCH http://localhost:3000/api/invoice/inv_xyz789 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_token" \
  -d '{
    "status": "PAID"
  }'
```

## Google Calendar Integration

### Sync Calendar Events

```bash
curl -X POST http://localhost:3000/api/calendar/sync \
  -H "Authorization: Bearer your_token"
```

**Response:**
```json
{
  "synced": 15,
  "created": 10,
  "updated": 5,
  "errors": []
}
```

### Get Calendar Events

```bash
curl -X GET "http://localhost:3000/api/calendar/events?startDate=2025-10-01&endDate=2025-10-31" \
  -H "Authorization: Bearer your_token"
```

## CSV Bank Transaction Upload

### Upload CSV File

```bash
curl -X POST http://localhost:3000/api/csv-bank/upload \
  -H "Authorization: Bearer your_token" \
  -F "file=@transactions.csv"
```

**Response:**
```json
{
  "uploaded": 50,
  "parsed": 48,
  "errors": [
    {
      "line": 15,
      "error": "Invalid amount format"
    }
  ]
}
```

### Get Pending Matches

```bash
curl -X GET "http://localhost:3000/api/csv-bank/pending?limit=50" \
  -H "Authorization: Bearer your_token"
```

**Response:**
```json
{
  "transactions": [
    {
      "id": "tx_001",
      "date": "2025-10-07T23:07:57+09:00",
      "amount": 185000,
      "depositorName": "윤아영",
      "status": "UNMATCHED"
    }
  ],
  "candidates": [
    {
      "txId": "tx_001",
      "invoices": [
        {
          "invoiceId": "inv_xyz789",
          "score": 0.95,
          "reason": "Exact amount + depositor name match"
        }
      ]
    }
  ]
}
```

### Match Transaction to Invoice

```bash
curl -X POST http://localhost:3000/api/csv-bank/match \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_token" \
  -d '{
    "txId": "tx_001",
    "invoiceId": "inv_xyz789"
  }'
```

**Response:**
```json
{
  "matched": true,
  "transaction": {
    "id": "tx_001",
    "status": "MATCHED",
    "matchedInvoiceId": "inv_xyz789"
  },
  "invoice": {
    "id": "inv_xyz789",
    "status": "PAID"
  }
}
```

### Unmatch Transaction

```bash
curl -X POST http://localhost:3000/api/csv-bank/unmatch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_token" \
  -d '{
    "txId": "tx_001"
  }'
```

## Health & Monitoring

### Health Check

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-09T10:00:00.000Z",
  "uptime": 3600,
  "environment": "development",
  "database": {
    "healthy": true,
    "message": "Database connection successful"
  }
}
```

### Database Metrics

```bash
curl http://localhost:3000/api/metrics/db \
  -H "Authorization: Bearer your_token"
```

**Response:**
```json
{
  "total": 20,
  "idle": 15,
  "waiting": 0
}
```

### Performance Metrics

```bash
curl http://localhost:3000/api/monitoring/metrics \
  -H "Authorization: Bearer your_token"
```

## Error Responses

### 400 Bad Request

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "startAt",
        "message": "Invalid date format"
      }
    ]
  }
}
```

### 401 Unauthorized

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

### 403 Forbidden

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```

### 404 Not Found

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

### 500 Internal Server Error

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An internal server error occurred"
  }
}
```

## Postman Collection

Import this collection into Postman for easy API testing:

[Download Postman Collection](../postman/studio-revenue-manager.postman_collection.json)

## JavaScript/TypeScript Examples

### Using Fetch API

```javascript
// Login
const login = async (email, password) => {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  return data;
};

// Get reservations
const getReservations = async (token, startDate, endDate) => {
  const response = await fetch(
    `http://localhost:3000/api/reservation?startDate=${startDate}&endDate=${endDate}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();
  return data;
};

// Create reservation
const createReservation = async (token, reservationData) => {
  const response = await fetch('http://localhost:3000/api/reservation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(reservationData),
  });

  const data = await response.json();
  return data;
};
```

### Using Axios

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

// Add auth token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Login
const login = async (email, password) => {
  const { data } = await api.post('/auth/login', { email, password });
  return data;
};

// Get quote
const calculateQuote = async (quoteData) => {
  const { data } = await api.post('/quote/calculate', quoteData);
  return data;
};

// Upload CSV
const uploadCsv = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await api.post('/csv-bank/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return data;
};
```

## Rate Limiting

- **General**: 100 requests per 15 minutes
- **Auth**: 5 requests per 15 minutes (login/register)
- **API**: 60 requests per 15 minutes

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1633024800
```

---

**API Documentation**: For complete API specification, visit http://localhost:3000/api-docs
