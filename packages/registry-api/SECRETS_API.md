# Secrets API Documentation

The Secrets API provides secure storage and management of API keys and other sensitive configuration for MCP servers.

## 🔐 Security Features

- **AES-256 Encryption**: All secrets are encrypted at rest
- **Row Level Security**: Users can only access their own secrets
- **No Plaintext Exposure**: Secret values are never returned to the frontend
- **Environment Variable Validation**: Keys must be valid environment variable names

## 📋 API Endpoints

### Authentication

All endpoints require authentication via API key in the Authorization header:

```
Authorization: Bearer sk_your_api_key_here
```

### Create Secret

**POST** `/api/v1/secrets`

Create a new secret for the authenticated user.

**Request Body:**
```json
{
  "key": "OPENAI_API_KEY",
  "value": "sk-..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "key": "OPENAI_API_KEY",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "message": "Secret created successfully"
}
```

**Validation Rules:**
- `key` must be a valid environment variable name (uppercase letters, numbers, underscores only)
- `key` must be unique per user
- Both `key` and `value` are required

### List Secrets

**GET** `/api/v1/secrets`

List all secrets for the authenticated user (keys only, no values).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "key": "OPENAI_API_KEY",
      "created_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": "uuid",
      "key": "DATABASE_URL",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "message": "Secrets retrieved successfully"
}
```

### Get Secret

**GET** `/api/v1/secrets/:id`

Get a specific secret by ID (key only, no value).

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "key": "OPENAI_API_KEY",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "message": "Secret retrieved successfully"
}
```

### Update Secret

**PUT** `/api/v1/secrets/:id`

Update an existing secret.

**Request Body:**
```json
{
  "key": "OPENAI_API_KEY",
  "value": "sk-new-key..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "key": "OPENAI_API_KEY",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "message": "Secret updated successfully"
}
```

### Delete Secret

**DELETE** `/api/v1/secrets/:id`

Delete a secret.

**Response:**
```json
{
  "success": true,
  "message": "Secret deleted successfully"
}
```

### Get Secrets for Deployment

**GET** `/api/v1/secrets/deployment/:userId`

**Internal endpoint** - used by the deployment service to fetch decrypted secrets for a user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "key": "OPENAI_API_KEY",
      "value": "sk-..."
    },
    {
      "key": "DATABASE_URL",
      "value": "postgresql://..."
    }
  ],
  "message": "Secrets retrieved for deployment"
}
```

## 🗄️ Database Schema

```sql
CREATE TABLE mcp_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,           -- e.g. "OPENAI_API_KEY"
  value TEXT NOT NULL,         -- encrypted at rest
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique keys per user
  UNIQUE(user_id, key)
);
```

## 🔧 Setup Instructions

### 1. Run Database Migration

Execute the migration in your Supabase project:

```sql
-- Run the contents of migrations/mcp_secrets_table.sql
```

### 2. Set Environment Variable

Add to your `.env` file:

```env
SECRETS_ENCRYPTION_KEY=your-secure-encryption-key-here
```

**Important:** Use a strong, random encryption key in production.

### 3. Test the API

```bash
# Test the secrets functionality
npm run test:secrets

# Start the development server
npm run dev
```

### 4. Test with curl

```bash
# Create a secret (requires API key)
curl -X POST http://localhost:3000/api/v1/secrets \
  -H "Authorization: Bearer sk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"key": "TEST_KEY", "value": "test-value"}'

# List secrets
curl -X GET http://localhost:3000/api/v1/secrets \
  -H "Authorization: Bearer sk_your_api_key"
```

## 🚀 Integration with Deployment

The secrets API integrates with the deployment service to automatically inject secrets as environment variables:

1. User creates secrets via the API
2. During deployment, the deployment service calls `/api/v1/secrets/deployment/:userId`
3. Secrets are decrypted and passed to the hosting platform as environment variables
4. MCP server accesses secrets via `process.env.SECRET_NAME`

## 🔒 Security Best Practices

1. **Strong Encryption Key**: Use a cryptographically secure random key
2. **HTTPS Only**: Always use HTTPS in production
3. **Key Rotation**: Regularly rotate the encryption key
4. **Access Monitoring**: Monitor secret access patterns
5. **Least Privilege**: Only grant necessary API key permissions

## 🧪 Testing

Run the test script to verify everything is working:

```bash
npm run test:secrets
```

This will test:
- Database table existence
- Encryption/decryption functionality
- Database operations (if test users exist)

## 📝 Error Codes

| Code | Description |
|------|-------------|
| 400 | Validation error (invalid key format, missing fields) |
| 401 | Authentication required |
| 403 | Insufficient permissions |
| 404 | Secret not found |
| 409 | Duplicate key (key already exists for user) |
| 500 | Internal server error |

## 🔄 Next Steps

1. **Frontend Integration**: Add secrets management UI
2. **Deployment Integration**: Modify deployment service to use secrets
3. **Audit Logging**: Add access logging for compliance
4. **Team Permissions**: Add secret sharing between users 