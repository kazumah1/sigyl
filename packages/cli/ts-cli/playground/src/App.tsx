import React, { useState } from 'react';

const DEFAULT_MCP_URL = 'http://localhost:8080/mcp';

function App() {
  const [mcpUrl, setMcpUrl] = useState(DEFAULT_MCP_URL);
  const [tools, setTools] = useState<any[]>([]);
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [toolSchemas, setToolSchemas] = useState<Record<string, any>>({});
  const [paramValues, setParamValues] = useState<Record<string, any>>({});
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);

  // Helper to parse JSON or fallback to text, and handle SSE
  const parseJsonOrText = async (res: Response) => {
    const text = await res.text();
    // Handle SSE: look for 'data: ...' line
    if (text.startsWith('event: message')) {
      const match = text.match(/data: (.+)/);
      if (match) {
        try {
          return JSON.parse(match[1]);
        } catch {
          return { _raw: text };
        }
      }
    }
    try {
      return JSON.parse(text);
    } catch {
      return { _raw: text };
    }
  };

  // Fetch tool list from MCP server (JSON-RPC 2.0)
  const fetchTools = async () => {
    setError(null);
    setLoading(true);
    setTools([]);
    setSelectedTool('');
    setResponse(null);
    setToolSchemas({});
    setParamValues({});
    setShowJson(false);
    try {
      const res = await fetch(mcpUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {}
        }),
      });
      const data = await parseJsonOrText(res);
      if (data.result && Array.isArray(data.result.tools)) {
        setTools(data.result.tools);
        // Build a map of toolName -> inputSchema
        const schemas: Record<string, any> = {};
        data.result.tools.forEach((tool: any) => {
          if (tool.name && tool.inputSchema) {
            schemas[tool.name] = tool.inputSchema;
          }
        });
        setToolSchemas(schemas);
      } else if (data._raw) {
        setError('Response was not valid JSON. Raw response:');
        setResponse(data._raw);
      } else {
        setError('No tools found or invalid response.');
      }
    } catch (e: any) {
      setError('Failed to fetch tools: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle param field changes
  const handleParamChange = (key: string, value: any) => {
    setParamValues(prev => ({ ...prev, [key]: value }));
  };

  // Send test request to selected tool (JSON-RPC 2.0)
  const sendTestRequest = async () => {
    setError(null);
    setLoading(true);
    setResponse(null);
    setShowJson(false);
    try {
      const res = await fetch(mcpUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: selectedTool,
            arguments: paramValues
          }
        }),
      });
      const data = await parseJsonOrText(res);
      setResponse(data);
    } catch (e: any) {
      setError('Failed to send request: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Render param fields based on inputSchema
  const renderParamFields = () => {
    const schema = toolSchemas[selectedTool];
    if (!schema || !schema.properties) return null;
    return Object.entries(schema.properties).map(([key, prop]: [string, any]) => {
      const type = prop.type;
      const desc = prop.description || '';
      let inputType = 'text';
      if (type === 'number' || type === 'integer') inputType = 'number';
      if (type === 'boolean') inputType = 'checkbox';
      return (
        <div key={key} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontWeight: 600, fontSize: 16, minWidth: 90 }}>
            {key}
            <span style={{ color: '#aaa', fontSize: 14, fontWeight: 400, marginLeft: 6 }}>{desc}</span>
          </label>
          {inputType === 'checkbox' ? (
            <input
              type="checkbox"
              checked={!!paramValues[key]}
              onChange={e => handleParamChange(key, e.target.checked)}
              style={{
                marginLeft: 8,
                width: 22,
                height: 22,
                borderRadius: 4,
                border: '1px solid #444',
                background: '#181818',
                accentColor: '#00e676',
                cursor: 'pointer'
              }}
            />
          ) : (
            <input
              type={inputType}
              value={paramValues[key] ?? ''}
              onChange={e => handleParamChange(key, inputType === 'number' ? Number(e.target.value) : e.target.value)}
              style={{
                width: 220,
                fontSize: 17,
                padding: '10px 12px',
                borderRadius: 6,
                border: '1px solid #444',
                background: '#181818',
                color: '#fff',
                outline: 'none',
                fontWeight: 500
              }}
            />
          )}
        </div>
      );
    });
  };

  // Reset param values when tool changes
  React.useEffect(() => {
    if (!selectedTool) return;
    const schema = toolSchemas[selectedTool];
    if (!schema || !schema.properties) {
      setParamValues({});
      return;
    }
    // Set defaults (empty string/false/0)
    const defaults: Record<string, any> = {};
    Object.entries(schema.properties).forEach(([key, prop]: [string, any]) => {
      if (prop.type === 'boolean') defaults[key] = false;
      else if (prop.type === 'number' || prop.type === 'integer') defaults[key] = 0;
      else defaults[key] = '';
    });
    setParamValues(defaults);
  }, [selectedTool, toolSchemas]);

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: 'linear-gradient(120deg, #232526 0%, #414345 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 0'
    }}>
      <div style={{
        maxWidth: 600,
        minWidth: 340,
        width: '100%',
        background: '#222',
        fontFamily: 'sans-serif',
        padding: '32px 24px 24px 24px',
        borderRadius: 12,
        boxShadow: '0 2px 16px #0002',
        margin: '0 auto'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: 32 }}>MCP Playground (Local)</h2>
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ flex: 1, fontSize: 17, fontWeight: 500 }}>
            MCP Server URL:{' '}
            <input
              type="text"
              value={mcpUrl}
              onChange={e => setMcpUrl(e.target.value)}
              style={{
                width: '100%',
                maxWidth: 400,
                fontSize: 18,
                padding: '10px 12px',
                borderRadius: 6,
                border: '1px solid #444',
                background: '#181818',
                color: '#fff',
                outline: 'none',
                marginTop: 6,
                marginBottom: 2
              }}
            />
          </label>
          <button onClick={fetchTools} style={{
            marginLeft: 8,
            minWidth: 130,
            fontSize: 18,
            padding: '10px 18px',
            borderRadius: 8,
            background: '#181818',
            color: '#fff',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 1px 4px #0002',
            transition: 'background 0.2s',
          }} disabled={loading}>
            Fetch Tools
          </button>
        </div>
        {tools.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 17, fontWeight: 500 }}>
              Select Tool:{' '}
              <div style={{ display: 'inline-block', position: 'relative', minWidth: 220 }}>
                <select
                  value={selectedTool}
                  onChange={e => setSelectedTool(e.target.value)}
                  style={{
                    minWidth: 220,
                    maxWidth: 400,
                    maxHeight: 260,
                    overflowY: 'auto',
                    display: 'block',
                    fontSize: 18,
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid #444',
                    background: '#181818',
                    color: '#fff',
                    marginTop: 6,
                    marginBottom: 2,
                    outline: 'none',
                    fontWeight: 500
                  }}
                  size={tools.length > 10 ? 10 : undefined}
                >
                  <option value="">-- Select --</option>
                  {tools.map((tool: any) => (
                    <option key={tool.name || tool} value={tool.name || tool}>
                      {tool.name || tool}
                    </option>
                  ))}
                </select>
                {tools.length > 10 && (
                  <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 16, background: 'linear-gradient(to left, #222 60%, transparent)' }} />
                )}
              </div>
            </label>
          </div>
        )}
        {selectedTool && (
          <form
            onSubmit={e => {
              e.preventDefault();
              sendTestRequest();
            }}
            style={{ marginBottom: 18 }}
          >
            <div style={{ marginBottom: 10, fontWeight: 600, fontSize: 17 }}>Tool Params:</div>
            {renderParamFields()}
            <button type="submit" style={{
              marginTop: 10,
              minWidth: 180,
              fontSize: 19,
              padding: '12px 0',
              borderRadius: 8,
              background: '#181818',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 1px 4px #0002',
              transition: 'background 0.2s',
            }} disabled={loading}>
              Send Test Request
            </button>
          </form>
        )}
        {loading && <div>Loading...</div>}
        {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
        {response && (
          <div style={{ background: '#222', color: '#fff', padding: 12, borderRadius: 6, marginTop: 16 }}>
            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Response:</div>
            {/* Highlight main result if present */}
            {response.result && response.result.content && Array.isArray(response.result.content) && response.result.content.length > 0 && response.result.content[0].text && (
              <div style={{
                background: '#333',
                color: '#00e676',
                fontWeight: 'bold',
                fontSize: 22,
                padding: '10px 16px',
                borderRadius: 4,
                marginBottom: 12,
                textAlign: 'center',
                letterSpacing: 1
              }}>
                {response.result.content[0].text}
              </div>
            )}
            {/* Accordion for JSON */}
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => setShowJson(v => !v)}
                style={{
                  background: '#333',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  padding: '6px 14px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  marginBottom: 4
                }}
              >
                {showJson ? 'Hide JSON' : 'Show JSON'}
              </button>
              {showJson && (
                <pre style={{ whiteSpace: 'pre-wrap', background: '#181818', color: '#fff', padding: 12, borderRadius: 6, marginTop: 4, fontSize: 14 }}>
                  {typeof response === 'string' ? response : JSON.stringify(response, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
        <div style={{ marginTop: 32, fontSize: 13, color: '#888', textAlign: 'center' }}>
          <div>• Start your MCP server on <b>http://localhost:8080/mcp</b> before using the playground.</div>
          <div>• This playground is for local dev testing only.</div>
        </div>
      </div>
    </div>
  );
}

export default App;
