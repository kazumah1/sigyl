const express = require("express");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const fetch = require("node-fetch");
const { z } = require("zod");
const { randomUUID } = require("crypto");

// 1. create the /mcp endpoint
(async () => {
    // session management Map
    const sessions = new Map();
    function generateSessionId() {
        return randomUUID();
    }

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
        console.log('[CONFIG] configJSON:', configJSON);
        console.log('[CONFIG] userSecrets:', userSecrets);
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

    // Handle GET requests for health checks (Claude Desktop sends these)
    app.get('/mcp', async (req, res) => {
        try {
            const packageName = await getPackageName(req);
            res.json({
                status: 'ready',
                transport: 'http',
                endpoint: '/mcp',
                package: packageName,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
        console.error('[MCP] GET health check failed:', error);
        res.status(500).json({ error: 'Health check failed' });
        }
    });

    app.post('/mcp', async (req, res) => {
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
            // Assign to the outer variable
            ({ filledConfig } = await createConfig(configJSON, userSecrets));
            console.log('[CONFIG] filled config:', filledConfig);
        } else {
            filledConfig = {};
            console.log('[CONFIG] Bypassing config filling due to master key');
        }

        // 5. pass z.object() into createStatelessServer() as config
        console.log('[SERVER] Creating server...');
        const server = createStatelessServer({ config: filledConfig });
        // 6. StreamableHTTPServerTransport instance
        // TODO: Session management
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
        
        // handle close
        res.on('close', () => {
            transport.close();
            server.close();
        });

        // 9. collect metrics (request, response, timing, errors, user info, etc.)
        //    -- send metrics to backend endpoint asynchronously

        // 7. connect
        await server.connect(transport);

        const method = req.body?.method;
        if (!isMaster) {
            if (method === 'initialize') {
                console.log('[SESSION] Initializing session');
                const sessionId = generateSessionId();
                sessions.set(sessionId, { created: Date.now() });

                res.set('Mcp-Session-Id', sessionId);
                res.set('MCP-Protocol-Version', '2025-06-18');

                console.log('[SESSION] Sending initialize response');
                const serverResponse = await transport.handleRequest(req, res, req.body);
                console.log('[SESSION] Server response:', serverResponse);

                const { capabilities, tools, serverInfo } = serverResponse;

                console.log('[SESSION] Sending initialize response');
                return res.json({
                    jsonrpc: "2.0", 
                    id: req.body.id,
                    result: { capabilities, tools, serverInfo }
                });
            } else {
                console.log('[SESSION] Handling request');
                const sessionId = req.headers['mcp-session-id'];
                if (!sessionId || !sessions.has(sessionId)) {
                    return res.status(400).json({ error: 'Missing or invalid session'})
                }
                // 8. handle requests
                await transport.handleRequest(req, res, req.body);
            }
        } else {
            console.log('[SESSION] Handling request as master');
            await transport.handleRequest(req, res, req.body);
        }
    });

    // 11. listen
    const PORT = 8080;
    app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`)
    })
})();