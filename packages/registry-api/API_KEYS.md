# API Key Management System

The Sigyl MCP Registry API includes a comprehensive API key management system that provides secure authentication and authorization for API access.

## Features

- **Secure API Key Generation**: Cryptographically secure API keys with HMAC-SHA256 hashing
- **Permission-Based Access Control**: Fine-grained permissions (read, write, admin)
- **Usage Tracking**: Monitor API usage with detailed statistics
- **Key Expiration**: Optional expiration dates for API keys
- **Rate Limiting**: Built-in rate limiting per API key
- **User Management**: User profiles with email and GitHub integration

## Database Schema

### Tables

1. **api_users**: User profiles
2. **api_keys**: API key storage (hashed)
3. **api_key_usage**: Usage tracking and analytics

### Key Features

- API keys are hashed using HMAC-SHA256 before storage
- Only key prefixes are stored for display purposes
- Full API keys are only returned once during creation
- Automatic usage logging with response times and IP addresses

## Setup

### 1. Run Database Migrations

```bash
npm run migrate:api-keys
```

### 2. Create Your First API Key

```bash
npm run manage-keys
```

Follow the interactive prompts to:
1. Create a user
2. Generate an API key with appropriate permissions

## API Endpoints

### Authentication

All authenticated endpoints require the API key in the Authorization header:

```
Authorization: Bearer sk_your_api_key_here
```

Or without the Bearer prefix:

```
Authorization: sk_your_api_key_here
```

### API Key Management

#### Create API Key
```http
POST /api/v1/keys
Authorization: Bearer <existing_api_key>
Content-Type: application/json

{
  "name": "My API Key",
  "permissions": ["read", "write"],
  "expires_at": "2024-12-31T23:59:59Z"
}
```

#### List API Keys
```http
GET /api/v1/keys
Authorization: Bearer <api_key>
```

#### Get API Key Details
```http
GET /api/v1/keys/:id
Authorization: Bearer <api_key>
```

#### Get API Key Statistics
```http
GET /api/v1/keys/:id/stats?days=30
Authorization: Bearer <api_key>
```

#### Deactivate API Key
```http
PATCH /api/v1/keys/:id/deactivate
Authorization: Bearer <api_key>
```

#### Delete API Key
```http
DELETE /api/v1/keys/:id
Authorization: Bearer <api_key>
```

#### Get User Profile
```http
GET /api/v1/keys/profile/me
Authorization: Bearer <api_key>
```

### Package Management (Updated with Auth)

#### Create Package (requires write permission)
```http
POST /api/v1/packages
Authorization: Bearer <api_key_with_write_permission>
Content-Type: application/json

{
  "name": "my-mcp-package",
  "version": "1.0.0",
  "description": "My MCP package",
  "tags": ["ai", "automation"]
}
```

#### Search Packages (optional auth for analytics)
```http
GET /api/v1/packages/search?q=ai&tags=automation
# Authorization header optional
```

#### Get Package (optional auth for analytics)
```http
GET /api/v1/packages/my-mcp-package
# Authorization header optional
```

#### List All Packages (requires admin permission)
```http
GET /api/v1/packages
Authorization: Bearer <api_key_with_admin_permission>
```

## Permissions

### Permission Levels

- **read**: Can search and retrieve packages
- **write**: Can create and update packages
- **admin**: Full access including listing all packages

### Permission Hierarchy

- `admin` permission includes all other permissions
- `write` permission includes `read` permission
- `read` permission is the minimum required for basic access

## Security Features

### API Key Security

- **Cryptographic Hashing**: API keys are hashed using HMAC-SHA256
- **Secure Generation**: Uses Node.js crypto.randomBytes for key generation
- **Prefix Display**: Only first 8 characters are shown in listings
- **One-Time Display**: Full API key only shown once during creation

### Rate Limiting

- Default: 100 requests per minute per API key
- Configurable per endpoint
- Automatic tracking of request counts

### Usage Monitoring

- **Request Logging**: All API requests are logged with metadata
- **Response Times**: Track performance metrics
- **IP Tracking**: Monitor usage patterns
- **User Agent Logging**: Track client applications

## CLI Management Tool

The registry includes a comprehensive CLI tool for managing API keys:

```bash
npm run manage-keys
```

### CLI Features

- Create users and API keys
- List existing API keys
- View usage statistics
- Interactive prompts for easy management

## Integration with SDK

The API key system integrates seamlessly with the Sigyl SDK:

```typescript
import { connect } from '@sigyl/sdk';

// Connect with API key
const sdk = connect({
  apiKey: 'sk_your_api_key_here',
  requireAuth: true
});

// Create a package (requires write permission)
const package = await sdk.registerMCP({
  name: 'my-package',
  version: '1.0.0',
  description: 'My MCP package'
});
```

## Environment Variables

Add these to your `.env` file:

```env
# API Key Management
API_KEY_SECRET=sigyl-api-secret  # Change this in production
ENABLE_API_KEYS=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

## Best Practices

### API Key Management

1. **Store Securely**: Never commit API keys to version control
2. **Rotate Regularly**: Create new keys and delete old ones periodically
3. **Use Least Privilege**: Only grant necessary permissions
4. **Monitor Usage**: Regularly check usage statistics
5. **Set Expiration**: Use expiration dates for temporary access

### Security

1. **HTTPS Only**: Always use HTTPS in production
2. **Environment Variables**: Store API keys in environment variables
3. **Key Rotation**: Implement regular key rotation procedures
4. **Access Monitoring**: Monitor for unusual usage patterns
5. **Immediate Revocation**: Deactivate compromised keys immediately

## Error Handling

### Common Error Responses

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "API key required",
  "message": "Please provide an API key in the Authorization header"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "error": "Insufficient permissions",
  "message": "This endpoint requires the following permissions: write"
}
```

#### 429 Too Many Requests
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "Too many requests. Limit: 100 requests per 60 seconds"
}
```

## Monitoring and Analytics

### Usage Statistics

Each API key tracks:
- Total requests
- Successful vs failed requests
- Average response time
- Last usage timestamp
- IP address patterns
- User agent information

### Dashboard Integration

The usage data can be integrated with monitoring dashboards to track:
- API usage trends
- Performance metrics
- Error rates
- User activity patterns

## Migration Guide

### From No Auth to API Keys

1. Run the migration: `npm run migrate:api-keys`
2. Create initial admin user and API key
3. Update client applications to include API keys
4. Gradually enforce authentication on endpoints
5. Monitor usage and adjust rate limits as needed

### Backward Compatibility

- Public endpoints (search, get package) work without authentication
- Authentication is optional for read operations
- Write operations require authentication
- Admin operations require admin permissions

## Troubleshooting

### Common Issues

1. **Invalid API Key**: Check key format and ensure it starts with `sk_`
2. **Expired Key**: Create a new API key if the current one has expired
3. **Insufficient Permissions**: Request appropriate permissions from admin
4. **Rate Limited**: Wait for rate limit window to reset or request higher limits

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
DEBUG_API_KEYS=true
```

This will log detailed authentication and usage information. 