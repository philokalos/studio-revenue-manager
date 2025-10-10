# Invoice Functions API Documentation

## Overview

Five Cloud Functions for managing invoices in Studio Revenue Manager:

1. **createInvoice** - Create invoice for reservation (Staff/Admin)
2. **getInvoices** - List invoices with filtering (Authenticated)
3. **getInvoice** - Get single invoice (Authenticated)
4. **updateInvoice** - Update invoice/record payment (Staff/Admin)
5. **deleteInvoice** - Void invoice (Admin only)

All endpoints require authentication via Bearer token in Authorization header.

## Base URL

```
https://asia-northeast3-[PROJECT-ID].cloudfunctions.net/
```

## Authentication

All requests require authentication header:

```
Authorization: Bearer <firebase-id-token>
```

## Endpoints

### 1. Create Invoice

**Endpoint:** `POST /createInvoice`

**Access:** Staff/Admin only

**Request Body:**

```json
{
  "reservationId": "res_123",
  "expectedAmount": 100000,
  "discountType": "rate",       // Optional: "amount" or "rate"
  "discountValue": 10,           // Optional: number
  "dueDate": "2024-12-31"        // Optional: ISO date string
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "inv_abc123",
    "reservationId": "res_123",
    "expectedAmount": 100000,
    "discountType": "rate",
    "discountValue": 10,
    "discountAmount": 10000,
    "finalAmount": 90000,
    "status": "OPEN",
    "paidAmount": 0,
    "discountLogs": [
      {
        "appliedBy": "user_xyz",
        "appliedAt": "2024-01-15T10:00:00Z",
        "discountType": "rate",
        "discountValue": 10
      }
    ],
    "dueDate": "2024-12-31T00:00:00Z",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  },
  "message": "Invoice created successfully"
}
```

**Discount Calculation:**
- `discountType: "amount"` → discountAmount = discountValue
- `discountType: "rate"` → discountAmount = expectedAmount × (discountValue / 100)
- finalAmount = expectedAmount - discountAmount

### 2. Get Invoices (List)

**Endpoint:** `GET /getInvoices`

**Access:** Authenticated users

**Query Parameters:**

```
?status=OPEN                    // Filter by status (OPEN|PAID|PARTIAL|VOID)
&reservationId=res_123          // Filter by reservation
&dueDate=2024-12-31             // Filter by due date
&limit=20                       // Results limit (default: 50, max: 100)
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "invoices": [
      {
        "id": "inv_abc123",
        "reservationId": "res_123",
        "expectedAmount": 100000,
        "finalAmount": 90000,
        "status": "OPEN",
        "paidAmount": 0,
        "createdAt": "2024-01-15T10:00:00Z",
        "updatedAt": "2024-01-15T10:00:00Z"
      }
    ],
    "count": 1,
    "limit": 50
  }
}
```

**Notes:**
- Results ordered by `createdAt` descending (newest first)
- Default limit: 50, maximum: 100

### 3. Get Invoice (Single)

**Endpoint:** `GET /getInvoice?id={invoiceId}`

**Access:** Authenticated users

**Query Parameters:**

```
?id=inv_abc123                  // Required: Invoice ID
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "inv_abc123",
    "reservationId": "res_123",
    "expectedAmount": 100000,
    "discountAmount": 10000,
    "finalAmount": 90000,
    "status": "OPEN",
    "paidAmount": 0,
    "discountLogs": [],
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
}
```

**Error (404):**

```json
{
  "success": false,
  "error": "Invoice not found"
}
```

### 4. Update Invoice

**Endpoint:** `PUT /updateInvoice` or `PATCH /updateInvoice`

**Access:** Staff/Admin only

**Request Body:**

```json
{
  "id": "inv_abc123",

  // Update expected amount
  "expectedAmount": 120000,

  // Update discount
  "discountType": "amount",
  "discountValue": 15000,

  // Record payment
  "paidAmount": 50000,
  "paymentMethod": "card",

  // Update due date
  "dueDate": "2024-12-31"         // Or null to remove
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "inv_abc123",
    "expectedAmount": 120000,
    "discountAmount": 15000,
    "finalAmount": 105000,
    "status": "PARTIAL",           // Auto-updated based on payment
    "paidAmount": 50000,
    "paymentDate": "2024-01-15T11:00:00Z",
    "paymentMethod": "card",
    "discountLogs": [
      {
        "appliedBy": "user_xyz",
        "appliedAt": "2024-01-15T11:00:00Z",
        "discountType": "amount",
        "discountValue": 15000
      }
    ],
    "updatedAt": "2024-01-15T11:00:00Z"
  },
  "message": "Invoice updated successfully"
}
```

**Status Auto-Update Logic:**
- `paidAmount >= finalAmount` → status = **PAID**
- `0 < paidAmount < finalAmount` → status = **PARTIAL**
- `paidAmount = 0` → status = **OPEN**

**Payment Recording:**
- Setting `paidAmount` automatically sets `paymentDate` to current timestamp
- `paymentMethod` is optional but recommended (e.g., "card", "cash", "transfer")

**Restrictions:**
- Cannot update VOID invoices
- finalAmount cannot be negative

### 5. Delete Invoice (Void)

**Endpoint:** `DELETE /deleteInvoice?id={invoiceId}`

**Access:** Admin only

**Query Parameters:**

```
?id=inv_abc123                  // Invoice ID to void
```

**Request Body (Alternative):**

```json
{
  "id": "inv_abc123"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "inv_abc123",
    "status": "VOID"
  },
  "message": "Invoice voided successfully"
}
```

**Notes:**
- Does not delete the invoice document
- Sets status to "VOID" instead
- Cannot void already-voided invoices

## Status Values

| Status | Description |
|--------|-------------|
| **OPEN** | Invoice created, no payment received |
| **PARTIAL** | Partial payment received (0 < paid < final) |
| **PAID** | Fully paid (paid >= final) |
| **VOID** | Invoice voided/cancelled |

## Error Responses

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Missing or invalid authorization header"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": "Insufficient permissions"
}
```

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Missing required fields: reservationId, expectedAmount"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Invoice not found"
}
```

**405 Method Not Allowed:**
```json
{
  "success": false,
  "error": "Method not allowed"
}
```

## Example Usage (cURL)

### Create Invoice
```bash
curl -X POST \
  https://asia-northeast3-PROJECT-ID.cloudfunctions.net/createInvoice \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reservationId": "res_123",
    "expectedAmount": 100000,
    "discountType": "rate",
    "discountValue": 10
  }'
```

### List Invoices
```bash
curl -X GET \
  "https://asia-northeast3-PROJECT-ID.cloudfunctions.net/getInvoices?status=OPEN&limit=20" \
  -H "Authorization: Bearer YOUR_ID_TOKEN"
```

### Record Payment
```bash
curl -X PUT \
  https://asia-northeast3-PROJECT-ID.cloudfunctions.net/updateInvoice \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "inv_abc123",
    "paidAmount": 90000,
    "paymentMethod": "card"
  }'
```

### Void Invoice
```bash
curl -X DELETE \
  "https://asia-northeast3-PROJECT-ID.cloudfunctions.net/deleteInvoice?id=inv_abc123" \
  -H "Authorization: Bearer YOUR_ID_TOKEN"
```

## Common Workflows

### Complete Payment Flow

1. **Create invoice for reservation:**
   ```json
   POST /createInvoice
   {
     "reservationId": "res_123",
     "expectedAmount": 100000,
     "discountType": "rate",
     "discountValue": 10
   }
   // finalAmount = 90000
   ```

2. **Record partial payment:**
   ```json
   PUT /updateInvoice
   {
     "id": "inv_abc123",
     "paidAmount": 50000,
     "paymentMethod": "card"
   }
   // status → PARTIAL
   ```

3. **Record final payment:**
   ```json
   PUT /updateInvoice
   {
     "id": "inv_abc123",
     "paidAmount": 90000,
     "paymentMethod": "card"
   }
   // status → PAID
   ```

### Apply Additional Discount

```json
PUT /updateInvoice
{
  "id": "inv_abc123",
  "discountType": "amount",
  "discountValue": 5000
}
// New entry added to discountLogs array
// finalAmount recalculated
```
