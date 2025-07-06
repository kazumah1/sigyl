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
          method: selectedTool,
          params: paramValues
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
        <div key={key} style={{ marginBottom: 10 }}>
          <label>
            <b>{key}</b>{' '}
            <span style={{ color: '#aaa', fontSize: 13 }}>{desc}</span>
            {inputType === 'checkbox' ? (
              <input
                type="checkbox"
                checked={!!paramValues[key]}
                onChange={e => handleParamChange(key, e.target.checked)}
                style={{ marginLeft: 8 }}
              />
            ) : (
              <input
                type={inputType}
                value={paramValues[key] ?? ''}
                onChange={e => handleParamChange(key, inputType === 'number' ? Number(e.target.value) : e.target.value)}
                style={{ marginLeft: 8 }}
              />
            )}
          </label>
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
    <div style={{ maxWidth: 600, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h2>MCP Playground (Local)</h2>
      <div style={{ marginBottom: 16 }}>
        <label>
          MCP Server URL:{' '}
          <input
            type="text"
            value={mcpUrl}
            onChange={e => setMcpUrl(e.target.value)}
            style={{ width: 350 }}
          />
        </label>
        <button onClick={fetchTools} style={{ marginLeft: 8 }} disabled={loading}>
          Fetch Tools
        </button>
      </div>
      {tools.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <label>
            Select Tool:{' '}
            <select
              value={selectedTool}
              onChange={e => setSelectedTool(e.target.value)}
            >
              <option value="">-- Select --</option>
              {tools.map((tool: any) => (
                <option key={tool.name || tool} value={tool.name || tool}>
                  {tool.name || tool}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {selectedTool && (
        <form
          onSubmit={e => {
            e.preventDefault();
            sendTestRequest();
          }}
          style={{ marginBottom: 16 }}
        >
          <div style={{ marginBottom: 8, fontWeight: 500 }}>Tool Params:</div>
          {renderParamFields()}
          <button type="submit" style={{ marginTop: 8 }} disabled={loading}>
            Send Test Request
          </button>
        </form>
      )}
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
      {response && (
        <div style={{ background: '#222', color: '#fff', padding: 12, borderRadius: 6, marginTop: 16 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Response:</div>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{typeof response === 'string' ? response : JSON.stringify(response, null, 2)}</pre>
        </div>
      )}
      <div style={{ marginTop: 32, fontSize: 13, color: '#888' }}>
        <div>• Start your MCP server on <b>http://localhost:8080/mcp</b> before using the playground.</div>
        <div>• This playground is for local dev testing only.</div>
      </div>
    </div>
  );
}

export default App;
