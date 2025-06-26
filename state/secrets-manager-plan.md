# Sigyl Secrets Manager Implementation Plan

## 🎯 Overview
Implement a secure, centralized secrets management system for MCP servers that require API keys and other sensitive configuration.

## 🔐 Problem Statement
MCP servers commonly require API keys for:
- OpenAI API (`OPENAI_API_KEY`)
- Anthropic API (`ANTHROPIC_API_KEY`) 
- Database connections (`DATABASE_URL`)
- JWT secrets (`JWT_SECRET`)
- Custom service credentials
- Third-party integrations

Currently, these are handled via environment variables during deployment, but this approach lacks:
- Centralized management
- Security audit trails
- Access control
- Encryption at rest
- Rotation capabilities

## 🏗️ Architecture

### Service Structure
```
packages/
├── secrets-manager/           # NEW: Dedicated secrets service
│   ├── src/
│   │   ├── services/
│   │   │   ├── encryption.ts  # AES-256 encryption utilities
│   │   │   ├── secrets.ts     # Core secrets management
│   │   │   └── audit.ts       # Access logging
│   │   ├── routes/
│   │   │   └── secrets.ts     # API endpoints
│   │   ├── middleware/
│   │   │   └── auth.ts        # Secret access authorization
│   │   └── types/
│   │       └── secrets.ts     # TypeScript definitions
│   ├── package.json
│   └── README.md
```

### Database Schema
```sql
-- Encrypted secrets storage
CREATE TABLE secrets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  encryption_key_id TEXT NOT NULL,
  secret_type TEXT NOT NULL CHECK (secret_type IN ('api_key', 'database_url', 'jwt_secret', 'custom')),
  description TEXT,
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique names per user
  UNIQUE(user_id, name)
);

-- Secret access logs for audit trail
CREATE TABLE secret_access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  secret_id UUID REFERENCES secrets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'accessed', 'updated', 'deleted', 'rotated')),
  deployment_id UUID REFERENCES deployments(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Secret permissions for team access
CREATE TABLE secret_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  secret_id UUID REFERENCES secrets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  permission TEXT NOT NULL CHECK (permission IN ('read', 'write', 'admin')),
  granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(secret_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE secret_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE secret_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own secrets" ON secrets
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view shared secrets" ON secrets
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM secret_permissions sp 
      WHERE sp.secret_id = secrets.id 
      AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own access logs" ON secret_access_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own permissions" ON secret_permissions
  FOR SELECT USING (auth.uid() = user_id);
```

## 🚀 Implementation Phases

### Phase 1: Core Secrets Service (Hours 2-3)

#### 1.1 Create Secrets Manager Package
```bash
mkdir packages/secrets-manager
cd packages/secrets-manager
npm init -y
npm install express @supabase/supabase-js crypto-js zod cors helmet
npm install -D typescript @types/express @types/crypto-js @types/cors
```

#### 1.2 Encryption Service
```typescript
// packages/secrets-manager/src/services/encryption.ts
import crypto from 'crypto';

export class EncryptionService {
  private static algorithm = 'aes-256-gcm';
  private static keyLength = 32;
  private static ivLength = 16;
  private static saltLength = 64;
  private static tagLength = 16;

  static encrypt(text: string, masterKey: string): { encrypted: string; keyId: string } {
    const salt = crypto.randomBytes(this.saltLength);
    const iv = crypto.randomBytes(this.ivLength);
    
    // Derive key from master key and salt
    const key = crypto.pbkdf2Sync(masterKey, salt, 100000, this.keyLength, 'sha256');
    
    // Encrypt
    const cipher = crypto.createCipher(this.algorithm, key);
    cipher.setAAD(salt);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine all components
    const combined = Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')]);
    
    return {
      encrypted: combined.toString('base64'),
      keyId: salt.toString('hex').substring(0, 16)
    };
  }

  static decrypt(encryptedData: string, masterKey: string): string {
    const combined = Buffer.from(encryptedData, 'base64');
    
    const salt = combined.subarray(0, this.saltLength);
    const iv = combined.subarray(this.saltLength, this.saltLength + this.ivLength);
    const tag = combined.subarray(this.saltLength + this.ivLength, this.saltLength + this.ivLength + this.tagLength);
    const encrypted = combined.subarray(this.saltLength + this.ivLength + this.tagLength);
    
    // Derive key
    const key = crypto.pbkdf2Sync(masterKey, salt, 100000, this.keyLength, 'sha256');
    
    // Decrypt
    const decipher = crypto.createDecipher(this.algorithm, key);
    decipher.setAAD(salt);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

#### 1.3 Secrets Service
```typescript
// packages/secrets-manager/src/services/secrets.ts
import { supabase } from '../config/database';
import { EncryptionService } from './encryption';
import { AuditService } from './audit';

export interface CreateSecretRequest {
  name: string;
  value: string;
  secretType: 'api_key' | 'database_url' | 'jwt_secret' | 'custom';
  description?: string;
  tags?: string[];
  expiresAt?: Date;
}

export interface Secret {
  id: string;
  name: string;
  secretType: string;
  description?: string;
  tags?: string[];
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class SecretsService {
  private static masterKey = process.env.SECRETS_MASTER_KEY;
  
  static async createSecret(userId: string, request: CreateSecretRequest): Promise<Secret> {
    if (!this.masterKey) {
      throw new Error('SECRETS_MASTER_KEY not configured');
    }

    const { encrypted, keyId } = EncryptionService.encrypt(request.value, this.masterKey);
    
    const { data, error } = await supabase
      .from('secrets')
      .insert({
        user_id: userId,
        name: request.name,
        encrypted_value: encrypted,
        encryption_key_id: keyId,
        secret_type: request.secretType,
        description: request.description,
        tags: request.tags,
        expires_at: request.expiresAt
      })
      .select()
      .single();

    if (error) throw error;

    // Log creation
    await AuditService.logAction(data.id, userId, 'created');

    return this.mapToSecret(data);
  }

  static async getSecret(userId: string, secretId: string): Promise<{ secret: Secret; value: string }> {
    const { data, error } = await supabase
      .from('secrets')
      .select('*')
      .eq('id', secretId)
      .eq('is_active', true)
      .single();

    if (error) throw error;

    // Check permissions
    const hasAccess = await this.checkAccess(userId, secretId);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    // Decrypt value
    const value = EncryptionService.decrypt(data.encrypted_value, this.masterKey!);

    // Log access
    await AuditService.logAction(secretId, userId, 'accessed');

    return {
      secret: this.mapToSecret(data),
      value
    };
  }

  static async listSecrets(userId: string): Promise<Secret[]> {
    const { data, error } = await supabase
      .from('secrets')
      .select('*')
      .or(`user_id.eq.${userId},id.in.(${await this.getSharedSecretIds(userId)})`)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(this.mapToSecret);
  }

  private static async checkAccess(userId: string, secretId: string): Promise<boolean> {
    // Check if user owns the secret
    const { data: owned } = await supabase
      .from('secrets')
      .select('id')
      .eq('id', secretId)
      .eq('user_id', userId)
      .single();

    if (owned) return true;

    // Check if user has permission
    const { data: permission } = await supabase
      .from('secret_permissions')
      .select('permission')
      .eq('secret_id', secretId)
      .eq('user_id', userId)
      .single();

    return !!permission;
  }

  private static async getSharedSecretIds(userId: string): Promise<string[]> {
    const { data } = await supabase
      .from('secret_permissions')
      .select('secret_id')
      .eq('user_id', userId);

    return data?.map(p => p.secret_id) || [];
  }

  private static mapToSecret(data: any): Secret {
    return {
      id: data.id,
      name: data.name,
      secretType: data.secret_type,
      description: data.description,
      tags: data.tags,
      isActive: data.is_active,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}
```

#### 1.4 API Routes
```typescript
// packages/secrets-manager/src/routes/secrets.ts
import express from 'express';
import { SecretsService } from '../services/secrets';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// Create secret
router.post('/', authMiddleware, async (req, res) => {
  try {
    const secret = await SecretsService.createSecret(req.user.id, req.body);
    res.json({ success: true, data: secret });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// List secrets
router.get('/', authMiddleware, async (req, res) => {
  try {
    const secrets = await SecretsService.listSecrets(req.user.id);
    res.json({ success: true, data: secrets });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get secret value
router.get('/:id/value', authMiddleware, async (req, res) => {
  try {
    const { secret, value } = await SecretsService.getSecret(req.user.id, req.params.id);
    res.json({ success: true, data: { secret, value } });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
```

### Phase 2: Frontend Integration (Hours 2-3)

#### 2.1 Secrets Management UI
- Add secrets management page to web frontend
- Create secret creation/editing forms
- Implement secret selection during deployment
- Add audit log viewer

#### 2.2 Deployment Integration
- Modify deployment wizard to include secret selection
- Add secret validation before deployment
- Implement secure secret transmission

### Phase 3: Deployment Integration (Hours 1-2)

#### 3.1 Container Builder Updates
- Modify Dockerfile generation to handle secret environment variables
- Add secret injection during container build
- Implement secure secret transmission to hosting platforms

#### 3.2 Registry API Integration
- Add secret validation endpoints
- Implement secret access during deployment
- Add deployment-specific secret permissions

## 🔒 Security Features

### Encryption
- **AES-256-GCM**: Military-grade encryption for all secrets
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Unique IVs**: Each encryption uses a unique initialization vector
- **Authentication**: GCM mode provides authenticity guarantees

### Access Control
- **User Ownership**: Users can only access their own secrets
- **Permission System**: Fine-grained permissions for team access
- **Row Level Security**: Database-level access control
- **Audit Trail**: Complete logging of all secret access

### Operational Security
- **No Plaintext Storage**: Secrets never stored in plaintext
- **Secure Transmission**: HTTPS-only for all API calls
- **Key Rotation**: Support for encryption key rotation
- **Automatic Cleanup**: Expired secrets automatically deactivated

## 🧪 Testing Strategy

### Unit Tests
- Encryption/decryption functionality
- Secret CRUD operations
- Permission checking
- Audit logging

### Integration Tests
- End-to-end secret creation and retrieval
- Deployment with secrets
- Permission system
- Audit trail verification

### Security Tests
- Encryption strength validation
- Access control verification
- SQL injection prevention
- XSS protection

## 📋 Implementation Checklist

### Phase 1: Core Service
- [ ] Create secrets-manager package structure
- [ ] Implement encryption service
- [ ] Create secrets service with CRUD operations
- [ ] Add database schema and migrations
- [ ] Implement API routes
- [ ] Add authentication middleware
- [ ] Create audit logging service

### Phase 2: Frontend Integration
- [ ] Add secrets management page
- [ ] Create secret creation/editing forms
- [ ] Implement secret selection in deployment wizard
- [ ] Add audit log viewer
- [ ] Integrate with existing authentication

### Phase 3: Deployment Integration
- [ ] Update container builder for secret injection
- [ ] Modify deployment service to handle secrets
- [ ] Add secret validation during deployment
- [ ] Implement secure transmission to hosting platforms
- [ ] Add deployment-specific permissions

### Security & Testing
- [ ] Implement comprehensive unit tests
- [ ] Add integration tests
- [ ] Perform security audit
- [ ] Document security best practices
- [ ] Create user documentation

## 🎯 Success Metrics

### Security
- Zero plaintext secret storage
- Complete audit trail for all access
- Proper access control enforcement
- Encryption key rotation capability

### Usability
- Easy secret creation and management
- Seamless integration with deployment
- Clear audit logs and monitoring
- Intuitive permission management

### Performance
- Sub-second secret retrieval
- Minimal deployment overhead
- Efficient encryption/decryption
- Scalable permission system

## 🚀 Next Steps

1. **Start with Phase 1**: Implement core secrets service
2. **Add database migrations**: Set up schema in Supabase
3. **Create basic UI**: Simple secrets management interface
4. **Integrate with deployment**: Connect to existing deployment pipeline
5. **Add comprehensive testing**: Ensure security and reliability
6. **Document and deploy**: Create user documentation and deploy to production

This secrets manager will provide a secure, scalable solution for managing API keys and other sensitive configuration for MCP servers, addressing the critical security requirements you've identified. 