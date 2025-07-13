const express = require("express");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const fetch = require("node-fetch");
// const { z } = require("zod");

// 1. create the /mcp endpoint
(async () => {
    const createStatelessServer = (await import("./server.js")).default;

    const app = express();
    app.use(express.json())

    // API key validation function
    console.log('[WRAPPER] isValidSigylApiKey');
    async function isValidSigylApiKey(key) {
        if (!key) return false;
        try {
          const resp = await fetch('https://api.sigyl.dev/api/v1/keys/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: key })
          });
          if (!resp.ok) return false;
          const data = await resp.json();
          return data && data.valid === true;
        } catch (err) {
          console.error('API key validation error:', err);
          return false;
        }
      }
    
    // console.log('[WRAPPER] getConfig');
    // async function getConfig(packageName) {
    //     let slug = packageName;

    //     const registryUrl = 'https://api.sigyl.dev';
    //     const url = `${registryUrl}/api/v1/packages/${encodeURIComponent(slug)}`;
    //     console.log('[CONFIG] Fetching package config from:', url);

    //     try {
    //         const resp = await fetch(url, {
    //             method: 'GET',
    //             headers: { 'Content-Type': 'application/json' }
    //         });
    //         if (!resp.ok) {
    //             console.error('[CONFIG] Failed to fetch config:', resp.status, resp.statusText);
    //             return {};
    //         }
    //         const data = await resp.json();
    //         if (data.success && data.data) {
    //             return {
    //                 required_secrets: data.data.required_secrets || [],
    //                 optional_secrets: data.data.optional_secrets || []
    //             };
    //         }
    //         return {};
    //     } catch (err) {
    //         console.error('[CONFIG] Error fetching config:', err);
    //         return {};
    //     }
    // }

    // console.log('[WRAPPER] getUserSecrets');
    // async function getUserSecrets(packageName, apiKey) {
    //     if (!apiKey) {
    //         console.warn('[SECRETS] No API key provided to getUserSecrets');
    //         return {};
    //     }
    //     if (!packageName) {
    //         console.warn('[SECRETS] No packageName provided to getUserSecrets');
    //         return {};
    //     }

    //     const registryUrl = process.env.SIGYL_REGISTRY_URL || 'https://api.sigyl.dev';
    //     // Only use the slug part for the endpoint
    //     let slug = packageName;

    //     const url = `${registryUrl}/api/v1/secrets/package/${encodeURIComponent(slug)}`;
    //     console.log('[SECRETS] Fetching user secrets from:', url);

    //     try {
    //         const resp = await fetch(url, {
    //             method: 'GET',
    //             headers: {
    //                 'Authorization': `Bearer ${apiKey}`,
    //                 'Content-Type': 'application/json'
    //             }
    //         });
    //         if (!resp.ok) {
    //             console.error('[SECRETS] Failed to fetch user secrets:', resp.status, resp.statusText);
    //             return {};
    //         }
    //         const data = await resp.json();
    //         if (data.success && Array.isArray(data.data)) {
    //             // Convert array to key-value object
    //             const secrets = {};
    //             data.data.forEach(secret => {
    //                 if (secret.key && secret.value) {
    //                     secrets[secret.key] = secret.value;
    //                 }
    //             });
    //             return secrets;
    //         }
    //         return {};
    //     } catch (err) {
    //         console.error('[SECRETS] Error fetching user secrets:', err);
    //         return {};
    //     }
    // }

    // console.log('[WRAPPER] createConfig');
    // async function createConfig(configJSON, userSecrets) {
    //     if (!Array.isArray(configJSON)) {
    //         throw new Error("configJSON must be an array");
    //     }

    //     const zodShape = {};
    //     const configValues = {};

    //     for (const field of configJSON) {
    //         let zodType;
    //         // 1. Type
    //         switch (field.type) {
    //             case "string":
    //                 if (field.enum) {
    //                     zodType = z.enum(field.enum);
    //                 } else {
    //                     zodType = z.string();
    //                 }
    //                 break;
    //             case "boolean":
    //                 zodType = z.boolean();
    //                 break;
    //             case "number":
    //                 zodType = z.number();
    //                 break;
    //             default:
    //                 zodType = z.any();
    //         }

    //         // 2. Description
    //         if (field.description) {
    //             zodType = zodType.describe(field.description);
    //         }

    //         // 3. Default
    //         if (field.default !== undefined) {
    //             zodType = zodType.default(field.default);
    //         }

    //         // 4. Required/Optional
    //         if (field.required === false) {
    //             zodType = zodType.optional();
    //         }

    //         zodShape[field.name] = zodType;

    //         // 5. Fill config value
    //         if (userSecrets && userSecrets[field.name] !== undefined) {
    //             configValues[field.name] = userSecrets[field.name];
    //         } else if (field.default !== undefined) {
    //             configValues[field.name] = field.default;
    //         }
    //     }

    //     const configSchema = z.object(zodShape);

    //     // Validate and fill with defaults
    //     const filledConfig = configSchema.parse(configValues);

    //     return { configSchema, filledConfig };
    // }

    // Handle GET requests for health checks (Claude Desktop sends these)
    // app.get('/mcp', async (req, res) => {
    //     try {
    //     res.json({
    //         status: 'ready',
    //         transport: 'http',
    //         endpoint: '/mcp',
    //         package: req.originalUrl,
    //         timestamp: new Date().toISOString()
    //     });
    //     } catch (error) {
    //     console.error('[MCP] GET health check failed:', error);
    //     res.status(500).json({ error: 'Health check failed' });
    //     }
    // });

    console.log('[WRAPPER] /mcp POST');
    app.post('/mcp', async (req, res) => {
        // -- accepts api key
        const apiKey = req.headers['x-sigyl-api-key'] || req.query.apiKey;
        console.log('[MCP] Received /mcp POST');
        console.log('[MCP] x-sigyl-api-key header:', req.headers['x-sigyl-api-key']);
        console.log('[MCP] apiKey from query:', req.query.apiKey);
        console.log('[MCP] Using apiKey:', apiKey);
        // console.log('[MCP] req:', req);

        // -- validate api key
        const valid = await isValidSigylApiKey(apiKey);
        if (!valid) {
            console.warn('[MCP] 401 Unauthorized: Invalid or missing API key');
            return res.status(401).json({ error: 'Invalid or missing Sigyl API Key' });
        }

        // -- somehow get package name
        // console.log('[PACKAGENAME] req.originalUrl:', req.originalUrl);
        // console.log('[PACKAGENAME] req.url:', req.url);
        // console.log('[PACKAGENAME] req.baseUrl:', req.baseUrl);
        const packageName = 'sigyl-dev/google-maps';

        // 2. use package name to get required + optional secrets
        // const configJSON = await getConfig(packageName);
        // console.log('[CONFIG] config:', configJSON);


        // 3. use package name + api key to get user's secrets
        // const userSecrets = await getUserSecrets(packageName, apiKey);
        // console.log('[SECRETS] userSecrets:', userSecrets);

        // 4. reformat secrets into z.object()
        // const { filledConfig } = await createConfig(configJSON, userSecrets);
        // console.log('[CONFIG] config:', filledConfig);

        // 5. pass z.object() into createStatelessServer() as config
        const server = createStatelessServer({});
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
})
