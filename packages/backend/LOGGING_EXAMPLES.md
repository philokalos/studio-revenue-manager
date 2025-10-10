# Logging System Examples

## Example Log Outputs

### 1. HTTP Request Log (Success)

```json
{
  "timestamp": "2025-01-10T12:34:56.789Z",
  "level": "http",
  "message": "HTTP Response",
  "requestId": "a1b2c3d4-e5f6-7890-ab12-cd34ef567890",
  "method": "POST",
  "url": "/api/reservation",
  "path": "/api/reservation",
  "statusCode": 201,
  "duration": 145,
  "contentLength": "512",
  "userId": 5
}
```

### 2. HTTP Request Log (Client Error)

```json
{
  "timestamp": "2025-01-10T12:35:01.234Z",
  "level": "warn",
  "message": "HTTP Response",
  "requestId": "b2c3d4e5-f6g7-8901-bc23-de45fg678901",
  "method": "GET",
  "url": "/api/reservation/999",
  "path": "/api/reservation/999",
  "statusCode": 404,
  "duration": 12,
  "contentLength": "48",
  "userId": 5
}
```

### 3. HTTP Request Log (Server Error)

```json
{
  "timestamp": "2025-01-10T12:35:15.567Z",
  "level": "error",
  "message": "HTTP Response",
  "requestId": "c3d4e5f6-g7h8-9012-cd34-ef56gh789012",
  "method": "POST",
  "url": "/api/invoice",
  "path": "/api/invoice",
  "statusCode": 500,
  "duration": 234,
  "contentLength": "156",
  "userId": 5
}
```

### 4. Slow Query Warning

```json
{
  "timestamp": "2025-01-10T12:36:00.123Z",
  "level": "warn",
  "message": "Slow Query Detected",
  "requestId": "d4e5f6g7-h8i9-0123-de45-fg67hi890123",
  "query": "SELECT r.*, c.*, u.* FROM reservations r JOIN classes c ON r.class_id = c.id JOIN users u ON r.user_id = u.id WHERE r.start_time BETWEEN $1 AND $2 ORDER BY r.start_time",
  "params": ["2025-01-01", "2025-12-31"],
  "duration": 1250,
  "threshold": 1000
}
```

### 5. Database Query Error

```json
{
  "timestamp": "2025-01-10T12:37:00.456Z",
  "level": "error",
  "message": "Database Query Failed",
  "requestId": "e5f6g7h8-i9j0-1234-ef56-gh78ij901234",
  "query": "INSERT INTO reservations (user_id, class_id, status) VALUES ($1, $2, $3)",
  "params": [5, 999, "confirmed"],
  "error": "insert or update on table \"reservations\" violates foreign key constraint \"reservations_class_id_fkey\"",
  "stack": "Error: insert or update on table...\n    at Query.handleError (/app/node_modules/pg/lib/query.js:144:15)..."
}
```

### 6. Validation Error

```json
{
  "timestamp": "2025-01-10T12:38:00.789Z",
  "level": "warn",
  "message": "Client Error",
  "requestId": "f6g7h8i9-j0k1-2345-fg67-hi89jk012345",
  "errorCategory": "validation_error",
  "statusCode": 400,
  "message": "Validation Error",
  "path": "/api/reservation",
  "method": "POST",
  "userId": 5,
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "body": {
    "classId": "invalid",
    "userId": 5
  },
  "validationErrors": [
    {
      "field": "classId",
      "message": "Expected number, received string"
    },
    {
      "field": "startTime",
      "message": "Required"
    }
  ]
}
```

### 7. Server Error with Stack Trace

```json
{
  "timestamp": "2025-01-10T12:39:00.012Z",
  "level": "error",
  "message": "Server Error",
  "requestId": "g7h8i9j0-k1l2-3456-gh78-ij90kl123456",
  "errorCategory": "server_error",
  "statusCode": 500,
  "message": "Cannot read property 'id' of undefined",
  "path": "/api/invoice/123/send",
  "method": "POST",
  "userId": 5,
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "body": {
    "invoiceId": 123
  },
  "stack": "TypeError: Cannot read property 'id' of undefined\n    at sendInvoice (/app/src/routes/invoice.ts:45:30)\n    at Layer.handle [as handle_request] (/app/node_modules/express/lib/router/layer.js:95:5)..."
}
```

### 8. Business Event - Reservation Created

```json
{
  "timestamp": "2025-01-10T12:40:00.345Z",
  "level": "info",
  "message": "New reservation created",
  "eventType": "reservation.created",
  "userId": 5,
  "entityId": 123,
  "entityType": "reservation",
  "requestId": "h8i9j0k1-l2m3-4567-hi89-jk01lm234567",
  "classId": 45,
  "startTime": "2025-01-15T14:00:00Z",
  "status": "confirmed"
}
```

### 9. Business Event - User Login

```json
{
  "timestamp": "2025-01-10T12:41:00.678Z",
  "level": "info",
  "message": "User logged in successfully",
  "eventType": "user.login",
  "userId": 5,
  "requestId": "i9j0k1l2-m3n4-5678-ij90-kl12mn345678"
}
```

### 10. System Event - Server Startup

```json
{
  "timestamp": "2025-01-10T12:00:00.000Z",
  "level": "info",
  "message": "Application started",
  "eventType": "system.startup",
  "nodeVersion": "v20.10.0",
  "platform": "darwin",
  "environment": "production"
}
```

### 11. Performance Metrics Summary

```json
{
  "timestamp": "2025-01-10T12:42:00.901Z",
  "level": "info",
  "message": "Performance Metrics",
  "period": "30s",
  "requestCount": 150,
  "averageResponseTime": 85,
  "slowRequests": 3,
  "memory": {
    "heapUsed": "45.23 MB",
    "heapTotal": "89.45 MB",
    "external": "2.15 MB",
    "rss": "125.67 MB"
  }
}
```

### 12. Database Query Statistics

```json
{
  "timestamp": "2025-01-10T12:43:00.234Z",
  "level": "info",
  "message": "Database Query Statistics",
  "period": "60s",
  "totalQueries": 3500,
  "slowQueries": 15,
  "failedQueries": 2,
  "averageExecutionTime": 45
}
```

### 13. Slow Request Warning

```json
{
  "timestamp": "2025-01-10T12:44:00.567Z",
  "level": "warn",
  "message": "Slow Request Detected",
  "requestId": "j0k1l2m3-n4o5-6789-jk01-lm23no456789",
  "method": "GET",
  "url": "/api/calendar/events?start=2025-01-01&end=2025-12-31",
  "statusCode": 200,
  "duration": 1500,
  "threshold": 1000,
  "memoryDelta": {
    "heapUsed": "5.23 MB",
    "external": "0.15 MB"
  }
}
```

### 14. High Memory Usage Warning

```json
{
  "timestamp": "2025-01-10T12:45:00.890Z",
  "level": "warn",
  "message": "High Memory Usage Detected",
  "heapUsed": "72.15 MB",
  "heapTotal": "89.45 MB",
  "heapUsedPercent": "80.67%",
  "external": "3.25 MB",
  "rss": "145.67 MB"
}
```

### 15. Event Loop Lag Warning

```json
{
  "timestamp": "2025-01-10T12:46:00.123Z",
  "level": "warn",
  "message": "Event Loop Lag Detected",
  "lag": 150,
  "threshold": 100
}
```

## Development Console Output Examples

### Colorized Development Output

```
2025-01-10 12:34:56 [info]: Server started successfully
{
  "port": 3000,
  "environment": "development",
  "nodeVersion": "v20.10.0"
}

2025-01-10 12:35:01 [http]: HTTP Response
{
  "requestId": "a1b2c3d4-e5f6-7890-ab12-cd34ef567890",
  "method": "POST",
  "url": "/api/reservation",
  "statusCode": 201,
  "duration": 145
}

2025-01-10 12:35:15 [warn]: Slow Query Detected
{
  "requestId": "d4e5f6g7-h8i9-0123-de45-fg67hi890123",
  "query": "SELECT r.*, c.*, u.* FROM ...",
  "duration": 1250,
  "threshold": 1000
}

2025-01-10 12:35:30 [error]: Server Error
{
  "requestId": "g7h8i9j0-k1l2-3456-gh78-ij90kl123456",
  "errorCategory": "server_error",
  "statusCode": 500,
  "message": "Cannot read property 'id' of undefined"
}
TypeError: Cannot read property 'id' of undefined
    at sendInvoice (/app/src/routes/invoice.ts:45:30)
    at Layer.handle [as handle_request] (/app/node_modules/express/lib/router/layer.js:95:5)
    ...
```

## Monitoring Endpoint Response Examples

### Health Check Response

**Request:** `GET /api/monitoring/health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-10T12:47:00.456Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0",
  "memory": {
    "used": "45.23 MB",
    "total": "89.45 MB",
    "rss": "125.67 MB"
  },
  "cpu": {
    "usage": {
      "user": 500000,
      "system": 100000
    }
  }
}
```

### Metrics Response

**Request:** `GET /api/monitoring/metrics`

**Response:**
```json
{
  "timestamp": "2025-01-10T12:48:00.789Z",
  "performance": {
    "requestCount": 1500,
    "averageResponseTime": 85,
    "slowRequests": 12,
    "slowRequestPercentage": "0.80%"
  },
  "database": {
    "totalQueries": 3500,
    "slowQueries": 15,
    "failedQueries": 2,
    "averageExecutionTime": 45,
    "slowQueryPercentage": "0.43%"
  },
  "memory": {
    "heapUsed": "45.23 MB",
    "heapTotal": "89.45 MB",
    "external": "2.15 MB",
    "rss": "125.67 MB"
  },
  "system": {
    "uptime": "3600 seconds",
    "nodeVersion": "v20.10.0",
    "platform": "darwin",
    "environment": "production"
  }
}
```

### Recent Logs Response

**Request:** `GET /api/monitoring/logs?level=error&limit=5`

**Response:**
```json
{
  "file": "application-2025-01-10.log",
  "count": 5,
  "logs": [
    {
      "timestamp": "2025-01-10T12:49:00.123Z",
      "level": "error",
      "message": "Server Error",
      "requestId": "k1l2m3n4-o5p6-7890-kl12-mn34op567890",
      "errorCategory": "server_error",
      "statusCode": 500,
      "path": "/api/invoice/send",
      "method": "POST"
    },
    {
      "timestamp": "2025-01-10T12:48:45.456Z",
      "level": "error",
      "message": "Database Query Failed",
      "requestId": "l2m3n4o5-p6q7-8901-lm23-no45pq678901",
      "error": "Connection timeout"
    }
  ]
}
```

### System Info Response

**Request:** `GET /api/monitoring/system`

**Response:**
```json
{
  "node": {
    "version": "v20.10.0",
    "platform": "darwin",
    "arch": "x64"
  },
  "process": {
    "pid": 12345,
    "uptime": "3600 seconds",
    "argv": ["node", "dist/index.js"],
    "execPath": "/usr/local/bin/node",
    "cwd": "/app"
  },
  "memory": {
    "heapUsed": 47456256,
    "heapTotal": 93855744,
    "external": 2254336,
    "rss": 131854336
  },
  "cpu": {
    "user": 500000,
    "system": 100000
  },
  "environment": "production"
}
```

## Log File Examples

### Application Log File (logs/application-2025-01-10.log)

```
{"timestamp":"2025-01-10T12:00:00.000Z","level":"info","message":"Server started successfully","port":3000,"environment":"production","nodeVersion":"v20.10.0"}
{"timestamp":"2025-01-10T12:00:01.234Z","level":"info","message":"Application started","eventType":"system.startup","nodeVersion":"v20.10.0","platform":"darwin","environment":"production"}
{"timestamp":"2025-01-10T12:34:56.789Z","level":"http","message":"HTTP Response","requestId":"a1b2c3d4-e5f6-7890-ab12-cd34ef567890","method":"POST","url":"/api/reservation","statusCode":201,"duration":145}
{"timestamp":"2025-01-10T12:35:01.234Z","level":"warn","message":"HTTP Response","requestId":"b2c3d4e5-f6g7-8901-bc23-de45fg678901","method":"GET","url":"/api/reservation/999","statusCode":404,"duration":12}
{"timestamp":"2025-01-10T12:35:15.567Z","level":"error","message":"Server Error","requestId":"g7h8i9j0-k1l2-3456-gh78-ij90kl123456","errorCategory":"server_error","statusCode":500,"path":"/api/invoice","method":"POST","stack":"TypeError: Cannot read property 'id' of undefined\n    at sendInvoice..."}
```

### Error Log File (logs/error-2025-01-10.log)

```
{"timestamp":"2025-01-10T12:35:15.567Z","level":"error","message":"Server Error","requestId":"g7h8i9j0-k1l2-3456-gh78-ij90kl123456","errorCategory":"server_error","statusCode":500,"path":"/api/invoice","method":"POST","stack":"TypeError: Cannot read property 'id' of undefined\n    at sendInvoice..."}
{"timestamp":"2025-01-10T12:37:00.456Z","level":"error","message":"Database Query Failed","requestId":"e5f6g7h8-i9j0-1234-ef56-gh78ij901234","query":"INSERT INTO reservations...","error":"insert or update on table \"reservations\" violates foreign key constraint...","stack":"Error: insert or update on table...\n    at Query.handleError..."}
{"timestamp":"2025-01-10T12:45:00.890Z","level":"error","message":"CRITICAL ERROR - Notification should be sent","requestId":"m3n4o5p6-q7r8-9012-mn34-op56qr789012","error":"Database connection pool exhausted"}
```
