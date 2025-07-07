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
  const [showRaw, setShowRaw] = useState(false);

  // Helper to parse SSE or JSON
  const parseSSEorJSON = (text: string) => {
    // If SSE, look for 'data:'
    if (text.startsWith('event: message')) {
      const match = text.match(/data: (.+)/);
      if (match) {
        try {
          return JSON.parse(match[1]);
        } catch {
          return null;
        }
      }
    }
    try {
      return JSON.parse(text);
    } catch {
      return null;
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

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const text = await res.text();
      const data = parseSSEorJSON(text);
      if (!data) {
        setError('Response was not valid JSON. Raw response:');
        setResponse(text);
        setLoading(false);
        return;
      }

      // Accept both { result: { tools: [...] } } and { tools: [...] }
      let toolsList = null;
      if (data.result && Array.isArray(data.result.tools)) {
        toolsList = data.result.tools;
      } else if (Array.isArray(data.tools)) {
        toolsList = data.tools;
      }

      if (toolsList) {
        setTools(toolsList);
        // Build a map of toolName -> inputSchema
        const schemas: Record<string, any> = {};
        toolsList.forEach((tool: any) => {
          if (tool.name && tool.inputSchema) {
            schemas[tool.name] = tool.inputSchema;
          }
        });
        setToolSchemas(schemas);
      } else {
        setError('No tools found or invalid response.');
        setResponse(JSON.stringify(data, null, 2));
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
    setShowRaw(false);
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

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const text = await res.text();
      const data = parseSSEorJSON(text);
      if (!data) {
        setError('Response was not valid JSON. Raw response:');
        setResponse(text);
        setLoading(false);
        return;
      }
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
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {Object.entries(schema.properties).map(([key, prop]: [string, any]) => {
          const type = prop.type;
          const desc = prop.description || '';
          let inputType = 'text';
          if (type === 'number' || type === 'integer') inputType = 'number';
          if (type === 'boolean') inputType = 'checkbox';
          if (type === 'string' && (desc.toLowerCase().includes('multiline') || desc.toLowerCase().includes('paragraph'))) inputType = 'textarea';
          return (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <label style={{ fontWeight: 500, marginBottom: 4 }}>{key}
                <span style={{ color: '#aaa', fontSize: 13, marginLeft: 8 }}>{desc}</span>
              </label>
              {inputType === 'checkbox' ? (
                <input
                  type="checkbox"
                  checked={!!paramValues[key]}
                  onChange={e => handleParamChange(key, e.target.checked)}
                  style={{ marginLeft: 2 }}
                />
              ) : inputType === 'textarea' ? (
                <textarea
                  value={paramValues[key] ?? ''}
                  onChange={e => handleParamChange(key, e.target.value)}
                  style={{ width: 320, minHeight: 60, fontFamily: 'inherit', fontSize: 15, padding: 6, borderRadius: 4, border: '1px solid #444' }}
                />
              ) : (
                <input
                  type={inputType}
                  value={paramValues[key] ?? ''}
                  onChange={e => handleParamChange(key, inputType === 'number' ? Number(e.target.value) : e.target.value)}
                  style={{ width: 320, fontFamily: 'inherit', fontSize: 15, padding: 6, borderRadius: 4, border: '1px solid #444' }}
                />
              )}
            </div>
          );
        })}
      </div>
    );
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

  // Helper to extract main text result
  const getMainTextResult = (resp: any) => {
    if (!resp) return null;
    if (resp.result && resp.result.content && Array.isArray(resp.result.content)) {
      const textItem = resp.result.content.find((item: any) => item.type === 'text' && item.text);
      if (textItem) return textItem.text;
    }
    return null;
  };

  // Layout
  return (
    <div style={{ minHeight: '100vh', minWidth: '100vw', background: '#222', color: '#fff', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'row', alignItems: 'stretch' }}>
      {/* Left: Server URL and Tool List */}
      <div style={{ width: 380, minWidth: 320, background: '#181818', borderRight: '1px solid #333', padding: '32px 20px 20px 20px', display: 'flex', flexDirection: 'column', gap: 24, height: '100vh', boxSizing: 'border-box', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
        <div style={{ width: '100%' }}>
          <h2 style={{ textAlign: 'center', marginBottom: 18 }}>MCP Playground (Local)</h2>
          <div style={{ marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontWeight: 500 }}>MCP Server URL:</label>
            <input
              type="text"
              value={mcpUrl}
              onChange={e => setMcpUrl(e.target.value)}
              style={{ width: '100%', fontSize: 15, padding: 7, borderRadius: 4, border: '1px solid #444', background: '#222', color: '#fff' }}
            />
            <button onClick={fetchTools} style={{ marginTop: 6, width: 110, alignSelf: 'flex-start', fontSize: 15, padding: '7px 0', borderRadius: 4, background: '#111', color: '#fff', border: '1px solid #444', cursor: 'pointer' }} disabled={loading}>
              {loading ? 'Loading...' : 'Fetch Tools'}
            </button>
          </div>
          {error && <div style={{ color: 'red', marginBottom: 12, fontWeight: 500 }}>{error}</div>}
        </div>
        {/* Tool List as grid/cards */}
        <div style={{ flex: 1, overflowY: 'auto', marginTop: 0, width: '100%' }}>
          {tools.length > 0 && (
            <div>
              <div style={{ fontWeight: 500, marginBottom: 6 }}>Tools:</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginTop: 0 }}>
                {tools.map((tool: any) => (
                  <div
                    key={tool.name || tool}
                    onClick={() => setSelectedTool(tool.name || tool)}
                    style={{
                      background: selectedTool === (tool.name || tool) ? '#0a5' : '#232323',
                      color: selectedTool === (tool.name || tool) ? '#fff' : '#eee',
                      borderRadius: 6,
                      padding: '10px 12px',
                      cursor: 'pointer',
                      border: selectedTool === (tool.name || tool) ? '2px solid #0a5' : '1px solid #333',
                      boxShadow: selectedTool === (tool.name || tool) ? '0 2px 8px #0a54' : undefined,
                      transition: 'all 0.15s',
                      fontWeight: 500,
                      fontSize: 15,
                      marginBottom: 0,
                    }}
                  >
                    <div>{tool.name || tool}</div>
                    {tool.description && <div style={{ fontSize: 12, color: '#aaa', marginTop: 1 }}>{tool.description}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ marginTop: 24, fontSize: 12, color: '#888', textAlign: 'center', width: '100%' }}>
          <div>• Start your MCP server on <b>http://localhost:8080/mcp</b> if you didn't define a server path on startup.</div>
          <div>• This playground is for local dev testing only.</div>
        </div>
      </div>
      {/* Right: Tool Params and Response */}
      <div style={{ flex: 1, minWidth: 0, padding: '32px 0 20px 40px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', background: '#232323', height: '100vh', boxSizing: 'border-box' }}>
        {selectedTool && (
          <div style={{ width: '100%', maxWidth: 480, background: '#191919', borderRadius: 14, boxShadow: '0 2px 16px #0003', padding: 22, marginBottom: 24, marginTop: 0, alignSelf: 'flex-start', border: '1.5px solid #232323' }}>
            <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 6 }}>{selectedTool}</div>
            <form
              onSubmit={e => {
                e.preventDefault();
                sendTestRequest();
              }}
              style={{ marginBottom: 6 }}
            >
              <div style={{ marginBottom: 4, fontWeight: 500 }}>Tool Params:</div>
              {renderParamFields()}
              <button type="submit" style={{ marginTop: 12, width: 120, fontSize: 15, padding: '8px 0', borderRadius: 4, background: '#0a5', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }} disabled={loading}>
                {loading ? 'Calling...' : 'Call Tool'}
              </button>
            </form>
            {response && (
              <div style={{ marginTop: 14 }}>
                {/* Main result emphasized */}
                {getMainTextResult(response) && (
                  <div style={{
                    background: '#232323',
                    color: '#0fa',
                    fontSize: 22,
                    fontWeight: 700,
                    borderRadius: 8,
                    padding: '12px 10px',
                    textAlign: 'center',
                    marginBottom: 8,
                    boxShadow: '0 2px 8px #0002',
                  }}>
                    {getMainTextResult(response)}
                  </div>
                )}
                {/* Accordion for raw JSON */}
                <div style={{ background: '#222', borderRadius: 8, marginTop: 4, boxShadow: '0 1px 4px #0002', border: '1px solid #333' }}>
                  <button
                    onClick={() => setShowRaw(v => !v)}
                    style={{
                      width: '100%',
                      background: 'none',
                      color: '#0af',
                      border: '1.5px solid #39f',
                      fontWeight: 600,
                      fontSize: 15,
                      padding: '7px 0',
                      cursor: 'pointer',
                      borderRadius: showRaw ? '8px 8px 0 0' : 8,
                      textAlign: 'left',
                      marginBottom: 0,
                    }}
                  >
                    {showRaw ? '▼ Hide Raw JSON' : '▶ Show Raw JSON'}
                  </button>
                  {showRaw && (
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, padding: 12, margin: 0, color: '#fff', background: 'none', borderRadius: '0 0 8px 8px' }}>
                      {typeof response === 'string' ? response : JSON.stringify(response, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
