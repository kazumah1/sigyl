const express = require("express");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { isInitializeRequest } = require("@modelcontextprotocol/sdk/types.js");
const fetch = require("node-fetch");
const { z } = require("zod");
const { randomUUID } = require("crypto");
// const { Redis } = require('@upstash/redis');
const cors = require('cors');
// const redis = new Redis({
//   url: process.env.UPSTASH_REDIS_REST_URL,
//   token: process.env.UPSTASH_REDIS_REST_TOKEN
// });

const servers = {};

// async function getSession(sessionId) {
//   const data = await redis.get(`mcp:session:${sessionId}`);
//   console.log('[MCP] Session data:', data);
//   return data || null;
// }

// async function setSession(sessionId, sessionData) {
//   await redis.set(`mcp:session:${sessionId}`, JSON.stringify(sessionData), { ex: 3600 }); // 1 hour expiry
//   console.log('[MCP] Session data set:', sessionData);
// }

// async function deleteSession(sessionId) {
//   await redis.del(`mcp:session:${sessionId}`);
// }

// 1. create the /mcp endpoint
(async () => {
    console.log('[WRAPPER] Starting wrapper...');
    const createStatelessServer = (await import("./server.js")).default;

    const app = express();
    app.use(express.json())


    // Add metrics middleware after express.json()
    // app.use((req, res, next) => {
    //   if (req.path !== '/mcp' && req.method !== 'POST' && req.method !== 'GET' && req.method !== 'DELETE') {
    //     return next();
    //   }

    //   const startTime = Date.now();
    //   const chunks = [];
    //   const oldWrite = res.write;
    //   const oldEnd = res.end;

    //   res.write = function(chunk, ...args) {
    //     chunks.push(Buffer.from(chunk));
    //     return oldWrite.apply(res, [chunk, ...args]);
    //   };

    //   res.end = function(chunk, ...args) {
    //     if (chunk) {
    //       chunks.push(Buffer.from(chunk));
    //     }
    //     oldEnd.apply(res, [chunk, ...args]);
    //   };

    //   res.on('finish', async () => {
    //     try {
    //       let sessionId = req.headers['mcp-session-id'];
    //       let eventSequence = 1;
    //       let isStateless = false;

    //       if (!sessionId) {
    //         sessionId = randomUUID(); // One-time ID for metrics
    //         isStateless = true;
    //         eventSequence = 1;
    //       }

    //       const sessionData = await getSession(sessionId);
    //       if (!sessionData || sessionData.isMaster) return; // Skip master

    //       try {
    //         eventSequence = await redis.incr(`mcp:session:${sessionId}:sequence`);
    //       } catch (err) {
    //         console.error('[METRICS] Redis sequence error:', err);
    //       }

    //       const responseBody = Buffer.concat(chunks).toString('utf8');
    //       let parsedBody = responseBody;
    //       if (res.getHeader('content-type')?.includes('application/json')) {
    //         try {
    //           parsedBody = JSON.parse(responseBody);
    //         } catch {}
    //       }

    //       const rawEvent = {
    //         session_id: sessionId,
    //         event_sequence: eventSequence,
    //         timestamp: new Date().toISOString(),
    //         package_name: await getPackageName(req) || 'unknown',
    //         user_api_key: sessionData?.apiKey || (req.headers['x-sigyl-api-key'] || req.query.apiKey) || 'anonymous',
    //         client_ip: req.ip || req.connection.remoteAddress,
    //         user_agent: req.headers['user-agent'],
    //         request: {
    //           method: req.method,
    //           headers: { ...req.headers },
    //           body: req.body,
    //           url: req.url,
    //           query_params: req.query,
    //           size_bytes: Buffer.byteLength(JSON.stringify(req.body), 'utf8')
    //         },
    //         response: {
    //           status_code: res.statusCode,
    //           headers: res.getHeaders(),
    //           body: parsedBody,
    //           size_bytes: Buffer.byteLength(responseBody),
    //           duration_ms: Date.now() - startTime
    //         },
    //         system: {
    //           memory_usage_mb: process.memoryUsage().heapUsed / 1024 / 1024,
    //           cpu_time_ms: process.cpuUsage().user / 1000,
    //           secrets_count: Object.keys(sessionData.filledConfig).length,
    //           secrets_keys: Object.keys(sessionData.filledConfig),
    //           environment: process.env.NODE_ENV || 'production',
    //           wrapper_version: '25.0.0-metrics'
    //         },
    //         error: res.statusCode >= 400 ? {
    //           occurred: true,
    //           message: parsedBody?.error || 'Unknown error',
    //           stack: parsedBody?.stack,
    //           type: parsedBody?.errorType || 'http_error'
    //         } : undefined
    //       };

    //       const registryUrl = process.env.SIGYL_REGISTRY_URL || 'https://api.sigyl.dev';
    //       await fetch(`${registryUrl}/api/v1/session-analytics/events`, {
    //         method: 'POST',
    //         headers: {
    //           'Content-Type': 'application/json',
    //           'Authorization': `Bearer ${process.env.SIGYL_MASTER_KEY}`
    //         },
    //         body: JSON.stringify(rawEvent)
    //       });

    //       if (isStateless) {
    //         console.log(`[METRICS] Sent stateless event with temp ID ${sessionId}`);
    //       } else {
    //         console.log(`[METRICS] Sent event ${eventSequence} for session ${sessionId}`);
    //       }
    //     } catch (err) {
    //       console.error('[METRICS] Error sending event:', err);
    //     }
    //   });

    //   next();
    // });

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
        // Robust session ID extraction
        let sessionId = req.headers['mcp-session-id']
        console.log(`[MCP] Session ID: ${sessionId})`);

        let apiKey = req.headers['x-sigyl-api-key'] || req.query.apiKey;
        // let valid, isMaster, packageName, configJSON, userSecrets, filledConfig;

        let { valid, isMaster } = await isValidSigylApiKey(apiKey);

        if (!valid) {
            res.status(401).json({ error: 'Invalid or missing Sigyl API Key' });
            return;
        }
        let transport;
        let packageName;
        let configJSON;
        let userSecrets;
        let filledConfig;
        if (isMaster) {
            transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
            const server = createStatelessServer({ config: filledConfig });
            await server.connect(transport);
            await transport.handleRequest(req, res, req.body);
            return;
        }

        if (sessionId && servers[sessionId]) {
            console.log('[MCP] Loaded sessionData from servers for sessionId:', sessionId);
            transport = servers[sessionId];
        } else if (!sessionId && isInitializeRequest(req.body)) {
            packageName = await getPackageName(req);
            configJSON = await getConfig(packageName);
            userSecrets = await getUserSecrets(packageName, apiKey);
            ({ filledConfig } = await createConfig(configJSON, userSecrets));
            transport = new StreamableHTTPServerTransport({ 
                sessionIdGenerator: () => randomUUID(),
                onsessioninitialized: (sessionId) => {
                    servers[sessionId] = transport;
                }
            });
            transport.onclose = () => {
                if (transport.sessionId) {
                    delete servers[transport.sessionId];
                    console.log('[MCP] Session closed and deleted from servers:', transport.sessionId);
                }
            };
            const server = createStatelessServer({ config: filledConfig });
            await server.connect(transport);
            await transport.handleRequest(req, res, req.body);
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
        await transport.handleRequest(req, res, req.body);
    });

    // Reusable handler for GET and DELETE requests
    const handleSessionRequest = async (req, res) => {
        const sessionId = req.headers['mcp-session-id'];
        if (!sessionId || !servers[sessionId]) {
            res.status(400).send('Invalid or missing session ID');
            return;
        }
        // Recreate transport/server from session data
        const transport = servers[sessionId];
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