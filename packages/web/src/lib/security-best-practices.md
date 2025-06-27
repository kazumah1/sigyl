---
title: "Security Best Practices for MCP Deployments"
excerpt: "Essential security considerations when deploying Model Context Protocol servers, including authentication, encryption, and monitoring."
author: "Alex Rivera"
date: "2024-01-12"
readTime: "10 min read"
category: "technical"
tags: ["security", "technical"]
---

# Security Best Practices for MCP Deployments

Security is paramount when deploying Model Context Protocol (MCP) servers, especially when they handle sensitive data or provide access to critical systems. This guide covers essential security practices to keep your MCP deployments safe and compliant.

## The Security Challenge

MCP servers act as bridges between AI applications and your data sources, making them potential attack vectors. A compromised MCP server could expose:

- **Sensitive data** (user information, API keys, database credentials)
- **System access** (database connections, internal APIs)
- **Business logic** (proprietary algorithms, workflows)

## 1. Authentication & Authorization

### Implement Proper Authentication

Always require authentication for your MCP server:

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";

const server = new Server(
  {
    name: "secure-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Add authentication middleware
server.use(async (request, next) => {
  const authHeader = request.headers?.authorization;
  
  if (!authHeader) {
    throw new Error("Authentication required");
  }
  
  // Validate JWT token
  const token = authHeader.replace("Bearer ", "");
  const user = await validateJWT(token);
  
  if (!user) {
    throw new Error("Invalid authentication token");
  }
  
  // Add user to request context
  request.context = { user };
  
  return next();
});
```

### Role-Based Access Control

Implement fine-grained permissions:

```typescript
interface User {
  id: string;
  roles: string[];
  permissions: string[];
}

const checkPermission = (user: User, requiredPermission: string) => {
  return user.permissions.includes(requiredPermission);
};

// In your tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const user = request.context.user;
  
  if (!checkPermission(user, "read:database")) {
    throw new Error("Insufficient permissions");
  }
  
  // Proceed with tool execution
});
```

## 2. Secret Management

### Never Hardcode Secrets

❌ **Bad Practice:**
```typescript
const apiKey = "sk-1234567890abcdef"; // Never do this!
```

✅ **Good Practice:**
```typescript
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}
```

### Use SIGYL's Secret Manager

Leverage SIGYL's built-in secret management:

```yaml
# mcp.yaml
secrets:
  - name: OPENAI_API_KEY
    description: OpenAI API key for AI operations
    required: true
    type: string
  - name: DATABASE_URL
    description: Database connection string
    required: true
    type: string
  - name: JWT_SECRET
    description: Secret for JWT token signing
    required: true
    type: string
```

### Rotate Secrets Regularly

Implement automatic secret rotation:

```typescript
import { SecretManager } from "@sigyl/secret-manager";

const secretManager = new SecretManager();

// Check if secrets need rotation
const needsRotation = await secretManager.checkRotationNeeded();
if (needsRotation) {
  await secretManager.rotateSecrets();
}
```

## 3. Input Validation & Sanitization

### Validate All Inputs

Use Zod for comprehensive input validation:

```typescript
import { z } from "zod";

const userQuerySchema = z.object({
  query: z.string().min(1).max(1000),
  filters: z.object({
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    }).optional(),
    userId: z.string().uuid().optional(),
  }).optional(),
});

// In your tool handler
const validatedInput = userQuerySchema.parse(args);
```

### Sanitize Database Queries

Prevent SQL injection:

```typescript
import { sql } from "drizzle-orm";

// Use parameterized queries
const users = await db.execute(
  sql`SELECT * FROM users WHERE id = ${userId} AND active = true`
);

// Never use string concatenation
// ❌ const query = `SELECT * FROM users WHERE id = '${userId}'`;
```

## 4. Rate Limiting & DDoS Protection

### Implement Rate Limiting

Protect against abuse:

```typescript
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP",
  standardHeaders: true,
  legacyHeaders: false,
});

server.use(limiter);
```

### Add Request Throttling

Implement per-user throttling:

```typescript
import { Throttler } from "./throttler";

const throttler = new Throttler({
  maxRequests: 1000,
  windowMs: 60 * 1000, // 1 minute
});

server.use(async (request, next) => {
  const user = request.context.user;
  
  if (!throttler.allow(user.id)) {
    throw new Error("Rate limit exceeded");
  }
  
  return next();
});
```

## 5. Logging & Monitoring

### Comprehensive Logging

Log all security-relevant events:

```typescript
import winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "security.log" }),
    new winston.transports.Console(),
  ],
});

// Log authentication attempts
logger.info("Authentication attempt", {
  userId: user.id,
  ip: request.ip,
  userAgent: request.headers["user-agent"],
  success: true,
});
```

### Security Monitoring

Set up alerts for suspicious activity:

```typescript
import { SecurityMonitor } from "./security-monitor";

const monitor = new SecurityMonitor({
  alertThresholds: {
    failedLogins: 5,
    unusualRequests: 10,
    dataAccess: 100,
  },
});

// Monitor for suspicious patterns
monitor.trackEvent({
  type: "tool_call",
  userId: user.id,
  tool: request.params.name,
  timestamp: new Date(),
});
```

## 6. Network Security

### Use HTTPS

Always use HTTPS in production:

```typescript
import https from "https";
import fs from "fs";

const options = {
  key: fs.readFileSync("private-key.pem"),
  cert: fs.readFileSync("certificate.pem"),
};

const server = https.createServer(options, app);
```

### Implement CORS Properly

Restrict cross-origin requests:

```typescript
import cors from "cors";

const corsOptions = {
  origin: ["https://yourdomain.com", "https://app.sigyl.dev"],
  credentials: true,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

server.use(cors(corsOptions));
```

## 7. Data Protection

### Encrypt Sensitive Data

Encrypt data at rest and in transit:

```typescript
import crypto from "crypto";

const encrypt = (text: string, key: string) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher("aes-256-gcm", key);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  return {
    encrypted,
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
  };
};
```

### Data Minimization

Only collect and store necessary data:

```typescript
// Only log essential information
logger.info("Tool executed", {
  toolName: request.params.name,
  userId: user.id,
  timestamp: new Date(),
  // Don't log sensitive input data
});
```

## 8. Regular Security Audits

### Automated Security Scanning

Set up automated security checks:

```yaml
# .github/workflows/security.yml
name: Security Scan
on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run security scan
        run: |
          npm audit
          npm run security:scan
```

### Dependency Monitoring

Keep dependencies updated:

```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Use automated tools
npm install -g npm-check-updates
ncu -u
```

## 9. Incident Response Plan

### Prepare for Security Incidents

Have a plan ready:

```typescript
class SecurityIncidentHandler {
  async handleIncident(incident: SecurityIncident) {
    // 1. Immediate response
    await this.containThreat(incident);
    
    // 2. Investigation
    const analysis = await this.investigate(incident);
    
    // 3. Notification
    await this.notifyStakeholders(incident, analysis);
    
    // 4. Recovery
    await this.recover(incident);
    
    // 5. Post-incident review
    await this.learn(incident);
  }
}
```

## 10. Compliance Considerations

### GDPR Compliance

If handling EU data:

```typescript
// Implement data subject rights
const handleDataRequest = async (userId: string, requestType: string) => {
  switch (requestType) {
    case "access":
      return await exportUserData(userId);
    case "deletion":
      return await deleteUserData(userId);
    case "rectification":
      return await updateUserData(userId);
  }
};
```

### SOC 2 Compliance

For enterprise deployments:

```typescript
// Implement audit trails
const auditLog = {
  timestamp: new Date(),
  userId: user.id,
  action: "data_access",
  resource: "user_profiles",
  result: "success",
  ipAddress: request.ip,
  userAgent: request.headers["user-agent"],
};
```

## Conclusion

Security is not a one-time setup but an ongoing process. By implementing these best practices, you'll create a robust security foundation for your MCP deployments.

### Key Takeaways

1. **Always authenticate and authorize** users
2. **Never hardcode secrets** - use environment variables
3. **Validate and sanitize** all inputs
4. **Implement rate limiting** to prevent abuse
5. **Log and monitor** security events
6. **Use HTTPS** and proper CORS settings
7. **Encrypt sensitive data** at rest and in transit
8. **Regular security audits** and dependency updates
9. **Have an incident response plan** ready
10. **Consider compliance requirements** for your use case

### Resources

- [OWASP Security Guidelines](https://owasp.org/)
- [SIGYL Security Documentation](https://docs.sigyl.dev/security)
- [MCP Security Best Practices](https://modelcontextprotocol.io/security)

---

*Security is everyone's responsibility. Stay vigilant and keep your MCP deployments secure!* 