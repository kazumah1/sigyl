const express = require("express");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const fetch = require("node-fetch");
// const { z } = require("zod");

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
        console.log('[PACKAGENAME] Hostname:', req.hostname);
        console.log('[PACKAGENAME] Path:', req.path);
        if (req.hostname.includes('sigyl-mcp-')) {
            console.log('[PACKAGENAME] Getting package name from sigyl-mcp-...');
            const match = hostname.match(/sigyl-mcp-(.+?)(?:-lrzo3avokq-uc\.a\.run\.app|\.a\.run\.app)/);
            if (match) {
                const packagePath = match[1];
                console.log("[PACKAGENAME] Extracted package path:", packagePath);
                
                // Convert to proper format: sigyl-dev/Brave-Search
                // The packagePath might be "sigyl-dev-brave-search" from hostname
                // We need to convert it to "sigyl-dev/Brave-Search"
                if (packagePath.includes("-")) {
                // Split by hyphens and reconstruct
                const parts = packagePath.split("-");
                if (parts.length >= 3 && parts[0] === "sigyl" && parts[1] === "dev") {
                    // Format: sigyl-dev-brave-search -> sigyl-dev/Brave-Search
                    const orgPart = `${parts[0]}-${parts[1]}`; // sigyl-dev
                    const packagePart = parts.slice(2).map(part => 
                    part.charAt(0).toUpperCase() + part.slice(1)
                    ).join("-"); // Brave-Search
                    const formattedName = `${orgPart}/${packagePart}`;
                    console.log("[PACKAGENAME] Converted to:", formattedName);
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
        if (!Array.isArray(configJSON)) {
            throw new Error("configJSON must be an array");
        }

        const zodShape = {};
        const configValues = {};

        for (const field of configJSON) {
            let zodType;
            // 1. Type
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
                    zodType = z.number();
                    break;
                default:
                    zodType = z.any();
            }

            // 2. Description
            if (field.description) {
                zodType = zodType.describe(field.description);
            }

            // 3. Default
            if (field.default !== undefined) {
                zodType = zodType.default(field.default);
            }

            // 4. Required/Optional
            if (field.required === false) {
                zodType = zodType.optional();
            }

            zodShape[field.name] = zodType;

            // 5. Fill config value
            if (userSecrets && userSecrets[field.name] !== undefined) {
                configValues[field.name] = userSecrets[field.name];
            } else if (field.default !== undefined) {
                configValues[field.name] = field.default;
            }
        }

        const configSchema = z.object(zodShape);

        // Validate and fill with defaults
        const filledConfig = configSchema.parse(configValues);

        return { configSchema, filledConfig };
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
        console.log('[MCP] x-sigyl-api-key header:', req.headers['x-sigyl-api-key']);
        console.log('[MCP] apiKey from query:', req.query.apiKey);
        console.log('[MCP] Using apiKey:', apiKey);

        // -- validate api key
        const { valid, isMaster } = await isValidSigylApiKey(apiKey);
        if (!valid) {
            console.warn('[MCP] 401 Unauthorized: Invalid or missing API key');
            return res.status(401).json({ error: 'Invalid or missing Sigyl API Key' });
        }

        // -- somehow get package name
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
            console.log('[CONFIG] config:', filledConfig);
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

        // 8. handle requests
        await transport.handleRequest(req, res, req.body);
    });

    // 11. listen
    const PORT = 8080;
    app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`)
    })
})();