import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { InteractiveBackground } from "@/components/InteractiveBackground";
import { OpeningAnimation } from "@/components/OpeningAnimation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { UserProfile } from "@/components/UserProfile";
import DeployWizardWithGitHubApp from "@/components/DeployWizardWithGitHubApp";
import { useAuth } from "@/contexts/AuthContext";
import { Rocket, Code, Settings, Zap, Server, Database, Globe, Cpu, Github, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Deploy = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [deploymentType, setDeploymentType] = useState("github");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();

  // Dark theme matching the landing page
  const currentTheme = {
    bg: 'bg-black',
    text: 'text-white',
    accent: 'text-indigo-400',
    card: 'bg-gray-900/50 border-gray-800',
    solid: 'text-indigo-400',
    gradient: 'from-indigo-500 to-pink-500',
    button: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    buttonSecondary: 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
  };

  const templates = [
    {
      id: "openai-server",
      name: "OpenAI MCP Server",
      description: "Ready-to-deploy OpenAI integration with GPT-4 support",
      icon: <Server className="w-8 h-8 text-indigo-400" />,
      difficulty: "Beginner",
      deployTime: "2 min"
    },
    {
      id: "web-scraper",
      name: "Web Scraper Agent",
      description: "Intelligent web scraping with AI-powered extraction",
      icon: <Globe className="w-8 h-8 text-indigo-400" />,
      difficulty: "Intermediate",
      deployTime: "5 min"
    },
    {
      id: "database-connector",
      name: "Database Connector",
      description: "Universal database connectivity for your agents",
      icon: <Database className="w-8 h-8 text-indigo-400" />,
      difficulty: "Advanced",
      deployTime: "8 min"
    },
    {
      id: "custom-framework",
      name: "Custom Framework",
      description: "Build from scratch with our powerful framework",
      icon: <Cpu className="w-8 h-8 text-indigo-400" />,
      difficulty: "Expert",
      deployTime: "15 min"
    }
  ];

  const DeployContent = () => (
    <div className={`min-h-screen ${currentTheme.bg} relative overflow-hidden transition-all duration-700 ease-out`}>
      <InteractiveBackground theme={theme} onThemeChange={setTheme} />
      
      {!isLoaded && <OpeningAnimation variant="page" onComplete={() => setIsLoaded(true)} />}
      
      {/* Header - Matching landing page exactly */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div 
              className="text-2xl font-bold tracking-tight text-white cursor-pointer hover:text-indigo-400 transition-colors"
              onClick={() => navigate('/')}
            >
              SIGYL
            </div>
            <nav className="flex items-center space-x-6">
              <button 
                onClick={() => navigate('/marketplace')}
                className="text-white font-bold tracking-tight hover:text-indigo-400 transition-colors"
              >
                Marketplace
              </button>
              <button 
                onClick={() => navigate('/docs')}
                className="text-white font-bold tracking-tight hover:text-indigo-400 transition-colors"
              >
                Docs
              </button>
              <button 
                onClick={() => navigate('/blog')}
                className="text-white font-bold tracking-tight hover:text-indigo-400 transition-colors"
              >
                Blog
              </button>
              <Button 
                onClick={() => navigate('/deploy')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold tracking-tight"
              >
                Deploy
              </Button>
              <UserProfile />
            </nav>
          </div>
        </div>
      </header>

      <div className={`pt-28 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
        {/* Hero Section */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className={`text-5xl md:text-6xl font-bold ${currentTheme.text} mb-6 animate-fade-in tracking-tight`}>
              Deploy with 
              <span className={`${currentTheme.accent}`}> Precision</span>
            </h1>
            <p className={`text-xl ${currentTheme.text} opacity-70 max-w-2xl mx-auto mb-8 animate-fade-in delay-200`}>
              Strategic deployment of MCP servers. Choose your approach, configure with intelligence, 
              and launch with confidence.
            </p>
            <div className={`flex items-center justify-center space-x-2 ${currentTheme.text} opacity-50 animate-fade-in delay-400`}>
              <Rocket className="w-5 h-5" />
              <span className="font-bold tracking-tight">Average deployment time: 3 minutes</span>
            </div>
            {user && (
              <div className={`flex items-center justify-center space-x-2 ${currentTheme.text} opacity-70 animate-fade-in delay-600 mt-4`}>
                <span className="text-sm">Connected as: {user.user_metadata?.user_name || user.email}</span>
              </div>
            )}
          </div>
        </section>

        {/* Deployment Interface */}
        <section className="px-6 pb-20">
          <div className="max-w-6xl mx-auto">
            <Tabs value={deploymentType} onValueChange={setDeploymentType} className="w-full">
              <TabsList className={`grid w-full grid-cols-4 mb-8 ${currentTheme.card} backdrop-blur-sm border`}>
                <TabsTrigger value="github" className="flex items-center space-x-2 font-bold tracking-tight">
                  <Github className="w-4 h-4" />
                  <span>GitHub</span>
                </TabsTrigger>
                <TabsTrigger value="template" className="flex items-center space-x-2 font-bold tracking-tight">
                  <Zap className="w-4 h-4" />
                  <span>Templates</span>
                </TabsTrigger>
                <TabsTrigger value="config" className="flex items-center space-x-2 font-bold tracking-tight">
                  <Settings className="w-4 h-4" />
                  <span>Configuration</span>
                </TabsTrigger>
                <TabsTrigger value="custom" className="flex items-center space-x-2 font-bold tracking-tight">
                  <Code className="w-4 h-4" />
                  <span>Custom Code</span>
                </TabsTrigger>
              </TabsList>

              {/* GitHub Repository Tab */}
              <TabsContent value="github" className="space-y-6">
                <div className="text-center mb-8 animate-fade-in delay-600">
                  <h2 className={`text-3xl font-bold ${currentTheme.text} mb-4 tracking-tight`}>Deploy from GitHub</h2>
                  <p className={`${currentTheme.text} opacity-70`}>Install the GitHub App for secure, granular repository access</p>
                  <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-400">
                    <Shield className="w-4 h-4" />
                    <span>Secure repository access with GitHub App</span>
                  </div>
                </div>
                
                <DeployWizardWithGitHubApp onDeploy={(deployment) => {
                  console.log('Deploying with GitHub App:', deployment);
                  // TODO: Implement actual deployment logic
                }} />
              </TabsContent>

              {/* Template Selection */}
              <TabsContent value="template" className="space-y-6">
                <div className="text-center mb-8 animate-fade-in delay-600">
                  <h2 className={`text-3xl font-bold ${currentTheme.text} mb-4 tracking-tight`}>Choose Your Strategy</h2>
                  <p className={`${currentTheme.text} opacity-70`}>Select a battle-tested template to deploy your MCP server in minutes</p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {templates.map((template, index) => (
                    <Card 
                      key={template.id}
                      className={`${currentTheme.card} backdrop-blur-sm cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl animate-fade-in ${
                        selectedTemplate === template.id ? `ring-2 ring-indigo-500` : ''
                      }`}
                      onClick={() => setSelectedTemplate(template.id)}
                      style={{ animationDelay: `${800 + index * 150}ms` }}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between mb-2">
                          <div>{template.icon}</div>
                          <div className="flex space-x-2">
                            <Badge variant="secondary" className="bg-indigo-900/50 text-indigo-300 border border-indigo-800 font-bold tracking-tight">{template.difficulty}</Badge>
                            <Badge variant="outline" className="border-gray-700 text-gray-300 font-bold tracking-tight">{template.deployTime}</Badge>
                          </div>
                        </div>
                        <CardTitle className={`text-xl font-bold ${currentTheme.text} tracking-tight`}>{template.name}</CardTitle>
                        <CardDescription className={`${currentTheme.text} opacity-60`}>
                          {template.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {selectedTemplate === template.id && (
                          <div className="space-y-4 pt-4 border-t border-gray-800">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="name" className={`${currentTheme.text} font-bold tracking-tight`}>Server Name</Label>
                                <Input id="name" placeholder="my-mcp-server" className={`${currentTheme.buttonSecondary} border-2 focus:border-indigo-500`} />
                              </div>
                              <div>
                                <Label htmlFor="region" className={`${currentTheme.text} font-bold tracking-tight`}>Region</Label>
                                <Select>
                                  <SelectTrigger className={`${currentTheme.buttonSecondary} border-2 focus:border-indigo-500`}>
                                    <SelectValue placeholder="Select region" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-gray-900 border-gray-800">
                                    <SelectItem value="us-east-1">US East (Virginia)</SelectItem>
                                    <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                                    <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <Button className={`w-full ${currentTheme.button} font-bold tracking-tight transition-all duration-300 hover:scale-105`}>
                              Deploy Server
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Configuration Tab */}
              <TabsContent value="config" className="space-y-6">
                <div className="text-center mb-8 animate-fade-in delay-600">
                  <h2 className={`text-3xl font-bold ${currentTheme.text} mb-4 tracking-tight`}>Advanced Configuration</h2>
                  <p className={`${currentTheme.text} opacity-70`}>Fine-tune your deployment with custom settings</p>
                </div>
                
                <Card className={`${currentTheme.card} backdrop-blur-sm`}>
                  <CardHeader>
                    <CardTitle className={`text-2xl font-bold ${currentTheme.text} tracking-tight`}>Server Configuration</CardTitle>
                    <CardDescription className={`${currentTheme.text} opacity-60`}>
                      Configure your MCP server settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="server-name" className={`${currentTheme.text} font-bold tracking-tight`}>Server Name</Label>
                        <Input id="server-name" placeholder="my-mcp-server" className={`${currentTheme.buttonSecondary} border-2 focus:border-indigo-500`} />
                      </div>
                      <div>
                        <Label htmlFor="version" className={`${currentTheme.text} font-bold tracking-tight`}>MCP Version</Label>
                        <Select>
                          <SelectTrigger className={`${currentTheme.buttonSecondary} border-2 focus:border-indigo-500`}>
                            <SelectValue placeholder="Select version" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-gray-800">
                            <SelectItem value="1.0">MCP 1.0</SelectItem>
                            <SelectItem value="1.1">MCP 1.1</SelectItem>
                            <SelectItem value="2.0">MCP 2.0</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="description" className={`${currentTheme.text} font-bold tracking-tight`}>Description</Label>
                      <Textarea 
                        id="description" 
                        placeholder="Describe your MCP server..." 
                        className={`${currentTheme.buttonSecondary} border-2 focus:border-indigo-500 min-h-[100px]`}
                      />
                    </div>
                    
                    <Button className={`w-full ${currentTheme.button} font-bold tracking-tight transition-all duration-300 hover:scale-105`}>
                      Deploy Configuration
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Custom Code Tab */}
              <TabsContent value="custom" className="space-y-6">
                <div className="text-center mb-8 animate-fade-in delay-600">
                  <h2 className={`text-3xl font-bold ${currentTheme.text} mb-4 tracking-tight`}>Custom Implementation</h2>
                  <p className={`${currentTheme.text} opacity-70`}>Write your own MCP server from scratch</p>
                </div>
                
                <Card className={`${currentTheme.card} backdrop-blur-sm`}>
                  <CardHeader>
                    <CardTitle className={`text-2xl font-bold ${currentTheme.text} tracking-tight`}>Code Editor</CardTitle>
                    <CardDescription className={`${currentTheme.text} opacity-60`}>
                      Write your MCP server implementation
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label htmlFor="code" className={`${currentTheme.text} font-bold tracking-tight`}>Server Code</Label>
                      <Textarea 
                        id="code" 
                        placeholder={`// Your MCP server implementation
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

const server = new Server({
  name: 'my-custom-server',
  version: '1.0.0'
});

// Add your tools and resources here
server.setRequestHandler('tools/list', async () => {
  return { tools: [] };
});

server.listen();`}
                        className={`${currentTheme.buttonSecondary} border-2 focus:border-indigo-500 min-h-[300px] font-mono text-sm`}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="package-json" className={`${currentTheme.text} font-bold tracking-tight`}>Package.json</Label>
                        <Textarea 
                          id="package-json" 
                          placeholder={`{
  "name": "my-mcp-server",
  "version": "1.0.0",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  }
}`}
                          className={`${currentTheme.buttonSecondary} border-2 focus:border-indigo-500 min-h-[150px] font-mono text-sm`}
                        />
                      </div>
                      <div>
                        <Label htmlFor="env" className={`${currentTheme.text} font-bold tracking-tight`}>Environment Variables</Label>
                        <Textarea 
                          id="env" 
                          placeholder={`API_KEY=your_api_key_here
DATABASE_URL=your_database_url
DEBUG=true`}
                          className={`${currentTheme.buttonSecondary} border-2 focus:border-indigo-500 min-h-[150px] font-mono text-sm`}
                        />
                      </div>
                    </div>
                    
                    <Button className={`w-full ${currentTheme.button} font-bold tracking-tight transition-all duration-300 hover:scale-105`}>
                      Deploy Custom Server
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </div>
    </div>
  );

  return (
    <ProtectedRoute>
      <DeployContent />
    </ProtectedRoute>
  );
};

export default Deploy;