#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { deployRepo, DeploymentRequest } from '../services/deployer';

// Load environment variables
dotenv.config();

interface TestDeployResult {
  success: boolean;
  packageId?: string;
  deploymentUrl?: string;
  serviceName?: string;
  error?: string;
  securityReport?: any;
}

class SingleMCPTestDeployer {
  
  /**
   * Test deploying a single MCP using the same logic as the frontend
   */
  async testDeployMCP(repoName: string, branch: string = 'main'): Promise<TestDeployResult> {
    console.log(`🚀 Testing deployment of ${repoName}...`);
    
    try {
      // Check environment
      if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
        throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is required');
      }
      
      // Prepare deployment request (same as frontend calls)
      const repoUrl = `https://github.com/sigyl-dev/${repoName}`;
      const deploymentRequest: DeploymentRequest = {
        repoUrl,
        repoName: `sigyl-dev/${repoName}`,
        branch,
        env: { 
          PORT: '8080',
          NODE_ENV: 'production',
          MCP_TRANSPORT: 'http'
        },
        userId: process.env.TEST_USER_ID || undefined,
        githubToken: process.env.GITHUB_TOKEN || undefined
      };

      console.log('📋 Deployment request:', {
        repoUrl: deploymentRequest.repoUrl,
        repoName: deploymentRequest.repoName,
        branch: deploymentRequest.branch,
        hasGitHubToken: !!deploymentRequest.githubToken
      });

      // Deploy using the same deployer service the API uses
      const deploymentResult = await deployRepo(deploymentRequest);

      if (!deploymentResult.success) {
        console.error('❌ Deployment failed:', deploymentResult.error);
        
        if (deploymentResult.securityReport) {
          console.log('🔒 Security report:', JSON.stringify(deploymentResult.securityReport, null, 2));
        }
        
        return {
          success: false,
          error: deploymentResult.error,
          securityReport: deploymentResult.securityReport
        };
      }

      console.log('✅ Deployment successful!');
      console.log('📦 Package ID:', deploymentResult.packageId);
      console.log('🌐 Deployment URL:', deploymentResult.deploymentUrl);
      console.log('⚙️ Service Name:', deploymentResult.serviceName);

      // Test the deployed MCP endpoint
      if (deploymentResult.deploymentUrl) {
        await this.testMCPEndpoint(deploymentResult.deploymentUrl);
      }

      return {
        success: true,
        packageId: deploymentResult.packageId,
        deploymentUrl: deploymentResult.deploymentUrl,
        serviceName: deploymentResult.serviceName,
        securityReport: deploymentResult.securityReport
      };

    } catch (error) {
      console.error('❌ Test deployment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test the deployed MCP endpoint
   */
  async testMCPEndpoint(deploymentUrl: string): Promise<void> {
    console.log('\n🔍 Testing MCP endpoint...');
    
    try {
      // Test health endpoint
      console.log('Testing GET /mcp (health check)...');
      const healthResponse = await fetch(`${deploymentUrl}/mcp`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      console.log(`Health check status: ${healthResponse.status}`);
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.text();
        console.log('Health response:', healthData);
      }

      // Test MCP tools list
      console.log('\nTesting POST /mcp (tools list)...');
      const toolsResponse = await fetch(`${deploymentUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {}
        })
      });

      console.log(`Tools list status: ${toolsResponse.status}`);
      
      if (toolsResponse.ok) {
        const toolsData = await toolsResponse.text();
        console.log('Tools response:', toolsData);
        
        // Try to parse as JSON
        try {
          const parsed = JSON.parse(toolsData);
          if (parsed.result && parsed.result.tools) {
            console.log(`✅ Found ${parsed.result.tools.length} tools:`, parsed.result.tools.map((t: any) => t.name));
          }
        } catch (parseError) {
          console.log('Response is not JSON, might be event-stream format');
        }
      }

    } catch (error) {
      console.error('❌ MCP endpoint test failed:', error);
    }
  }

  /**
   * Show available MCPs to test
   */
  showAvailableMCPs(): void {
    console.log('\n📋 Available MCPs for testing:');
    console.log('  - weather (simple, no API keys required)');
    console.log('  - github-mcp (requires GitHub token)');
    console.log('  - slack (requires Slack token)');
    console.log('  - notion (requires Notion API key)');
    console.log('  - Sequential-Thinking (simple)');
    console.log('\nRecommended for testing: weather');
  }
}

async function main() {
  const mcpName = process.argv[2];
  const branch = process.argv[3] || 'main';
  
  if (!mcpName) {
    console.error('❌ Please provide an MCP name to test');
    console.error('Usage: npx tsx src/scripts/testSingleMCPDeploy.ts <mcp-name> [branch]');
    console.error('Example: npx tsx src/scripts/testSingleMCPDeploy.ts weather main');
    
    const deployer = new SingleMCPTestDeployer();
    deployer.showAvailableMCPs();
    process.exit(1);
  }

  console.log('🎯 Single MCP Test Deployment');
  console.log('==============================\n');

  const deployer = new SingleMCPTestDeployer();
  const result = await deployer.testDeployMCP(mcpName, branch);

  if (result.success) {
    console.log('\n🎉 Test deployment completed successfully!');
    console.log(`📦 Package ID: ${result.packageId}`);
    console.log(`🌐 Deployment URL: ${result.deploymentUrl}`);
    console.log(`⚙️ Service Name: ${result.serviceName}`);
    
    if (result.securityReport) {
      console.log('\n🔒 Security Report:');
      console.log(`   Security Score: ${result.securityReport.securityScore}`);
      console.log(`   Vulnerabilities: ${result.securityReport.summary?.totalVulnerabilities || 0}`);
    }
  } else {
    console.log('\n❌ Test deployment failed!');
    console.log(`Error: ${result.error}`);
    process.exit(1);
  }
}

// Export for testing
export { SingleMCPTestDeployer };

// Run if called directly
if (require.main === module) {
  main();
} 