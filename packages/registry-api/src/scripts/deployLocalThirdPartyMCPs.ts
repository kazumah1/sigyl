#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';
import yaml from 'js-yaml';

// Load environment variables
dotenv.config();

// Set minimal required environment variables if missing
if (!process.env.SUPABASE_URL) {
  process.env.SUPABASE_URL = 'https://placeholder.supabase.co';
}
if (!process.env.SUPABASE_ANON_KEY) {
  process.env.SUPABASE_ANON_KEY = 'placeholder';
}

import { deployRepo, DeploymentRequest } from '../services/deployer';

interface LocalMCPDeployResult {
  mcpName: string;
  success: boolean;
  packageId?: string;
  deploymentUrl?: string;
  serviceName?: string;
  error?: string;
  securityReport?: any;
  sigylConfig?: any;
}

interface LocalMCPDeploymentSummary {
  total: number;
  successful: number;
  failed: number;
  results: LocalMCPDeployResult[];
}

class LocalThirdPartyMCPDeployer {
  private thirdPartyMcpsPath: string;

  constructor(thirdPartyMcpsPath: string = 'third-party-mcps') {
    // Find the project root by looking for package.json
    let currentDir = __dirname;
    while (currentDir !== path.dirname(currentDir)) {
      try {
        const packagePath = path.join(currentDir, 'package.json');
        if (require('fs').existsSync(packagePath)) {
          const packageContent = require('fs').readFileSync(packagePath, 'utf-8');
          const packageData = JSON.parse(packageContent);
          // Check if this is the main project (has workspaces or is named fuck-smithery)
          if (packageData.workspaces || packageData.name === 'fuck-smithery') {
            this.thirdPartyMcpsPath = path.resolve(currentDir, thirdPartyMcpsPath);
            return;
          }
        }
      } catch (error) {
        // Continue searching
      }
      currentDir = path.dirname(currentDir);
    }
    
    // Fallback: assume current working directory
    this.thirdPartyMcpsPath = path.resolve(process.cwd(), thirdPartyMcpsPath);
  }

  /**
   * Discover ready third-party MCPs in the local directory
   */
  async discoverReadyMCPs(): Promise<string[]> {
    console.log('\n📊 Discovering ready third-party MCPs...\n');
    
    const readyMCPs: string[] = [];
    
    try {
      const entries = await fs.readdir(this.thirdPartyMcpsPath);
      
      for (const entry of entries) {
        if (entry.startsWith('_')) continue; // Skip _templates
        
        const mcpPath = path.join(this.thirdPartyMcpsPath, entry);
        const stats = await fs.stat(mcpPath);
        
        if (!stats.isDirectory()) continue;
        
        // Check if it has a sigyl.yaml file
        try {
          const sigylPath = path.join(mcpPath, 'sigyl.yaml');
          await fs.access(sigylPath);
          
          // Read and validate the sigyl.yaml
          const sigylContent = await fs.readFile(sigylPath, 'utf-8');
          const sigylConfig = yaml.load(sigylContent);
          
          console.log(`✅ Found ready MCP: ${entry}`);
          readyMCPs.push(entry);
        } catch {
          console.log(`⚠️ Skipping ${entry}: No valid sigyl.yaml found`);
        }
      }
    } catch (error) {
      console.error('❌ Error discovering MCPs:', error);
    }
    
    console.log(`\n📈 Discovery complete! Found ${readyMCPs.length} ready MCPs\n`);
    return readyMCPs;
  }

  /**
   * Deploy a single third-party MCP using local configuration
   */
  async deployLocalMCP(mcpName: string, branch: string = 'main'): Promise<LocalMCPDeployResult> {
    console.log(`🚀 Deploying ${mcpName}...`);
    
    try {
      const mcpPath = path.join(this.thirdPartyMcpsPath, mcpName);
      const sigylPath = path.join(mcpPath, 'sigyl.yaml');
      
      // Read sigyl.yaml configuration
      const sigylContent = await fs.readFile(sigylPath, 'utf-8');
      const sigylConfig = yaml.load(sigylContent);
      
      console.log(`   📋 Loaded local sigyl.yaml configuration`);
      
      // Create temporary sigyl.yaml file for the deployment
      const tempConfigPath = path.join('/tmp', `${mcpName}-sigyl.yaml`);
      await fs.writeFile(tempConfigPath, sigylContent);
      
      // Set environment variable to use local config
      process.env.LOCAL_SIGYL_CONFIG_PATH = tempConfigPath;
      
      // Prepare deployment request that simulates a GitHub repo
      const repoUrl = `https://github.com/sigyl-dev/${mcpName}`;
      const deploymentRequest: DeploymentRequest = {
        repoUrl,
        repoName: `sigyl-dev/${mcpName}`,
        branch,
        env: { 
          PORT: '8080',
          NODE_ENV: 'production',
          MCP_TRANSPORT: 'http'
        },
        userId: process.env.TEST_USER_ID || undefined,
        githubToken: process.env.GITHUB_TOKEN || undefined
      };

      console.log(`   📦 Deploying with local configuration...`);
      
      // Deploy using the same deployer service the API uses
      const deploymentResult = await deployRepo(deploymentRequest);
      
      // Clean up temporary file
      try {
        await fs.unlink(tempConfigPath);
        delete process.env.LOCAL_SIGYL_CONFIG_PATH;
      } catch (cleanupError) {
        console.warn(`   ⚠️ Failed to clean up temp file: ${tempConfigPath}`);
      }

      if (!deploymentResult.success) {
        console.error(`❌ ${mcpName} deployment failed:`, deploymentResult.error);
        
        return {
          mcpName,
          success: false,
          error: deploymentResult.error,
          securityReport: deploymentResult.securityReport,
          sigylConfig
        };
      }

      console.log(`✅ ${mcpName} deployed successfully!`);
      console.log(`   📦 Package ID: ${deploymentResult.packageId}`);
      console.log(`   🌐 Deployment URL: ${deploymentResult.deploymentUrl}`);

      // Test the endpoint quickly
      if (deploymentResult.deploymentUrl) {
        const testResult = await this.quickHealthCheck(deploymentResult.deploymentUrl);
        console.log(`   🔍 Health check: ${testResult ? '✅ Healthy' : '⚠️ Unhealthy'}`);
      }

      return {
        mcpName,
        success: true,
        packageId: deploymentResult.packageId,
        deploymentUrl: deploymentResult.deploymentUrl,
        serviceName: deploymentResult.serviceName,
        securityReport: deploymentResult.securityReport,
        sigylConfig
      };

    } catch (error) {
      console.error(`❌ ${mcpName} deployment error:`, error);
      
      // Clean up on error
      try {
        const tempConfigPath = path.join('/tmp', `${mcpName}-sigyl.yaml`);
        await fs.unlink(tempConfigPath);
        delete process.env.LOCAL_SIGYL_CONFIG_PATH;
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      return {
        mcpName,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Quick health check for deployed MCP
   */
  async quickHealthCheck(deploymentUrl: string): Promise<boolean> {
    try {
      const response = await fetch(`${deploymentUrl}/mcp`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Deploy all discovered third-party MCPs
   */
  async deployAll(mcps: string[] = []): Promise<LocalMCPDeploymentSummary> {
    console.log('🎯 Starting local third-party MCP deployment...\n');

    // Auto-discover if no MCPs specified
    const mcpsToDeploy = mcps.length > 0 ? mcps : await this.discoverReadyMCPs();
    
    if (mcpsToDeploy.length === 0) {
      console.log('❌ No MCPs found to deploy');
      return { total: 0, successful: 0, failed: 0, results: [] };
    }

    console.log('🚀 Starting deployments...\n');
    const results: LocalMCPDeployResult[] = [];

    for (const mcpName of mcpsToDeploy) {
      const result = await this.deployLocalMCP(mcpName);
      results.push(result);
      
      // Add a small delay between deployments to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log(''); // Add spacing
    }

    // Generate summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    const summary: LocalMCPDeploymentSummary = {
      total: results.length,
      successful,
      failed,
      results
    };

    this.printSummary(summary);
    return summary;
  }

  /**
   * Print deployment summary
   */
  printSummary(summary: LocalMCPDeploymentSummary): void {
    console.log('\n📊 Local Third-Party MCP Deployment Summary');
    console.log('===========================================');
    console.log(`   Total MCPs: ${summary.total}`);
    console.log(`   ✅ Successful: ${summary.successful}`);
    console.log(`   ❌ Failed: ${summary.failed}`);

    if (summary.failed > 0) {
      console.log('\n❌ Failed deployments:');
      summary.results.filter(r => !r.success).forEach(r => {
        console.log(`   - ${r.mcpName}: ${r.error}`);
      });
    }

    if (summary.successful > 0) {
      console.log('\n✅ Successful deployments:');
      summary.results.filter(r => r.success).forEach(r => {
        console.log(`   - ${r.mcpName}: ${r.deploymentUrl}`);
      });
    }

    // Security report summary
    const securityIssues = summary.results.filter(r => 
      r.securityReport && 
      r.securityReport.summary && 
      r.securityReport.summary.totalVulnerabilities > 0
    );

    if (securityIssues.length > 0) {
      console.log('\n🔒 Security Issues Detected:');
      securityIssues.forEach(r => {
        const report = r.securityReport;
        console.log(`   - ${r.mcpName}: ${report.summary.totalVulnerabilities} issues (Score: ${report.securityScore})`);
      });
    }
  }

  /**
   * Save deployment report to file
   */
  async saveReport(summary: LocalMCPDeploymentSummary): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(process.cwd(), `local-mcp-deployment-report-${timestamp}.json`);
    
    await fs.writeFile(reportPath, JSON.stringify(summary, null, 2));
    console.log(`\n📄 Deployment report saved to: ${reportPath}`);
  }

  /**
   * Check environment setup
   */
  checkEnvironment(): boolean {
    const required = [
      'GOOGLE_CLOUD_PROJECT_ID',
    ];

    const optional = [
      'GITHUB_TOKEN',
      'TEST_USER_ID',
      'GOOGLE_APPLICATION_CREDENTIALS'
    ];

    console.log('🔍 Checking environment setup...\n');

    let allGood = true;
    
    for (const envVar of required) {
      if (process.env[envVar]) {
        console.log(`✅ ${envVar}: Set`);
      } else {
        console.log(`❌ ${envVar}: Missing (REQUIRED)`);
        allGood = false;
      }
    }

    for (const envVar of optional) {
      if (process.env[envVar]) {
        console.log(`✅ ${envVar}: Set`);
      } else {
        console.log(`⚠️ ${envVar}: Not set (optional)`);
      }
    }

    console.log('');
    return allGood;
  }

  /**
   * Show available MCPs to deploy
   */
  async showAvailableMCPs(): Promise<void> {
    console.log('\n📋 Available third-party MCPs:');
    
    try {
      const mcps = await this.discoverReadyMCPs();
      
      if (mcps.length === 0) {
        console.log('   No MCPs found with valid sigyl.yaml configurations');
        return;
      }
      
      for (const mcpName of mcps) {
        const mcpPath = path.join(this.thirdPartyMcpsPath, mcpName);
        const sigylPath = path.join(mcpPath, 'sigyl.yaml');
        
        try {
          const sigylContent = await fs.readFile(sigylPath, 'utf-8');
          const sigylConfig = yaml.load(sigylContent) as any;
          
          const runtime = sigylConfig?.runtime || 'unknown';
          const language = sigylConfig?.language || 'unknown';
          const hasConfigSchema = !!(sigylConfig?.startCommand?.configSchema);
          
          console.log(`   - ${mcpName} (${runtime}/${language}) ${hasConfigSchema ? '🔑 Requires secrets' : '🔓 No secrets'}`);
        } catch {
          console.log(`   - ${mcpName} (unknown config)`);
        }
      }
      
      console.log('\nRecommended for testing: weather, Sequential-Thinking');
    } catch (error) {
      console.error('❌ Error listing MCPs:', error);
    }
  }
}

async function main() {
  const mcpName = process.argv[2];
  const branch = process.argv[3] || 'main';
  
  console.log('🎯 Local Third-Party MCP Deployment');
  console.log('===================================\n');

  const deployer = new LocalThirdPartyMCPDeployer();
  
  // Check environment
  if (!deployer.checkEnvironment()) {
    console.error('❌ Environment setup incomplete. Please check required environment variables.');
    process.exit(1);
  }

  if (mcpName === '--list' || mcpName === '-l') {
    await deployer.showAvailableMCPs();
    return;
  }

  if (!mcpName) {
    console.error('❌ Please provide an MCP name to deploy, or use --list to see available MCPs');
    console.error('Usage: npx tsx src/scripts/deployLocalThirdPartyMCPs.ts <mcp-name> [branch]');
    console.error('       npx tsx src/scripts/deployLocalThirdPartyMCPs.ts --list');
    console.error('       npx tsx src/scripts/deployLocalThirdPartyMCPs.ts --all');
    console.error('');
    console.error('Examples:');
    console.error('  npx tsx src/scripts/deployLocalThirdPartyMCPs.ts weather');
    console.error('  npx tsx src/scripts/deployLocalThirdPartyMCPs.ts --all');
    
    await deployer.showAvailableMCPs();
    process.exit(1);
  }

  try {
    if (mcpName === '--all') {
      // Deploy only our 7 successfully adapted MCPs
      const adaptedMCPs = [
        'perplexity',
        'Brave-Search', 
        'Exa-Search',
        'slack',
        'notion',
        'github-mcp',
        'google-maps',
        'Sequential-Thinking'
      ];
      
      console.log('🎯 Deploying only the 7 successfully adapted MCPs...\n');
      console.log('📋 MCPs to deploy:', adaptedMCPs.join(', '));
      console.log('');
      
      const summary = await deployer.deployAll(adaptedMCPs);
      await deployer.saveReport(summary);
      
      console.log('\n🎉 Bulk deployment process completed!');
      
      // Exit with error code if any deployments failed
      if (summary.failed > 0) {
        process.exit(1);
      }
    } else {
      // Deploy single MCP
      const result = await deployer.deployLocalMCP(mcpName, branch);
      
      if (result.success) {
        console.log('\n🎉 Single MCP deployment completed successfully!');
        console.log(`📦 Package ID: ${result.packageId}`);
        console.log(`🌐 Deployment URL: ${result.deploymentUrl}`);
        console.log(`⚙️ Service Name: ${result.serviceName}`);
        
        if (result.securityReport) {
          console.log('\n🔒 Security Report:');
          console.log(`   Security Score: ${result.securityReport.securityScore}`);
          console.log(`   Vulnerabilities: ${result.securityReport.summary?.totalVulnerabilities || 0}`);
        }
      } else {
        console.log('\n❌ MCP deployment failed!');
        console.log(`Error: ${result.error}`);
        process.exit(1);
      }
    }
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Export for testing
export { LocalThirdPartyMCPDeployer };

// Run if called directly
if (require.main === module) {
  main();
} 