/**
 * Example: Deploy MCP Server to Railway with Security Validation
 * 
 * This example shows how to use the RailwayService to deploy an MCP server
 * with built-in security validation and MCP-specific configuration.
 */

const { RailwayService, generateMCPDockerfile, generateRailwayConfig } = require('../dist/railway/railwayService');

async function deployMCPToRailway() {
  console.log('🚀 MCP Railway Deployment Example');
  console.log('==================================');

  // 1. Configure Railway service
  const railwayConfig = {
    apiToken: process.env.RAILWAY_API_TOKEN || 'demo-token',
    apiUrl: 'https://backboard.railway.app/graphql/v2'
  };

  const railwayService = new RailwayService(railwayConfig);

  // 2. Define MCP deployment request
  const deploymentRequest = {
    repoUrl: 'https://github.com/example/mcp-weather-server',
    repoName: 'example/mcp-weather-server',
    branch: 'main',
    environmentVariables: {
      API_KEY: 'weather-api-key',
      DEBUG: 'false',
      LOG_LEVEL: 'info'
    }
  };

  try {
    console.log('🔍 Starting deployment with security validation...');
    
    // 3. Deploy MCP server (includes security validation)
    const result = await railwayService.deployMCPServer(deploymentRequest);

    if (result.success) {
      console.log('✅ Deployment successful!');
      console.log(`🌐 Deployment URL: ${result.deploymentUrl}`);
      console.log(`🔗 MCP Endpoint: ${result.deploymentUrl}/mcp`);
      console.log(`🆔 Service ID: ${result.serviceId}`);
      
      if (result.securityReport) {
        console.log(`🔒 Security Score: ${result.securityReport.securityScore.toUpperCase()}`);
        console.log(`📊 Vulnerabilities: ${result.securityReport.summary.totalVulnerabilities}`);
      }

      // 4. Check health
      console.log('\n🏥 Checking MCP server health...');
      const health = await railwayService.checkMCPHealth(result.deploymentUrl);
      console.log(`💓 Health Status: ${health.toUpperCase()}`);

      // 5. Get deployment logs
      if (result.serviceId) {
        console.log('\n📋 Recent deployment logs:');
        const logs = await railwayService.getDeploymentLogs(result.serviceId, 10);
        logs.forEach(log => console.log(`  ${log}`));
      }

    } else {
      console.error('❌ Deployment failed:', result.error);
      
      if (result.securityReport) {
        console.log('\n🔒 Security Issues Found:');
        console.log(`Security Score: ${result.securityReport.securityScore}`);
        console.log(`Blockers: ${result.securityReport.summary.blockers}`);
        console.log(`Errors: ${result.securityReport.summary.errors}`);
        console.log(`Warnings: ${result.securityReport.summary.warnings}`);
        
        if (result.securityReport.recommendations.length > 0) {
          console.log('\n💡 Recommendations:');
          result.securityReport.recommendations.forEach(rec => 
            console.log(`  • ${rec}`)
          );
        }
      }
    }

  } catch (error) {
    console.error('💥 Deployment error:', error.message);
  }
}

// Example: Generate MCP-specific files
function generateMCPFiles() {
  console.log('\n📁 Generating MCP deployment files...');
  
  // Generate Dockerfile
  const dockerfile = generateMCPDockerfile();
  console.log('✅ Generated MCP Dockerfile:');
  console.log('   - Security: Non-root user');
  console.log('   - MCP Transport: HTTP');
  console.log('   - Health Check: /mcp endpoint');
  console.log('   - Environment: Production ready');

  // Generate Railway configuration
  const railwayConfig = generateRailwayConfig('npm start -- --port $PORT --transport http');
  console.log('✅ Generated Railway configuration:');
  console.log('   - Builder: Dockerfile');
  console.log('   - Health Check: /mcp');
  console.log('   - Restart Policy: On failure');
  console.log('   - Start Command: MCP HTTP transport');

  return { dockerfile, railwayConfig };
}

// Run example if called directly
if (require.main === module) {
  console.log('🎯 MCP Railway Deployment Example');
  console.log('This example demonstrates secure MCP deployment to Railway');
  console.log('');
  
  // Generate files first
  generateMCPFiles();
  
  // Check if Railway token is available
  if (process.env.RAILWAY_API_TOKEN && process.env.RAILWAY_API_TOKEN !== 'demo-token') {
    console.log('\n🚀 Railway token detected, attempting real deployment...');
    deployMCPToRailway().catch(console.error);
  } else {
    console.log('\n🧪 No Railway token provided, skipping actual deployment');
    console.log('To test real deployment, set RAILWAY_API_TOKEN environment variable');
    console.log('');
    console.log('Example usage:');
    console.log('  export RAILWAY_API_TOKEN=your-railway-token');
    console.log('  node examples/railway-deployment.js');
  }
}

module.exports = {
  deployMCPToRailway,
  generateMCPFiles
}; 