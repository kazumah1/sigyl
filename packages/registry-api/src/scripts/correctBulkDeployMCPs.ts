#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';
import { deployRepo, DeploymentRequest } from '../services/deployer';

// Load environment variables
dotenv.config();

interface BulkDeployResult {
  mcpName: string;
  success: boolean;
  packageId?: string;
  deploymentUrl?: string;
  serviceName?: string;
  error?: string;
  securityReport?: any;
}

interface BulkDeploymentSummary {
  total: number;
  successful: number;
  failed: number;
  results: BulkDeployResult[];
}

class CorrectBulkMCPDeployer {
  private mcpsPath: string;

  constructor(mcpsPath: string = 'third-party-mcps') {
    this.mcpsPath = mcpsPath;
  }

  /**
   * Discover MCPs that are ready for deployment
   */
  async discoverReadyMCPs(): Promise<string[]> {
    console.log('\n📊 Discovering ready MCPs...\n');
    
    const readyMCPs: string[] = [];
    
    try {
      const entries = await fs.readdir(this.mcpsPath);
      
      for (const entry of entries) {
        if (entry.startsWith('_')) continue; // Skip _templates
        
        const mcpPath = path.join(this.mcpsPath, entry);
        const stats = await fs.stat(mcpPath);
        
        if (!stats.isDirectory()) continue;
        
        // Check if it has a sigyl.yaml file
        try {
          const sigylPath = path.join(mcpPath, 'sigyl.yaml');
          await fs.access(sigylPath);
          
          console.log(`✅ Found ready MCP: ${entry}`);
          readyMCPs.push(entry);
        } catch {
          console.log(`⚠️ Skipping ${entry}: No sigyl.yaml found`);
        }
      }
    } catch (error) {
      console.error('❌ Error discovering MCPs:', error);
    }
    
    console.log(`\n📈 Discovery complete! Found ${readyMCPs.length} ready MCPs\n`);
    return readyMCPs;
  }

  /**
   * Deploy a single MCP using the correct deployment logic
   */
  async deployMCP(mcpName: string, branch: string = 'main'): Promise<BulkDeployResult> {
    console.log(`🚀 Deploying ${mcpName}...`);
    
    try {
      // Prepare deployment request (same as frontend calls)
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

      // Deploy using the same deployer service the API uses
      const deploymentResult = await deployRepo(deploymentRequest);

      if (!deploymentResult.success) {
        console.error(`❌ ${mcpName} deployment failed:`, deploymentResult.error);
        
        return {
          mcpName,
          success: false,
          error: deploymentResult.error,
          securityReport: deploymentResult.securityReport
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
        securityReport: deploymentResult.securityReport
      };

    } catch (error) {
      console.error(`❌ ${mcpName} deployment error:`, error);
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
   * Deploy all discovered MCPs
   */
  async deployAll(mcps: string[] = []): Promise<BulkDeploymentSummary> {
    console.log('🎯 Starting bulk MCP deployment...\n');

    // Auto-discover if no MCPs specified
    const mcpsToDeploy = mcps.length > 0 ? mcps : await this.discoverReadyMCPs();
    
    if (mcpsToDeploy.length === 0) {
      console.log('❌ No MCPs found to deploy');
      return { total: 0, successful: 0, failed: 0, results: [] };
    }

    console.log('🚀 Starting deployments...\n');
    const results: BulkDeployResult[] = [];

    for (const mcpName of mcpsToDeploy) {
      const result = await this.deployMCP(mcpName);
      results.push(result);
      
      // Add a small delay between deployments to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log(''); // Add spacing
    }

    // Generate summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    const summary: BulkDeploymentSummary = {
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
  printSummary(summary: BulkDeploymentSummary): void {
    console.log('\n📊 Bulk Deployment Summary');
    console.log('==========================');
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
        console.log(`   - ${r.mcpName}: ${report.summary.totalVulnerabilities} issues (${report.securityScore})`);
      });
    }
  }

  /**
   * Save deployment report to file
   */
  async saveReport(summary: BulkDeploymentSummary): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(process.cwd(), `bulk-deployment-report-${timestamp}.json`);
    
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
}

async function main() {
  console.log('🎯 Corrected Bulk MCP Deployment');
  console.log('================================\n');

  const deployer = new CorrectBulkMCPDeployer();
  
  // Check environment
  if (!deployer.checkEnvironment()) {
    console.error('❌ Environment setup incomplete. Please check required environment variables.');
    process.exit(1);
  }

  // Parse command line arguments
  const args = process.argv.slice(2);
  const mcpsToDeployArg = args.length > 0 ? args : [];

  try {
    // Deploy MCPs
    const summary = await deployer.deployAll(mcpsToDeployArg);
    
    // Save report
    await deployer.saveReport(summary);
    
    console.log('\n🎉 Bulk deployment process completed!');
    
    // Exit with error code if any deployments failed
    if (summary.failed > 0) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Bulk deployment failed:', error);
    process.exit(1);
  }
}

// Export for testing
export { CorrectBulkMCPDeployer };

// Run if called directly
if (require.main === module) {
  main();
} 