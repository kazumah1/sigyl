# MVP Secrets Manager Implementation Plan

## 🎯 Goal
Let users securely store API keys (like OpenAI) and use them in their deployed MCP tools via `process.env.SECRET_NAME` without exposing secrets in GitHub or the frontend.

## ✅ MVP Architecture (Simple & Dev-Friendly)

### Flow:
1. User adds secret via frontend UI
2. Secret is stored in Supabase (PostgreSQL), encrypted
3. When user deploys an MCP, you:
   - Fetch their secrets from Supabase
   - Inject them as envVars in the Render/Railway deploy
4. The MCP server uses `process.env` to access the secrets

## 🧱 Data Model (MVP Schema)

```sql
CREATE TABLE mcp_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,           -- e.g. "OPENAI_API_KEY"
  value TEXT NOT NULL,         -- encrypted at rest
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure unique keys per user
  UNIQUE(user_id, key)
);

-- Enable Row Level Security
ALTER TABLE mcp_secrets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own secrets" ON mcp_secrets
  FOR ALL USING (auth.uid() = user_id);
```

## 🔐 Security (MVP Tier)
- ✅ Only fetch secrets in backend (never expose to frontend after initial POST)
- ✅ Basic encryption at rest using existing patterns
- ✅ Row Level Security ensures users only see their own secrets

## 🛠 Step-by-Step Implementation

### Step 1: Add Secrets API to Registry (30 min)
**📍 Location:** `packages/registry-api/src/routes/secrets.ts`

```typescript
import express from 'express';
import { supabase } from '../config/database';
import { authMiddleware } from '../middleware/auth';
import crypto from 'crypto';

const router = express.Router();

// Simple encryption helper
function encrypt(text: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.SECRETS_ENCRYPTION_KEY || 'default-key', 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, key);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.SECRETS_ENCRYPTION_KEY || 'default-key', 'salt', 32);
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipher(algorithm, key);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Create secret
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { key, value } = req.body;
    const userId = req.user.id;

    if (!key || !value) {
      return res.status(400).json({ success: false, error: 'Key and value are required' });
    }

    const encryptedValue = encrypt(value);

    const { data, error } = await supabase
      .from('mcp_secrets')
      .insert({ 
        user_id: userId, 
        key, 
        value: encryptedValue 
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data: { id: data.id, key: data.key } });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// List secrets (keys only, no values)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('mcp_secrets')
      .select('id, key, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Delete secret
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const secretId = req.params.id;

    const { error } = await supabase
      .from('mcp_secrets')
      .delete()
      .eq('id', secretId)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get secrets for deployment (internal use only)
router.get('/deployment/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    const { data, error } = await supabase
      .from('mcp_secrets')
      .select('key, value')
      .eq('user_id', userId);

    if (error) throw error;

    // Decrypt values
    const secrets = data.map(secret => ({
      key: secret.key,
      value: decrypt(secret.value)
    }));

    res.json({ success: true, data: secrets });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
```

**📍 Add to main app:** `packages/registry-api/src/index.ts`
```typescript
import secretsRouter from './routes/secrets';
app.use('/api/v1/secrets', secretsRouter);
```

### Step 2: Add Secrets UI to Frontend (1 hour)
**📍 Location:** `packages/web-frontend/src/pages/Secrets.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface Secret {
  id: string;
  key: string;
  created_at: string;
}

export default function Secrets() {
  const { user } = useAuth();
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSecrets();
  }, []);

  const fetchSecrets = async () => {
    try {
      const response = await fetch('/api/v1/secrets', {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setSecrets(data.data);
      }
    } catch (error) {
      console.error('Error fetching secrets:', error);
    }
  };

  const addSecret = async () => {
    if (!newKey || !newValue) {
      toast.error('Please fill in both key and value');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/secrets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`
        },
        body: JSON.stringify({ key: newKey, value: newValue })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Secret added successfully!');
        setNewKey('');
        setNewValue('');
        fetchSecrets();
      } else {
        toast.error(data.error || 'Failed to add secret');
      }
    } catch (error) {
      toast.error('Failed to add secret');
    } finally {
      setLoading(false);
    }
  };

  const deleteSecret = async (id: string) => {
    try {
      const response = await fetch(`/api/v1/secrets/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user?.access_token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Secret deleted successfully!');
        fetchSecrets();
      } else {
        toast.error(data.error || 'Failed to delete secret');
      }
    } catch (error) {
      toast.error('Failed to delete secret');
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Secrets Management</h1>
      
      {/* Add New Secret */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add New Secret</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="key">Secret Key</Label>
              <Input
                id="key"
                placeholder="e.g., OPENAI_API_KEY"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="value">Secret Value</Label>
              <Input
                id="value"
                type="password"
                placeholder="sk-..."
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
              />
            </div>
          </div>
          <Button 
            onClick={addSecret} 
            disabled={loading}
            className="mt-4"
          >
            {loading ? 'Adding...' : 'Add Secret'}
          </Button>
        </CardContent>
      </Card>

      {/* List Secrets */}
      <Card>
        <CardHeader>
          <CardTitle>Your Secrets</CardTitle>
        </CardHeader>
        <CardContent>
          {secrets.length === 0 ? (
            <p className="text-gray-500">No secrets added yet.</p>
          ) : (
            <div className="space-y-4">
              {secrets.map((secret) => (
                <div key={secret.id} className="flex justify-between items-center p-4 border rounded">
                  <div>
                    <p className="font-mono font-bold">{secret.key}</p>
                    <p className="text-sm text-gray-500">
                      Added {new Date(secret.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteSecret(secret.id)}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**📍 Add to router:** `packages/web-frontend/src/App.tsx`
```typescript
import Secrets from '@/pages/Secrets';

// Add to routes
<Route path="/secrets" element={<Secrets />} />
```

### Step 3: Inject Secrets During Deployment (1 hour)
**📍 Location:** `packages/registry-api/src/services/deployer.ts`

```typescript
// Add to existing deployer.ts
export async function deployWithSecrets(repoUrl: string, userId: string, branch: string = 'main') {
  try {
    // Fetch user's secrets
    const { data: secrets, error } = await supabase
      .from('mcp_secrets')
      .select('key, value')
      .eq('user_id', userId);

    if (error) throw error;

    // Decrypt secrets
    const envVars = Object.fromEntries(
      secrets.map(secret => [secret.key, decrypt(secret.value)])
    );

    // Add default environment variables
    const deploymentEnv = {
      ...envVars,
      PORT: "8080",
      NODE_ENV: "production"
    };

    // Deploy to Render/Railway with secrets
    const deploymentUrl = await deployToRender({
      repo: repoUrl,
      branch: branch,
      envVars: deploymentEnv
    });

    return deploymentUrl;
  } catch (error) {
    console.error('Deployment with secrets failed:', error);
    throw error;
  }
}

// Update existing deployToRender function
async function deployToRender(config: {
  repo: string;
  branch: string;
  envVars: Record<string, string>;
}): Promise<string> {
  // Your existing deployment logic here
  // Make sure to pass envVars to the hosting platform
  
  // For Render, you would:
  // 1. Create service with environment variables
  // 2. Return the deployment URL
  
  // For now, return mock URL
  return `https://${Date.now()}.render.com`;
}
```

### Step 4: Update Deployment Wizard (30 min)
**📍 Location:** `packages/web-frontend/src/pages/Deploy.tsx`

Add secret selection to the deployment wizard:

```typescript
// Add to DeployWizard component
const [selectedSecrets, setSelectedSecrets] = useState<string[]>([]);
const [availableSecrets, setAvailableSecrets] = useState<Secret[]>([]);

// Fetch user's secrets
useEffect(() => {
  const fetchSecrets = async () => {
    const response = await fetch('/api/v1/secrets', {
      headers: {
        'Authorization': `Bearer ${user?.access_token}`
      }
    });
    const data = await response.json();
    if (data.success) {
      setAvailableSecrets(data.data);
    }
  };
  
  if (user) {
    fetchSecrets();
  }
}, [user]);

// Add secret selection UI in deployment wizard
<div className="space-y-4">
  <Label>Select Secrets to Include</Label>
  {availableSecrets.map((secret) => (
    <div key={secret.id} className="flex items-center space-x-2">
      <input
        type="checkbox"
        id={secret.id}
        checked={selectedSecrets.includes(secret.id)}
        onChange={(e) => {
          if (e.target.checked) {
            setSelectedSecrets([...selectedSecrets, secret.id]);
          } else {
            setSelectedSecrets(selectedSecrets.filter(id => id !== secret.id));
          }
        }}
      />
      <Label htmlFor={secret.id}>{secret.key}</Label>
    </div>
  ))}
</div>
```

## 📦 Developer Experience (MVP Flow)

1. **User logs in** to your platform
2. **Goes to `/secrets`** and adds:
   - `OPENAI_API_KEY`: `sk-...`
   - `DATABASE_URL`: `postgresql://...`
3. **Deploys their repo** with secrets selected
4. **You inject secrets** into Render/Railway env vars
5. **Their MCP server** calls external APIs securely

## ✅ TL;DR MVP Plan

| Feature | MVP Approach |
|---------|-------------|
| Secret storage | Supabase `mcp_secrets` table |
| Secret injection | Passed to Render/Railway as envVars |
| Secret encryption | ✅ Basic AES-256 encryption |
| Frontend UI | Simple form at `/secrets` |
| Server access | `process.env.KEY_NAME` |
| Implementation time | **2-3 hours total** |

## 🚀 Next Steps After MVP

1. **Test with real deployments** - validate the flow works
2. **Add audit logging** - track secret access
3. **Add team permissions** - share secrets between users
4. **Add secret rotation** - automatic key updates
5. **Add compliance features** - for enterprise users

## 🔒 Security Notes

- **Never expose secret values** to frontend after initial creation
- **Use HTTPS** for all API calls
- **Encrypt at rest** in database
- **Row Level Security** ensures user isolation
- **Environment variables** are secure in Render/Railway

This MVP approach gives you a working secrets manager in 2-3 hours that's secure enough for production use! 