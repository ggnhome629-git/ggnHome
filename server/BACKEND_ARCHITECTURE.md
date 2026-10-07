# GgnHome Backend Professional Architecture

## Overview
Professional layered backend architecture following MVC + Services pattern with comprehensive error handling, validation, logging, rate limiting, and headless scraper integration.

---

## Architecture Layers

### Layer 1: Express Server (`server/index.js`)
- Middleware setup (helmet, CORS, rate limiting, validation)
- Route registration
- Global error handling
- Graceful shutdown

### Layer 2: Routes (`server/Route/`)
- HTTP method mapping
- Route-specific middleware (auth, rate limiters)
- Controller binding

### Layer 3: Controllers (`server/controllers/`)
- Request validation
- Parse input
- Call services
- Format response
- Thin layer, no business logic

### Layer 4: Services (`server/services/`)
- Business logic
- Data transformation
- Multi-step operations
- Database transactions
- Cross-service orchestration

### Layer 5: Models (`server/models/`)
- Sequelize ORM models
- Associations
- Database schema

### Layer 6: Utils & Infrastructure
- Config (DB, cache, logging)
- Helpers (validation, formatters)
- Cron jobs

---

## Professional Patterns Implemented

### 1. Response Envelope
All responses follow consistent structure:

```javascript
// Success (200)
{
  success: true,
  message: "Operation successful",
  data: { ... },
  meta: { requestId: "...", timestamp: "..." }
}

// Error (4xx/5xx)
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Field is required",
    details: [ ... ]
  },
  meta: { requestId: "..." }
}
```

### 2. Error Hierarchy
```
BaseError
├── ValidationError (400)
├── AuthenticationError (401)
├── AuthorizationError (403)
├── NotFoundError (404)
└── ServerError (500)
```

### 3. Validation
- Joi middleware for request validation
- `abortEarly: false` to collect all errors
- Strip unknown keys for security
- Custom error formatting

### 4. Authentication
- JWT bearer token in Authorization header
- Middleware to attach req.user
- Role-based access control (RBAC)
- Account status checks

### 5. Database
- Sequelize ORM with explicit connection pooling
- Transaction support for multi-step writes
- Centralized association definitions
- Migration support

### 6. Logging
- Winston logger with multiple transports
- Structured logging for all events
- Log levels: debug, info, warn, error
- Separate files for different log types

### 7. Caching
- Redis for session cache
- Cache-aside pattern
- Automatic expiry
- Cache invalidation on writes

### 8. Rate Limiting
- Per-endpoint rate limits
- IP-based throttling
- Per-user limits for authenticated endpoints
- Configurable via environment

---

## Directory Structure

```
server/
├── index.js                          # Express app setup
├── config/
│   ├── database.js                   # DB connection & pool
│   ├── redis.js                      # Redis client
│   └── logger.js                     # Winston logger setup
├── middleware/
│   ├── auth.js                       # JWT auth
│   ├── validate.js                   # Joi validation
│   ├── errorHandler.js               # Error processing
│   ├── rateLimit.js                  # Rate limiting
│   └── requestContext.js             # Request ID, user context
├── routes/
│   ├── index.js                      # Main router
│   ├── properties.js                 # Property endpoints
│   ├── users.js                      # User endpoints
│   ├── analytics.js                  # Analytics endpoints
│   ├── admin.js                      # Admin endpoints
│   └── scraper.js                    # Scraper control endpoints
├── controllers/
│   ├── property.controller.js        # Property logic dispatch
│   ├── user.controller.js
│   ├── analytics.controller.js
│   ├── admin.controller.js
│   └── scraper.controller.js
├── services/
│   ├── property.service.js           # Property business logic
│   ├── user.service.js
│   ├── analytics.service.js
│   ├── admin.service.js
│   ├── scraper.service.js            # Scraper orchestration
│   └── auth.service.js               # Auth logic
├── models/
│   ├── Property.js
│   ├── User.js
│   ├── Analytics.js
│   └── index.js                      # Associations
├── validators/
│   ├── property.schema.js            # Joi schemas
│   ├── user.schema.js
│   ├── common.schema.js
│   └── index.js
├── utils/
│   ├── errors.js                     # Error classes
│   ├── response.js                   # Response formatter
│   ├── helpers.js                    # Utility functions
│   └── formatters.js                 # Data formatters
├── cron/
│   ├── scraper.cron.js               # Scraper scheduling
│   └── sync.cron.js                  # Sync jobs
├── middleware-scrapers/              # Headless scraper
│   ├── index.js
│   ├── browser.js                    # Puppeteer browser pool
│   ├── scrapers/
│   │   ├── nobroker.js
│   │   └── 99acres.js
│   └── utils/
│       ├── logger.js
│       └── helpers.js
└── tests/                            # Unit & integration tests
```

---

## Rate Limiting Strategy

### Global Limits
- 600 requests/minute per IP (general API)

### Endpoint-Specific Limits
- OTP requests: 5/10min per mobile, 30/hour per IP
- OTP verification: 10/10min per mobile
- Login: 15/15min per mobile
- Search: 100/min per IP
- Create property: 10/hour per user
- Contact/enquiry: 20/hour per IP
- Chat: 60/10min per user

### Skip Conditions
- Set `DISABLE_RATE_LIMIT=true` for testing

---

## Server-Side Scraper Integration

### Architecture
```
Scraper Service Layer
├── Schedule: Daily at 2 AM UTC
├── Headless Browser Pool (Puppeteer)
│   ├── Max 3 concurrent browsers
│   ├── Auto-retry failed pages
│   └── Screenshot on error
├── Data Validation & Dedupe
├── Database Upsert
└── Webhook Notifications (optional)
```

### Endpoints
- `POST /api/admin/scraper/run` - Manual trigger
- `GET /api/admin/scraper/status` - Current status
- `GET /api/admin/scraper/logs` - Recent logs
- `POST /api/admin/scraper/stop` - Cancel ongoing

### Benefits
- No external system to maintain
- Automatic error recovery
- Integrated with app monitoring
- Database changes in real-time
- Can scale with server resources

---

## Security Measures

1. **Input Validation**
   - Joi schemas for all endpoints
   - Type checking and sanitization
   - Max length limits

2. **Authentication**
   - JWT bearer tokens
   - Token expiry (24 hours access, 7 days refresh)
   - Account status checks

3. **Authorization**
   - Role-based access control
   - Resource-level permissions
   - Admin-only endpoints protected

4. **Protection**
   - Helmet for security headers
   - CORS with origin validation
   - Rate limiting on sensitive endpoints
   - SQL injection prevention (Sequelize ORM)
   - XSS protection via JSON responses

5. **Data Security**
   - Password hashing (bcrypt)
   - Sensitive data not in logs
   - Error messages don't leak system info
   - Request ID tracking for audit

---

## Database Transactions

For multi-step writes (e.g., create property with images, analytics):

```javascript
const transaction = await sequelize.transaction();
try {
  const property = await Property.create(data, { transaction });
  await PropertyImage.bulkCreate(images, { transaction });
  await Analytics.create(event, { transaction });
  await transaction.commit();
  return property;
} catch (err) {
  await transaction.rollback();
  throw err;
}
```

---

## Logging Structure

### Log Types
1. **Application Logs** - Info, warnings, errors
2. **Audit Logs** - User actions (login, property create, etc.)
3. **Scraper Logs** - Scraper runs, errors, stats
4. **Performance Logs** - Slow queries, API latency

### Log Format (JSON)
```json
{
  "timestamp": "2026-10-07T10:00:00Z",
  "level": "info",
  "service": "property-service",
  "requestId": "uuid-...",
  "userId": "user-123",
  "message": "Property created",
  "duration": 245,
  "data": { "propertyId": "prop-456" }
}
```

---

## Monitoring & Alerts

### Metrics to Track
- Request latency (p50, p95, p99)
- Error rate by endpoint
- Database query performance
- Cache hit rate
- Scraper success rate
- Disk usage (logs)

### Alerts
- Error rate > 5%
- Latency p95 > 2s
- Scraper fails 3x in a row
- Database connection pool exhausted
- Disk usage > 80%

---

## Testing

### Unit Tests (Services)
- Business logic only
- No database calls
- Mock dependencies

### Integration Tests (Controllers)
- Full request/response cycle
- Real database (test database)
- Auth and validation

### Load Tests
- 1000 requests/second
- Check rate limiting
- Monitor memory usage

---

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Redis connection verified
- [ ] Rate limiting enabled
- [ ] Logging configured
- [ ] Scraper scheduled
- [ ] Health check endpoint working
- [ ] Error handling tested
- [ ] CORS origins configured
- [ ] JWT secret strong
- [ ] Database backups scheduled
- [ ] Log rotation configured
- [ ] Monitoring alerts set
- [ ] Graceful shutdown configured

---

## API Response Examples

### Success (Property Created)
```json
{
  "success": true,
  "message": "Property created successfully",
  "data": {
    "id": "prop_123",
    "title": "2 BHK in Sector 31",
    "price": 45000,
    "createdAt": "2026-10-07T10:00:00Z"
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2026-10-07T10:00:00Z"
  }
}
```

### Validation Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "price",
        "message": "Price must be a positive number"
      },
      {
        "field": "title",
        "message": "Title is required"
      }
    ]
  },
  "meta": {
    "requestId": "req_abc123"
  }
}
```

### Rate Limited
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again later."
  },
  "meta": {
    "retryAfter": 60,
    "requestId": "req_abc123"
  }
}
```

---

## Future Enhancements

1. GraphQL API alongside REST
2. WebSocket for real-time notifications
3. Event sourcing for audit trail
4. Elasticsearch for advanced search
5. gRPC for internal service communication
6. Message queues (RabbitMQ/Kafka) for async tasks
7. Distributed tracing (Jaeger)
8. API versioning (v1, v2)
9. Webhook system for integrations
10. OpenAPI/Swagger documentation

---

## References

- Express.js Best Practices: https://expressjs.com/en/advanced/best-practice-security.html
- Sequelize Docs: https://sequelize.org/
- Winston Logging: https://github.com/winstonjs/winston
- Rate Limiting: https://github.com/nfriedly/express-rate-limit
- Puppeteer: https://pptr.dev/

