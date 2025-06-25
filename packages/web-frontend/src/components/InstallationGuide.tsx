import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Copy, 
  Check, 
  ExternalLink, 
  Download, 
  Code, 
  Terminal,
  FileText,
  Settings
} from 'lucide-react'
import { toast } from 'sonner'

interface InstallationGuideProps {
  packageName: string
  deploymentUrl?: string
  tools?: Array<{
    tool_name?: string
    description?: string
  }>
  onClose: () => void
}

export const InstallationGuide: React.FC<InstallationGuideProps> = ({
  packageName,
  deploymentUrl,
  tools = [],
  onClose
}) => {
  const [copied, setCopied] = useState<string | null>(null)

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      toast.success(`${label} copied to clipboard!`)
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const mcpConfigExample = `{
  "mcpServers": {
    "${packageName}": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-${packageName}"],
      "env": {
        "MCP_SERVER_URL": "${deploymentUrl || 'https://your-deployment-url.com'}"
      }
    }
  }
}`

  const curlExample = `curl -X POST ${deploymentUrl || 'https://your-deployment-url.com'}/health`

  const pythonExample = `import requests

# Test the MCP server
response = requests.get('${deploymentUrl || 'https://your-deployment-url.com'}/health')
print(f"Server status: {response.status_code}")

# Use the MCP server
# Add your implementation here`

  const nodeExample = `const fetch = require('node-fetch');

// Test the MCP server
async function testServer() {
  const response = await fetch('${deploymentUrl || 'https://your-deployment-url.com'}/health');
  console.log('Server status:', response.status);
}

testServer();`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Installation Guide</h2>
              <p className="text-gray-400">How to use {packageName} in your MCP client</p>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
            >
              ×
            </Button>
          </div>
        </div>

        <div className="p-6">
          <Tabs defaultValue="config" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-gray-800 border-gray-700">
              <TabsTrigger value="config" className="text-white data-[state=active]:bg-indigo-600">
                <Settings className="w-4 h-4 mr-2" />
                Config
              </TabsTrigger>
              <TabsTrigger value="test" className="text-white data-[state=active]:bg-indigo-600">
                <Terminal className="w-4 h-4 mr-2" />
                Test
              </TabsTrigger>
              <TabsTrigger value="tools" className="text-white data-[state=active]:bg-indigo-600">
                <Code className="w-4 h-4 mr-2" />
                Tools
              </TabsTrigger>
              <TabsTrigger value="docs" className="text-white data-[state=active]:bg-indigo-600">
                <FileText className="w-4 h-4 mr-2" />
                Docs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="mt-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">MCP Client Configuration</CardTitle>
                  <CardDescription className="text-gray-400">
                    Add this configuration to your MCP client (Claude Desktop, Cursor, etc.)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <pre className="bg-gray-900 p-4 rounded-lg text-sm text-gray-300 overflow-x-auto">
                      <code>{mcpConfigExample}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                      onClick={() => copyToClipboard(mcpConfigExample, 'Configuration')}
                    >
                      {copied === 'Configuration' ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="test" className="mt-6 space-y-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Test with cURL</CardTitle>
                  <CardDescription className="text-gray-400">
                    Test if your MCP server is running correctly
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <pre className="bg-gray-900 p-4 rounded-lg text-sm text-gray-300 overflow-x-auto">
                      <code>{curlExample}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                      onClick={() => copyToClipboard(curlExample, 'cURL command')}
                    >
                      {copied === 'cURL command' ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-4">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Python Example</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <pre className="bg-gray-900 p-4 rounded-lg text-sm text-gray-300 overflow-x-auto">
                        <code>{pythonExample}</code>
                      </pre>
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-2 right-2 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                        onClick={() => copyToClipboard(pythonExample, 'Python code')}
                      >
                        {copied === 'Python code' ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Node.js Example</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <pre className="bg-gray-900 p-4 rounded-lg text-sm text-gray-300 overflow-x-auto">
                        <code>{nodeExample}</code>
                      </pre>
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-2 right-2 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                        onClick={() => copyToClipboard(nodeExample, 'Node.js code')}
                      >
                        {copied === 'Node.js code' ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="tools" className="mt-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Available Tools</CardTitle>
                  <CardDescription className="text-gray-400">
                    Tools provided by this MCP server
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {tools.length > 0 ? (
                    <div className="space-y-4">
                      {tools.map((tool, index) => (
                        <div key={index} className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-white">{tool.tool_name}</h4>
                            <Badge variant="secondary" className="bg-indigo-900/50 text-indigo-300">
                              Tool
                            </Badge>
                          </div>
                          <p className="text-gray-400 text-sm">{tool.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Code className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400">No tools information available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="docs" className="mt-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Documentation & Resources</CardTitle>
                  <CardDescription className="text-gray-400">
                    Learn more about using this MCP server
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-700">
                      <div>
                        <h4 className="font-semibold text-white">MCP Protocol Documentation</h4>
                        <p className="text-gray-400 text-sm">Learn about the Model Context Protocol</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                        onClick={() => window.open('https://modelcontextprotocol.io/', '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Visit
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-700">
                      <div>
                        <h4 className="font-semibold text-white">Claude Desktop Setup</h4>
                        <p className="text-gray-400 text-sm">Configure MCP servers in Claude Desktop</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                        onClick={() => window.open('https://docs.anthropic.com/en/docs/claude-desktop', '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Guide
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-700">
                      <div>
                        <h4 className="font-semibold text-white">Cursor IDE Integration</h4>
                        <p className="text-gray-400 text-sm">Set up MCP servers in Cursor IDE</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                        onClick={() => window.open('https://cursor.sh/docs/mcp', '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Setup
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-6 flex justify-end space-x-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
            >
              Close
            </Button>
            {deploymentUrl && (
              <Button
                onClick={() => window.open(deploymentUrl, '_blank')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Deployment
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 