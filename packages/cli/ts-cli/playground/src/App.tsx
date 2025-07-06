import React, { useState } from 'react';

const DEFAULT_MCP_URL = 'http://localhost:8080/mcp';

function App() {
  const [mcpUrl, setMcpUrl] = useState(DEFAULT_MCP_URL);
  const [tools, setTools] = useState<any[]>([]);
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [params, setParams] = useState<string>('{}');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch tool list from MCP server (JSON-RPC 2.0)
  const fetchTools = async () => {
    setError(null);
    setLoading(true);
    setTools([]);
    setSelectedTool('');
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
          method: 'tools/list',
          params: {}
        }),
      });
      const data = await res.json();
      if (data.result && Array.isArray(data.result.tools)) {
        setTools(data.result.tools);
      } else {
        setError('No tools found or invalid response.');
      }
    } catch (e: any) {
      setError('Failed to fetch tools: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Send test request to selected tool (JSON-RPC 2.0)
  const sendTestRequest = async () => {
    setError(null);
    setLoading(true);
    setResponse(null);
    let parsedParams = {};
    try {
      parsedParams = params ? JSON.parse(params) : {};
    } catch (e) {
      setError('Params must be valid JSON.');
      setLoading(false);
      return;
    }
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
          params: parsedParams
        }),
      });
      const data = await res.json();
      setResponse(data);
    } catch (e: any) {
      setError('Failed to send request: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

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
        <div style={{ marginBottom: 16 }}>
          <label>
            Tool Params (JSON):
            <textarea
              rows={4}
              style={{ width: '100%', fontFamily: 'monospace' }}
              value={params}
              onChange={e => setParams(e.target.value)}
            />
          </label>
          <button onClick={sendTestRequest} style={{ marginTop: 8 }} disabled={loading}>
            Send Test Request
          </button>
        </div>
      )}
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
      {response && (
        <div style={{ background: '#222', color: '#fff', padding: 12, borderRadius: 6, marginTop: 16 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Response:</div>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(response, null, 2)}</pre>
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
