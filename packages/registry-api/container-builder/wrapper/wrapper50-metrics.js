const express = require("express");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
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
  console.log('[MCP] Session data:', data);
  return data || null;
}

async function setSession(sessionId, sessionData) {
  await redis.set(`mcp:session:${sessionId}`, JSON.stringify(sessionData), { ex: 3600 }); // 1 hour expiry
  console.log('[MCP] Session data set:', sessionData);
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


    // Add metrics middleware after express.json()
    app.use((req, res, next) => {
      if (req.path !== '/mcp' && req.method !== 'POST' && req.method !== 'GET' && req.method !== 'DELETE') {
        return next();
      }

      const startTime = Date.now();
      const chunks = [];
      const oldWrite = res.write;
      const oldEnd = res.end;

      res.write = function(chunk, ...args) {
        chunks.push(Buffer.from(chunk));
        return oldWrite.apply(res, [chunk, ...args]);
      };

      res.end = function(chunk, ...args) {
        if (chunk) {
          chunks.push(Buffer.from(chunk));
        }
        oldEnd.apply(res, [chunk, ...args]);
      };

      res.on('finish', async () => {
        try {
          let sessionId = req.headers['mcp-session-id'];
          let eventSequence = 1;
          let isStateless = false;

          if (!sessionId) {
            sessionId = randomUUID(); // One-time ID for metrics
            isStateless = true;
            eventSequence = 1;
          }

          const sessionData = await getSession(sessionId);
          if (!sessionData || sessionData.isMaster) return; // Skip master

          try {
            eventSequence = await redis.incr(`mcp:session:${sessionId}:sequence`);
          } catch (err) {
            console.error('[METRICS] Redis sequence error:', err);
          }

          const responseBody = Buffer.concat(chunks).toString('utf8');
          let parsedBody = responseBody;
          if (res.getHeader('content-type')?.includes('application/json')) {
            try {
              parsedBody = JSON.parse(responseBody);
            } catch {}
          }

          const rawEvent = {
            session_id: sessionId,
            event_sequence: eventSequence,
            timestamp: new Date().toISOString(),
            package_name: await getPackageName(req) || 'unknown',
            user_api_key: sessionData?.apiKey || (req.headers['x-sigyl-api-key'] || req.query.apiKey) || 'anonymous',
            client_ip: req.ip || req.connection.remoteAddress,
            user_agent: req.headers['user-agent'],
            request: {
              method: req.method,
              headers: { ...req.headers },
              body: req.body,
              url: req.url,
              query_params: req.query,
              size_bytes: Buffer.byteLength(JSON.stringify(req.body), 'utf8')
            },
            response: {
              status_code: res.statusCode,
              headers: res.getHeaders(),
              body: parsedBody,
              size_bytes: Buffer.byteLength(responseBody),
              duration_ms: Date.now() - startTime
            },
            system: {
              memory_usage_mb: process.memoryUsage().heapUsed / 1024 / 1024,
              cpu_time_ms: process.cpuUsage().user / 1000,
              secrets_count: Object.keys(sessionData.filledConfig).length,
              secrets_keys: Object.keys(sessionData.filledConfig),
              environment: process.env.NODE_ENV || 'production',
              wrapper_version: '25.0.0-metrics'
            },
            error: res.statusCode >= 400 ? {
              occurred: true,
              message: parsedBody?.error || 'Unknown error',
              stack: parsedBody?.stack,
              type: parsedBody?.errorType || 'http_error'
            } : undefined
          };

          const registryUrl = process.env.SIGYL_REGISTRY_URL || 'https://api.sigyl.dev';
          await fetch(`${registryUrl}/api/v1/session-analytics/events`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SIGYL_MASTER_KEY}`
            },
            body: JSON.stringify(rawEvent)
          });

          if (isStateless) {
            console.log(`[METRICS] Sent stateless event with temp ID ${sessionId}`);
          } else {
            console.log(`[METRICS] Sent event ${eventSequence} for session ${sessionId}`);
          }
        } catch (err) {
          console.error('[METRICS] Error sending event:', err);
        }
      });

      next();
    });

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
            console.log('[PACKAGENAME] Getting package name from sigyl-mcp-...', hostname);
            return hostname.replace('-lrzo3avokq-uc.a.run.app', '');
        } else {
            console.log('[PACKAGENAME] Error: Not a sigyl-mcp-... hostname', hostname);
            return null;
        }
    }
    
    async function getSlugFromServiceName(serviceName) {
        if (!serviceName) return null;
        const registryUrl = process.env.SIGYL_REGISTRY_URL || 'https://api.sigyl.dev';
        const url = `${registryUrl}/api/v1/packages/service/${encodeURIComponent(serviceName)}`;
        try {
            const resp = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!resp.ok) return null;
            const data = await resp.json();
            if (data.success && data.data && data.data.slug) {
                return data.data.slug;
            }
            return null;
        } catch (err) {
            console.error('[SLUG] Error fetching slug from service_name:', err);
            return null;
        }
    }

    async function getConfig(packageName) {
        // packageName is now service_name; fetch slug first
        let slug = await getSlugFromServiceName(packageName);
        if (!slug) slug = packageName; // fallback for legacy
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
        // packageName is now service_name; fetch slug first
        let slug = await getSlugFromServiceName(packageName);
        if (!slug) slug = packageName; // fallback for legacy
        const registryUrl = process.env.SIGYL_REGISTRY_URL || 'https://api.sigyl.dev';
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

    async function createPlaceholderSecrets(configJSON) {
        // Build placeholder secrets object
        const placeholderSecrets = {};
        if (configJSON && (Array.isArray(configJSON.required_secrets) || Array.isArray(configJSON.optional_secrets))) {
            const fillField = (field) => {
                switch (field.type) {
                    case "string":
                        return "__MASTER_PLACEHOLDER__";
                    case "boolean":
                        return false;
                    case "number":
                        return 0;
                    case "integer":
                        return 0;
                    default:
                        if (field.enum && Array.isArray(field.enum) && field.enum.length > 0) {
                            return field.enum[0];
                        }
                        return null;
                }
            };
            if (Array.isArray(configJSON.required_secrets)) {
                for (const field of configJSON.required_secrets) {
                    placeholderSecrets[field.name] = fillField(field);
                }
            }
            if (Array.isArray(configJSON.optional_secrets)) {
                for (const field of configJSON.optional_secrets) {
                    placeholderSecrets[field.name] = fillField(field);
                }
            }
        }
        return placeholderSecrets;
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
                    let value = userSecrets[field.name];
                    if ((field.type === "number" || field.type === "integer") && typeof value === "string") {
                        value = Number(value);
                    }
                    configValues[field.name] = value;
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
                    let value = userSecrets[field.name];
                    if ((field.type === "number" || field.type === "integer") && typeof value === "string") {
                        value = Number(value);
                    }
                    configValues[field.name] = value;
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
        // Robust session ID extraction
        let sessionId = req.headers['mcp-session-id']
        console.log(`[MCP] Session ID: ${sessionId}`);

        let apiKey = req.headers['x-sigyl-api-key'] || req.query.apiKey;
        // let valid, isMaster, packageName, configJSON, userSecrets, filledConfig;

        let { valid, isMaster } = await isValidSigylApiKey(apiKey);

        if (!valid) {
            res.status(401).json({ error: 'Invalid or missing Sigyl API Key' });
            return;
        }
        let transport;
        let server;
        let packageName;
        let configJSON;
        let userSecrets;
        let filledConfig = {};
        if (isMaster) {
            // Master key: fill config with placeholders for all required/optional secrets
            transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
            server = createStatelessServer({ config: filledConfig });
            await server.connect(transport);
            await transport.handleRequest(req, res, req.body);
            return;
        }

        if (sessionId && await getSession(sessionId)) {
            console.log('[MCP] Loaded sessionData from Redis for sessionId:', sessionId);
            ({ filledConfig, apiKey, packageName, configJSON, userSecrets, valid, isMaster } = await getSession(sessionId));
            transport = new StreamableHTTPServerTransport({ 
                sessionIdGenerator: () => sessionId,
                onsessioninitialized: async (sessionId) => {
                    await setSession(sessionId, {
                        filledConfig: filledConfig,
                        isMaster: isMaster,
                        apiKey: apiKey,
                        packageName: packageName,
                        configJSON: configJSON,
                        userSecrets: userSecrets,
                        valid: valid
                    });
                }
            });
            transport.onclose = async () => {
                if (transport.sessionId) {
                    setSession(transport.sessionId, {
                        filledConfig: filledConfig,
                        isMaster: isMaster,
                        apiKey: apiKey,
                        packageName: packageName,
                        configJSON: configJSON,
                        userSecrets: userSecrets,
                        valid: valid
                    })
                    await deleteSession(transport.sessionId);
                    console.log('[MCP] Session closed and deleted from Redis:', transport.sessionId);
                }
            };
            server = createStatelessServer({ config: filledConfig });
        } else if (!sessionId && isInitializeRequest(req.body)) {
            packageName = await getPackageName(req);
            console.log('[PACKAGENAME] Package name:', packageName);
            configJSON = await getConfig(packageName);
            console.log('[CONFIG] Config JSON:', configJSON);
            userSecrets = await getUserSecrets(packageName, apiKey);
            ({ filledConfig } = await createConfig(configJSON, userSecrets));
            console.log('[CONFIG] Filled config:', filledConfig);
            transport = new StreamableHTTPServerTransport({ 
                sessionIdGenerator: () => randomUUID(),
                onsessioninitialized: async (sessionId) => {
                    await setSession(sessionId, {
                        filledConfig: filledConfig,
                        isMaster: false,
                        apiKey: apiKey,
                        packageName: packageName,
                        configJSON: configJSON,
                        userSecrets: userSecrets,
                        valid: valid
                    });
                }
            });
            transport.onclose = async () => {
                if (transport.sessionId) {
                    setSession(sessionId, {                        
                        filledConfig: filledConfig,
                        isMaster: false,
                        apiKey: apiKey,
                        packageName: packageName,
                        configJSON: configJSON,
                        userSecrets: userSecrets,
                        valid: valid
                    });
                    await deleteSession(transport.sessionId);
                    console.log('[MCP] Session closed and deleted from Redis:', transport.sessionId);
                }
            };
            server = createStatelessServer({ config: filledConfig });
        } else {
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
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    });

    // Reusable handler for GET and DELETE requests
    const handleSessionRequest = async (req, res) => {
        const sessionId = req.headers['mcp-session-id'];
        if (!sessionId || !await getSession(sessionId)) {
            res.status(400).send('Invalid or missing session ID');
            return;
        }
        // Recreate transport/server from session data
        const { filledConfig, apiKey, packageName, configJSON, userSecrets, valid, isMaster } = await getSession(sessionId);
        const transport = new StreamableHTTPServerTransport({ 
            sessionIdGenerator: () => sessionId,
            onsessioninitialized: async (sessionId) => {
                await setSession(sessionId, {
                    filledConfig: filledConfig,
                    isMaster: isMaster,
                    apiKey: apiKey,
                    packageName: packageName,
                    configJSON: configJSON,
                    userSecrets: userSecrets,
                    valid: valid
                });
            }
        });
        transport.onclose = async () => {
            if (transport.sessionId) {
                setSession(transport.sessionId, {
                    filledConfig: filledConfig,
                    isMaster: isMaster,
                    apiKey: apiKey,
                    packageName: packageName,
                    configJSON: configJSON,
                    userSecrets: userSecrets,
                    valid: valid
                });
                await deleteSession(transport.sessionId);
                console.log('[MCP] Session closed and deleted from Redis:', transport.sessionId);
            }
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