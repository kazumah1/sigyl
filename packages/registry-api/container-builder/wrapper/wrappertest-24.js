const express = require("express");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { isInitializeRequest } = require("@modelcontextprotocol/sdk/types.js");
const fetch = require("node-fetch");
const { z } = require("zod");
const { randomUUID } = require("crypto");

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

    // Map to store transports by session ID
    const transports = {};

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
        const { valid, isMaster } = await isValidSigylApiKey(apiKey);
        if (!valid) {
            console.warn('[MCP] 401 Unauthorized: Invalid or missing API key');
            return res.status(401).json({ error: 'Invalid or missing Sigyl API Key' });
        }
        // -- get package name
        let packageName;
        if (!isMaster) {
            console.log('[PACKAGENAME] Getting package name...');
            packageName = await getPackageName(req);
            console.log('[PACKAGENAME] Package name:', packageName);
        } else {
            console.log('[PACKAGENAME] Bypassing package name due to master key');
        }

        // 2. use package name to get required + optional secrets
        let configJSON;
        if (!isMaster) {
            console.log('[CONFIG] Getting config...');
            configJSON = await getConfig(packageName);
            console.log('[CONFIG] config:', configJSON);
        } else {
            console.log('[CONFIG] Bypassing config fetching due to master key');
        }

        // 3. use package name + api key to get user's secrets
        let userSecrets;
        if (!isMaster) {
            console.log('[SECRETS] Getting user secrets...');
            userSecrets = await getUserSecrets(packageName, apiKey);
            console.log('[SECRETS] userSecrets:', userSecrets);
        } else {
            console.log('[SECRETS] Bypassing user secrets due to master key');
        }

        // 4. reformat secrets into z.object()
        let filledConfig;
        if (!isMaster) {
            console.log('[CONFIG] Creating config...');
            ({ filledConfig } = await createConfig(configJSON, userSecrets));
            console.log('[CONFIG] filled config:', filledConfig);
        } else {
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
        if (sessionId && transports[sessionId]) {
            // Reuse existing transport
            transport = transports[sessionId];
        } else if (!sessionId && isInitializeRequest(req.body)) {
            // New initialization request
            transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: () => randomUUID(),
                onsessioninitialized: (sid) => {
                    transports[sid] = transport;
                    console.log('[MCP] Session initialized:', sid);
                },
            });
            transport.onclose = () => {
                if (transport.sessionId) {
                    delete transports[transport.sessionId];
                    console.log('[MCP] Session closed:', transport.sessionId);
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
        if (!sessionId || !transports[sessionId]) {
            res.status(400).send('Invalid or missing session ID');
            return;
        }
        const transport = transports[sessionId];
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