# Logging & Monitoring Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         HTTP REQUEST                                 │
│                              ↓                                       │
├─────────────────────────────────────────────────────────────────────┤
│                     Security Middleware                              │
│              (Helmet, CORS, Rate Limiting)                          │
└────────────────────────────┬────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    HTTP Logger Middleware                            │
│  • Generate Request ID (UUID)                                        │
│  • Log Request Details                                               │
│  • Track Response Time                                               │
│  • Auto-categorize by Status Code                                    │
└────────────────────────────┬────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                  Performance Monitor Middleware                      │
│  • Response Time Tracking                                            │
│  • Memory Usage Monitoring                                           │
│  • Event Loop Lag Detection                                          │
│  • Slow Request Detection                                            │
└────────────────────────────┬────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      Route Handlers                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Business     │  │ Event        │  │ Database     │              │
│  │ Logic        │  │ Logger       │  │ Operations   │              │
│  │              │  │              │  │              │              │
│  │ • Auth       │  │ • User       │  │ • Query      │              │
│  │ • Reservation│  │   Events     │  │   Logging    │              │
│  │ • Invoice    │  │ • System     │  │ • Slow Query │              │
│  │ • Calendar   │  │   Events     │  │   Detection  │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└────────────────────────────┬────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    Error Handler Middleware                          │
│  • Error Categorization                                              │
│  • Sensitive Data Sanitization                                       │
│  • Request Context Preservation                                      │
│  • Critical Error Notifications                                      │
└────────────────────────────┬────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      Winston Logger Core                             │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Console    │  │  File Logs   │  │ Error Logs   │              │
│  │  Transport   │  │  Transport   │  │  Transport   │              │
│  │              │  │              │  │              │              │
│  │ • Dev Mode   │  │ • Daily      │  │ • Errors     │              │
│  │ • Colorized  │  │   Rotation   │  │   Only       │              │
│  │ • Formatted  │  │ • Compressed │  │ • Stack      │              │
│  │              │  │ • 14 Day     │  │   Traces     │              │
│  │              │  │   Retention  │  │              │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐                                 │
│  │ Exceptions   │  │ Rejections   │                                 │
│  │  Handler     │  │  Handler     │                                 │
│  │              │  │              │                                 │
│  │ • Uncaught   │  │ • Unhandled  │                                 │
│  │   Exceptions │  │   Promise    │                                 │
│  │ • Daily      │  │   Rejections │                                 │
│  │   Rotation   │  │ • Daily      │                                 │
│  │              │  │   Rotation   │                                 │
│  └──────────────┘  └──────────────┘                                 │
└────────────────────────────┬────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         Log Files                                    │
│                                                                      │
│  logs/                                                               │
│  ├── application-2025-01-10.log      (All logs)                     │
│  ├── application-2025-01-10.log.gz   (Compressed old logs)          │
│  ├── error-2025-01-10.log            (Errors only)                  │
│  ├── exceptions-2025-01-10.log       (Uncaught exceptions)          │
│  └── rejections-2025-01-10.log       (Unhandled rejections)         │
└─────────────────────────────────────────────────────────────────────┘
```

## Monitoring Endpoints

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Monitoring API Endpoints                          │
│                                                                      │
│  GET /api/monitoring/health                                          │
│  ├── System Health Status                                            │
│  ├── Uptime Information                                              │
│  ├── Memory Usage                                                    │
│  └── CPU Usage                                                       │
│                                                                      │
│  GET /api/monitoring/metrics                                         │
│  ├── Performance Metrics                                             │
│  │   ├── Request Count                                               │
│  │   ├── Average Response Time                                       │
│  │   └── Slow Requests                                               │
│  ├── Database Metrics                                                │
│  │   ├── Total Queries                                               │
│  │   ├── Slow Queries                                                │
│  │   └── Failed Queries                                              │
│  └── Memory Metrics                                                  │
│                                                                      │
│  GET /api/monitoring/logs?level=info&limit=100                      │
│  ├── Recent Log Entries                                              │
│  ├── Filter by Level                                                 │
│  └── Pagination Support                                              │
│                                                                      │
│  GET /api/monitoring/system                                          │
│  ├── Node.js Version                                                 │
│  ├── Platform Information                                            │
│  └── Process Details                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

## Log Flow by Request Type

### Successful Request Flow

```
1. Request arrives
   ↓
2. httpLogger: Log request with requestId
   ↓
3. performanceMonitor: Start timing
   ↓
4. Route handler executes
   ↓
5. Database query (if any)
   ↓
6. queryLogger: Log query execution time
   ↓
7. Response sent
   ↓
8. httpLogger: Log response (HTTP level)
   ↓
9. performanceMonitor: Log performance (DEBUG level)
   ↓
10. Winston: Write to file/console
```

### Error Request Flow

```
1. Request arrives
   ↓
2. httpLogger: Log request with requestId
   ↓
3. performanceMonitor: Start timing
   ↓
4. Route handler executes
   ↓
5. Error occurs
   ↓
6. errorHandler: Catch error
   ↓
7. errorHandler: Sanitize sensitive data
   ↓
8. errorHandler: Categorize error
   ↓
9. errorHandler: Log error (WARN/ERROR level)
   ↓
10. errorHandler: Send error response
   ↓
11. httpLogger: Log response (WARN level for 4xx, ERROR for 5xx)
   ↓
12. performanceMonitor: Log performance
   ↓
13. Winston: Write to file/console (+ error file for errors)
```

## Log Levels

```
┌──────────┬─────────────────────────────────────────────────────────┐
│  Level   │  Usage                                                   │
├──────────┼─────────────────────────────────────────────────────────┤
│  error   │  Server errors (5xx), critical failures                 │
│  warn    │  Client errors (4xx), slow queries, high memory         │
│  info    │  Business events, system events, metrics                │
│  http    │  HTTP requests/responses (2xx, 3xx)                     │
│  debug   │  Detailed debugging information, query details          │
└──────────┴─────────────────────────────────────────────────────────┘
```

## Periodic Background Tasks

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Background Monitoring                             │
│                                                                      │
│  Every 30 seconds:                                                   │
│  ├── Performance Metrics Collection                                  │
│  ├── Memory Usage Monitoring                                         │
│  └── Event Loop Lag Detection                                        │
│                                                                      │
│  Every 60 seconds:                                                   │
│  ├── Database Query Statistics                                       │
│  └── Slow Query Summary                                              │
│                                                                      │
│  Daily:                                                              │
│  ├── Log File Rotation                                               │
│  ├── Compress Old Logs                                               │
│  └── Delete Logs Older Than 14 Days                                  │
└─────────────────────────────────────────────────────────────────────┘
```

## Environment-Specific Configuration

### Development Environment

```
┌──────────────────────────────────────────────────────────────────┐
│  Development Mode                                                 │
│  ├── Log Level: debug                                             │
│  ├── Console Output: Colorized with timestamps                    │
│  ├── File Logging: Enabled                                        │
│  ├── Detailed Request Logging: Available                          │
│  └── Stack Traces: Included in error responses                    │
└──────────────────────────────────────────────────────────────────┘
```

### Production Environment

```
┌──────────────────────────────────────────────────────────────────┐
│  Production Mode                                                  │
│  ├── Log Level: info                                              │
│  ├── Console Output: JSON format                                  │
│  ├── File Logging: Enabled with rotation                          │
│  ├── Detailed Request Logging: Disabled                           │
│  ├── Stack Traces: Excluded from error responses                  │
│  └── Critical Error Alerts: Enabled (TODO)                        │
└──────────────────────────────────────────────────────────────────┘
```

## Data Flow Summary

```
HTTP Request
    ↓
Security Middleware
    ↓
HTTP Logger (requestId generation)
    ↓
Performance Monitor (timing start)
    ↓
Route Handler
    ├─→ Event Logger (business events)
    └─→ Database Operations
            ├─→ Query Logger (slow query detection)
            └─→ Query Stats (aggregation)
    ↓
Response / Error
    ↓
Error Handler (if error)
    ├─→ Sanitize sensitive data
    ├─→ Categorize error
    └─→ Log with context
    ↓
HTTP Logger (response logging)
    ↓
Performance Monitor (performance metrics)
    ↓
Winston Logger Core
    ├─→ Console Transport
    ├─→ File Transport (daily rotation)
    ├─→ Error File Transport
    ├─→ Exception Handler
    └─→ Rejection Handler
    ↓
Log Files (14-day retention, compressed)
```
