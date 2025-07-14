const express = require("express");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { isInitializeRequest } = require("@modelcontextprotocol/sdk/types.js");
const fetch = require("node-fetch");
const { z } = require("zod");
const { randomUUID } = require("crypto");
const { Redis } = require('@upstash/redis');
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

async function getSession(sessionId) {
  const data = await redis.get(`mcp:session:${sessionId}`);
  return data ? JSON.parse(data) : null;
}

async function setSession(sessionId, sessionData) {
  await redis.set(`mcp:session:${sessionId}`, JSON.stringify(sessionData), { ex: 3600 }); // 1 hour expiry
}

async function deleteSession(sessionId) {
  await redis.del(`mcp:session:${sessionId}`);
}

// 1. create the /mcp endpoint
(async () => {
    console.log('[WRAPPER] Starting wrapper...');
    const createStatelessServer = (await import("./server.js")).default;

    const app = express();
    app.use(express.json())

    // API key validation function
    async function isValidSigylApiKey(key) {
        if (!key) return false;
        try {
          const resp = await fetch('https://api.sigyl.dev/api/v1/keys/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: key })
          });
          if (!resp.ok) return { valid: false, isMaster: false };
          const data = await resp.json();
          return { valid: data && data.valid === true, isMaster: data && data.isMaster === true };
        } catch (err) {
          console.error('API key validation error:', err);
          return { valid: false, isMaster: false };
        }
      }

    async function getPackageName(req) {
        if (req.hostname.includes('sigyl-mcp-')) {
            const hostname = req.hostname;
            console.log('[PACKAGENAME] Getting package name from sigyl-mcp-...');
            const match = hostname.match(/sigyl-mcp-(.+?)(?:-lrzo3avokq-uc\.a\.run\.app|\.a\.run\.app)/);
            if (match) {
                const packagePath = match[1];
                
                // Convert to proper format: sigyl-dev/brave-search
                if (packagePath.includes("-")) {
                // Split by hyphens and reconstruct
                const parts = packagePath.split("-");
                if (parts.length >= 3 && parts[0] === "sigyl" && parts[1] === "dev") {
                    // Format: sigyl-dev-brave-search -> sigyl-dev/brave-search
                    const orgPart = `${parts[0]}-${parts[1]}`; // sigyl-dev
                    const packagePart = parts.slice(2).map(part => 
                    part.charAt(0).toLowerCase() + part.slice(1)
                    ).join("-"); // brave-search
                    const formattedName = `${orgPart}/${packagePart}`;
                    return formattedName;
                }
                }
            }
        } else {
            console.log('[PACKAGENAME] Error: Not a sigyl-mcp-... hostname');
            return null;
        }
    }
    
    async function getConfig(packageName) {
        let slug = packageName;

        const registryUrl = process.env.SIGYL_REGISTRY_URL || 'https://api.sigyl.dev';
        const url = `${registryUrl}/api/v1/packages/${encodeURIComponent(slug)}`;
        console.log('[CONFIG] Fetching package config from:', url);

        try {
            const resp = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!resp.ok) {
                console.error('[CONFIG] Failed to fetch config:', resp.status, resp.statusText);
                return {};
            }
            const data = await resp.json();
            if (data.success && data.data) {
                return {
                    required_secrets: data.data.required_secrets || [],
                    optional_secrets: data.data.optional_secrets || []
                };
            }
            return {};
        } catch (err) {
            console.error('[CONFIG] Error fetching config:', err);
            return {};
        }
    }

    async function getUserSecrets(packageName, apiKey) {
        if (!apiKey) {
            console.warn('[SECRETS] No API key provided to getUserSecrets');
            return {};
        }
        if (!packageName) {
            console.warn('[SECRETS] No packageName provided to getUserSecrets');
            return {};
        }

        const registryUrl = process.env.SIGYL_REGISTRY_URL || 'https://api.sigyl.dev';
        // Only use the slug part for the endpoint
        let slug = packageName;

        const url = `${registryUrl}/api/v1/secrets/package/${encodeURIComponent(slug)}`;
        console.log('[SECRETS] Fetching user secrets from:', url);

        try {
            const resp = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!resp.ok) {
                console.error('[SECRETS] Failed to fetch user secrets:', resp.status, resp.statusText);
                return {};
            }
            const data = await resp.json();
            if (data.success && Array.isArray(data.data)) {
                // Convert array to key-value object
                const secrets = {};
                data.data.forEach(secret => {
                    if (secret.key && secret.value) {
                        secrets[secret.key] = secret.value;
                    }
                });
                return secrets;
            }
            return {};
        } catch (err) {
            console.error('[SECRETS] Error fetching user secrets:', err);
            return {};
        }
    }
    async function createConfig(configJSON, userSecrets) {
        // Accepts configJSON with required_secrets and optional_secrets arrays
        try {
        if (!configJSON || (typeof configJSON !== "object") || (!Array.isArray(configJSON.required_secrets) && !Array.isArray(configJSON.optional_secrets))) {
            throw new Error("configJSON must have required_secrets and/or optional_secrets arrays");
        }

        const zodShape = {};
        const configValues = {};

        // Helper to convert a field to zod type
        function fieldToZod(field, isRequired) {
            let zodType;
            switch (field.type) {
                case "string":
                    if (field.enum) {
                        zodType = z.enum(field.enum);
                    } else {
                        zodType = z.string();
                    }
                    break;
                case "boolean":
                    zodType = z.boolean();
                    break;
                case "number":
                case "integer":
                    zodType = z.number();
                    break;
                default:
                    zodType = z.any();
            }
            if (field.description) {
                zodType = zodType.describe(field.description);
            }
            if (field.default !== undefined) {
                zodType = zodType.default(field.default);
            }
            if (!isRequired) {
                zodType = zodType.optional();
            }
            return zodType;
        }

        // Add required fields
        if (Array.isArray(configJSON.required_secrets)) {
            for (const field of configJSON.required_secrets) {
                zodShape[field.name] = fieldToZod(field, true);
                // Fill config value
                if (userSecrets && userSecrets[field.name] !== undefined) {
                    configValues[field.name] = userSecrets[field.name];
                } else if (field.default !== undefined) {
                    configValues[field.name] = field.default;
                }
            }
        }
        // Add optional fields
        if (Array.isArray(configJSON.optional_secrets)) {
            for (const field of configJSON.optional_secrets) {
                zodShape[field.name] = fieldToZod(field, false);
                // Fill config value
                if (userSecrets && userSecrets[field.name] !== undefined) {
                    configValues[field.name] = userSecrets[field.name];
                } else if (field.default !== undefined) {
                    configValues[field.name] = field.default;
                }
            }
        }

            const configSchema = z.object(zodShape);
            const filledConfig = configSchema.parse(configValues);
            return { configSchema, filledConfig };
        } catch (err) {
            console.error('[CONFIG] Error creating config:', err);
            return { configSchema: null, filledConfig: {} };
        }
    }

    app.post('/mcp', async (req, res) => {
        const sessionId = req.headers['mcp-session-id'];
        if (sessionId) {
            console.log(`[MCP] Incoming call with session ID: ${sessionId}`);
        } else {
            console.log(`[MCP] Incoming call with NO session ID (likely initialize)`);
        }
        // -- accepts api key
        const apiKey = req.headers['x-sigyl-api-key'] || req.query.apiKey;
        console.log('[MCP] Received /mcp POST');

        // -- validate api key
        let sessionData = sessionId ? await getSession(sessionId) : null;
        let valid, isMaster, packageName, configJSON, userSecrets, filledConfig;
        if (sessionData) {
            // Use cached session data
            ({ apiKey, valid, isMaster, filledConfig } = sessionData);
        } else {
            // Validate API key
            ({ valid, isMaster } = await isValidSigylApiKey(apiKey));
        }
        if (!valid) {
            console.warn('[MCP] 401 Unauthorized: Invalid or missing API key');
            return res.status(401).json({ error: 'Invalid or missing Sigyl API Key' });
        }
        // -- get package name
        if (!sessionData && !isMaster) {
            console.log('[PACKAGENAME] Getting package name...');
            packageName = await getPackageName(req);
            console.log('[PACKAGENAME] Package name:', packageName);
        }
        // 2. use package name to get required + optional secrets
        if (!sessionData && !isMaster) {
            console.log('[CONFIG] Getting config...');
            configJSON = await getConfig(packageName);
            console.log('[CONFIG] config:', configJSON);
        }
        // 3. use package name + api key to get user's secrets
        if (!sessionData && !isMaster) {
            console.log('[SECRETS] Getting user secrets...');
            userSecrets = await getUserSecrets(packageName, apiKey);
            console.log('[SECRETS] userSecrets:', userSecrets);
        }
        // 4. reformat secrets into z.object()
        if (!sessionData && !isMaster) {
            console.log('[CONFIG] Creating config...');
            ({ filledConfig } = await createConfig(configJSON, userSecrets));
            console.log('[CONFIG] filled config:', filledConfig);
        } else if (isMaster && !sessionData) {
            filledConfig = {};
            console.log('[CONFIG] Bypassing config filling due to master key');
        }
        // -- MCP session/stateless management
        let transport;
        if (isMaster) {
            // Master key: stateless mode, no session
            console.log('[MCP] Master key used: running in stateless mode (no session management)');
            transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
            const server = createStatelessServer({ config: filledConfig });
            await server.connect(transport);
            await transport.handleRequest(req, res, req.body);
            return;
        }
        if (sessionId && sessionData) {
            // Recreate transport/server from session data
            transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: () => sessionId,
                onsessioninitialized: (sid) => {},
            });
            transport.onclose = async () => {
                await deleteSession(sessionId);
                console.log('[MCP] Session closed and deleted from Redis:', sessionId);
            };
            const server = createStatelessServer({ config: filledConfig });
            await server.connect(transport);
        } else if (!sessionId && isInitializeRequest(req.body)) {
            // New initialization request
            transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: () => randomUUID(),
                onsessioninitialized: async (sid) => {
                    // Store session in Redis
                    await setSession(sid, {
                        apiKey,
                        valid,
                        isMaster,
                        filledConfig
                    });
                    console.log('[MCP] Session initialized and stored in Redis:', sid);
                },
            });
            transport.onclose = async () => {
                if (transport.sessionId) {
                    await deleteSession(transport.sessionId);
                    console.log('[MCP] Session closed and deleted from Redis:', transport.sessionId);
                }
            };
            // Create the MCP server instance
            const server = createStatelessServer({ config: filledConfig });
            await server.connect(transport);
        } else {
            // Invalid request
            res.status(400).json({
                jsonrpc: '2.0',
                error: {
                    code: -32000,
                    message: 'Bad Request: No valid session ID provided',
                },
                id: null,
            });
            return;
        }
        // Handle the request
        await transport.handleRequest(req, res, req.body);
    });

    // Reusable handler for GET and DELETE requests
    const handleSessionRequest = async (req, res) => {
        const sessionId = req.headers['mcp-session-id'];
        if (sessionId) {
            console.log(`[MCP] Session request with session ID: ${sessionId}`);
        } else {
            console.log(`[MCP] Session request with NO session ID`);
        }
        const sessionData = sessionId ? await getSession(sessionId) : null;
        if (!sessionId || !sessionData) {
            res.status(400).send('Invalid or missing session ID');
            return;
        }
        // Recreate transport/server from session data
        const { filledConfig } = sessionData;
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => sessionId,
            onsessioninitialized: (sid) => {},
        });
        transport.onclose = async () => {
            await deleteSession(sessionId);
            console.log('[MCP] Session closed and deleted from Redis:', sessionId);
        };
        const server = createStatelessServer({ config: filledConfig });
        await server.connect(transport);
        await transport.handleRequest(req, res);
    };

    // Handle GET requests for server-to-client notifications via SSE
    app.get('/mcp', handleSessionRequest);

    // Handle DELETE requests for session termination
    app.delete('/mcp', handleSessionRequest);

    // 11. listen
    const PORT = 8080;
    app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`)
    })
})();