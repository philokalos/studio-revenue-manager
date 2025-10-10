# Reservations CRUD Functions

Firebase Cloud Functions for managing reservations in Studio Revenue Manager.

## Functions Overview

### 1. Create Reservation
**Function**: `createReservation`
**Endpoint**: `POST /reservations`
**Auth**: Staff or Admin only
**File**: `createReservation.ts`

Creates a new reservation with auto-generated ID.

**Request Body**:
```json
{
  "startTime": "2024-10-15T10:00:00Z",
  "endTime": "2024-10-15T14:00:00Z",
  "initialHeadcount": 5,
  "channel": "default",
  "status": "CONFIRMED",
  "payerName": "John Doe",
  "phone": "010-1234-5678",
  "peopleCount": 5,
  "parkingCount": 2,
  "shootingPurpose": "Product photography",
  "notes": "Need extra lighting equipment"
}
```

**Response**: `201 Created`
```json
{
  "success": true,
  "data": { /* reservation object */ },
  "message": "Reservation created successfully"
}
```

---

### 2. Get Reservations (List)
**Function**: `getReservations`
**Endpoint**: `GET /reservations`
**Auth**: Authenticated users
**File**: `getReservations.ts`

Lists reservations with filtering and pagination.

**Query Parameters**:
- `status` - Filter by status (CONFIRMED, CANCELLED)
- `channel` - Filter by channel (default, hourplace, spacecloud)
- `startDate` - Filter reservations starting after this date (ISO 8601)
- `endDate` - Filter reservations starting before this date (ISO 8601)
- `limit` - Number of results (default: 50, max: 100)

**Example Request**:
```
GET /reservations?status=CONFIRMED&channel=default&limit=20
```

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "reservations": [ /* array of reservation objects */ ],
    "total": 15,
    "limit": 20
  }
}
```

---

### 3. Get Single Reservation
**Function**: `getReservation`
**Endpoint**: `GET /reservations/{id}` or `GET /reservations?id={id}`
**Auth**: Authenticated users
**File**: `getReservation.ts`

Retrieves a single reservation by ID.

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "res_abc123",
    "startTime": { /* Firestore Timestamp */ },
    "endTime": { /* Firestore Timestamp */ },
    "initialHeadcount": 5,
    "status": "CONFIRMED",
    /* ... other fields */
  }
}
```

**Error**: `404 Not Found` if reservation doesn't exist

---

### 4. Update Reservation
**Function**: `updateReservation`
**Endpoint**: `PUT /reservations/{id}` or `PATCH /reservations/{id}`
**Auth**: Staff or Admin only
**File**: `updateReservation.ts`

Updates an existing reservation. All fields are optional.

**Request Body**:
```json
{
  "status": "CANCELLED",
  "notes": "Customer requested cancellation",
  "needsCorrection": false,
  "parkingCount": 0
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "data": { /* updated reservation object */ },
  "message": "Reservation updated successfully"
}
```

**Features**:
- Partial updates supported (send only fields to update)
- Validates date ranges if both startTime and endTime provided
- Converts ISO date strings to Firestore Timestamps
- Auto-updates `updatedAt` timestamp

---

### 5. Delete Reservation
**Function**: `deleteReservation`
**Endpoint**: `DELETE /reservations/{id}` or `DELETE /reservations?id={id}`
**Auth**: Admin only
**File**: `deleteReservation.ts`

Permanently deletes a reservation.

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "res_abc123"
  },
  "message": "Reservation deleted successfully"
}
```

---

## Authentication

All endpoints require Bearer token authentication:

```
Authorization: Bearer <firebase-id-token>
```

### Permission Levels:
- **Customer**: Can only view reservations (get, list)
- **Staff**: Can create, view, and update reservations
- **Admin**: Full access including delete

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Missing required fields: startTime, endTime"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Reservation not found"
}
```

### 405 Method Not Allowed
```json
{
  "success": false,
  "error": "Method not allowed"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error message"
}
```

---

## Validation Rules

### Required Fields (Create):
- `startTime` - ISO 8601 date string
- `endTime` - ISO 8601 date string
- `initialHeadcount` - Positive number

### Optional Fields:
- `googleCalendarEventId` - String
- `channel` - 'default' | 'hourplace' | 'spacecloud' (default: 'default')
- `status` - 'CONFIRMED' | 'CANCELLED' (default: 'CONFIRMED')
- `notes` - String
- `needsCorrection` - Boolean (default: false)
- `payerName` - String
- `phone` - String
- `peopleCount` - Number
- `parkingCount` - Number (default: 0)
- `shootingPurpose` - String
- `customerName`, `customerEmail`, `customerPhone` - Denormalized customer info

### Business Rules:
- `endTime` must be after `startTime`
- `initialHeadcount` must be positive
- `limit` in queries capped at 100

---

## Firestore Schema

**Collection**: `/reservations/{reservationId}`

**Document Structure**:
```typescript
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
  payerName?: string;
  phone?: string;
  peopleCount?: number;
  parkingCount: number;
  shootingPurpose?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## Testing

### Create Reservation (Staff/Admin)
```bash
curl -X POST https://asia-northeast3-{project-id}.cloudfunctions.net/createReservation \
  -H "Authorization: Bearer {id-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "startTime": "2024-10-15T10:00:00Z",
    "endTime": "2024-10-15T14:00:00Z",
    "initialHeadcount": 5,
    "channel": "default",
    "payerName": "Test User"
  }'
```

### List Reservations (Any authenticated user)
```bash
curl -X GET "https://asia-northeast3-{project-id}.cloudfunctions.net/getReservations?status=CONFIRMED&limit=10" \
  -H "Authorization: Bearer {id-token}"
```

### Get Single Reservation (Any authenticated user)
```bash
curl -X GET "https://asia-northeast3-{project-id}.cloudfunctions.net/getReservation?id={reservation-id}" \
  -H "Authorization: Bearer {id-token}"
```

### Update Reservation (Staff/Admin)
```bash
curl -X PUT "https://asia-northeast3-{project-id}.cloudfunctions.net/updateReservation?id={reservation-id}" \
  -H "Authorization: Bearer {id-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "CANCELLED",
    "notes": "Customer cancelled"
  }'
```

### Delete Reservation (Admin only)
```bash
curl -X DELETE "https://asia-northeast3-{project-id}.cloudfunctions.net/deleteReservation?id={reservation-id}" \
  -H "Authorization: Bearer {id-token}"
```

---

## Deployment

Functions are automatically deployed when exported from `functions/src/index.ts`:

```typescript
// In functions/src/index.ts
export * from "./reservations";
```

Deploy with:
```bash
firebase deploy --only functions:createReservation,functions:getReservations,functions:getReservation,functions:updateReservation,functions:deleteReservation
```

Or deploy all functions:
```bash
firebase deploy --only functions
```

---

## Notes

- All timestamps are stored as Firestore Timestamps and must be converted to/from ISO 8601 strings in requests/responses
- The `headcountChanges` array tracks history of headcount modifications
- Customer information can be denormalized for query performance
- Firestore composite indexes may be required for complex queries (see firestore/collections/reservations.schema.ts)
