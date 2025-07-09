#!/usr/bin/env npx tsx

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

interface GitOperationResult {
  mcpName: string;
  success: boolean;
  error?: string;
  commitHash?: string;
  pushedFiles?: string[];
}

interface GitPushSummary {
  total: number;
  successful: number;
  failed: number;
  results: GitOperationResult[];
}

class ThirdPartyMCPGitPusher {
  private thirdPartyMcpsPath: string;

  constructor(thirdPartyMcpsPath: string = 'third-party-mcps') {
    // Find the project root
    let currentDir = __dirname;
    while (currentDir !== path.dirname(currentDir)) {
      try {
        const packagePath = path.join(currentDir, 'package.json');
        if (require('fs').existsSync(packagePath)) {
          const packageContent = require('fs').readFileSync(packagePath, 'utf-8');
          const packageData = JSON.parse(packageContent);
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
    
    this.thirdPartyMcpsPath = path.resolve(process.cwd(), thirdPartyMcpsPath);
  }

  /**
   * Discover MCPs that have been updated and need to be pushed
   */
  async discoverUpdatedMCPs(): Promise<string[]> {
    console.log('\n📊 Discovering updated third-party MCPs...\n');
    
    const updatedMCPs: string[] = [];
    
    try {
      const entries = await fs.readdir(this.thirdPartyMcpsPath);
      
      for (const entry of entries) {
        if (entry.startsWith('_')) continue; // Skip _templates
        
        const mcpPath = path.join(this.thirdPartyMcpsPath, entry);
        const stats = await fs.stat(mcpPath);
        
        if (!stats.isDirectory()) continue;
        
        // Check if it's a git repository and has changes
        try {
          const gitPath = path.join(mcpPath, '.git');
          await fs.access(gitPath);
          
          // Check for changes (uncommitted files or ahead commits)
          const hasChanges = await this.hasGitChanges(mcpPath);
          
          if (hasChanges) {
            console.log(`📝 Found updated MCP: ${entry}`);
            updatedMCPs.push(entry);
          } else {
            console.log(`✅ ${entry}: No changes to push`);
          }
        } catch {
          console.log(`⚠️ Skipping ${entry}: Not a git repository`);
        }
      }
    } catch (error) {
      console.error('❌ Error discovering MCPs:', error);
    }
    
    console.log(`\n📈 Discovery complete! Found ${updatedMCPs.length} MCPs with changes\n`);
    return updatedMCPs;
  }

  /**
   * Check if a git repository has changes to commit/push
   */
  async hasGitChanges(mcpPath: string): Promise<boolean> {
    try {
      // Check for uncommitted changes
      const statusOutput = execSync('git status --porcelain', { 
        cwd: mcpPath, 
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      
      if (statusOutput.trim()) {
        return true; // Has uncommitted changes
      }

      // Check if we're ahead of origin
      try {
        const aheadOutput = execSync('git rev-list --count @{u}..HEAD 2>/dev/null || echo "0"', {
          cwd: mcpPath,
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        
        const aheadCount = parseInt(aheadOutput.trim());
        return aheadCount > 0;
      } catch {
        // If we can't check ahead status, assume we need to push
        return true;
      }
    } catch (error) {
      console.warn(`   ⚠️ Could not check git status for ${path.basename(mcpPath)}`);
      return false;
    }
  }

  /**
   * Push a single MCP to GitHub
   */
  async pushMCPToGitHub(mcpName: string): Promise<GitOperationResult> {
    console.log(`🚀 Pushing ${mcpName} to GitHub...`);
    
    try {
      const mcpPath = path.join(this.thirdPartyMcpsPath, mcpName);
      
      // Check if it's a git repository
      const gitPath = path.join(mcpPath, '.git');
      await fs.access(gitPath);
      
      console.log(`   📁 Working in: ${mcpPath}`);
      
      // Get current status
      const statusOutput = execSync('git status --porcelain', { 
        cwd: mcpPath, 
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      
      const changedFiles = statusOutput.trim().split('\n').filter(line => line.trim()).map(line => line.substring(3));
      
      if (statusOutput.trim()) {
        console.log(`   📝 Found ${changedFiles.length} changed files:`, changedFiles);
        
        // Add all changes
        execSync('git add .', { cwd: mcpPath, stdio: 'pipe' });
        console.log(`   ✅ Added all changes to staging`);
        
        // Create commit message
        const commitMessage = `Update MCP for Sigyl deployment
        
- Updated server.ts with stateless HTTP server implementation
- Added hybrid environment variable support (headers, body context, process.env)
- Implemented /mcp endpoint for Sigyl gateway compatibility
- Added proper multi-tenancy support
- Updated sigyl.yaml with correct configuration schema

Ready for deployment via Sigyl platform.`;
        
        // Commit changes
        execSync(`git commit -m "${commitMessage}"`, { cwd: mcpPath, stdio: 'pipe' });
        console.log(`   ✅ Committed changes`);
        
        // Get commit hash
        const commitHash = execSync('git rev-parse HEAD', { 
          cwd: mcpPath, 
          encoding: 'utf-8',
          stdio: 'pipe'
        }).trim();
        
        console.log(`   📦 Commit hash: ${commitHash.substring(0, 8)}`);
      } else {
        console.log(`   ℹ️ No uncommitted changes to commit`);
      }
      
      // Check if we need to push
      let needsPush = false;
      try {
        const aheadOutput = execSync('git rev-list --count @{u}..HEAD 2>/dev/null || echo "0"', {
          cwd: mcpPath,
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        
        const aheadCount = parseInt(aheadOutput.trim());
        needsPush = aheadCount > 0;
        
        if (needsPush) {
          console.log(`   📤 ${aheadCount} commit(s) ahead of origin, pushing...`);
        }
      } catch {
        // If we can't check, try to push anyway
        needsPush = true;
        console.log(`   📤 Cannot determine push status, attempting push...`);
      }
      
      if (needsPush) {
        // Push to origin
        try {
          execSync('git push origin main', { cwd: mcpPath, stdio: 'pipe' });
          console.log(`   ✅ Successfully pushed to origin/main`);
        } catch (pushError) {
          // Try 'master' if 'main' fails
          try {
            execSync('git push origin master', { cwd: mcpPath, stdio: 'pipe' });
            console.log(`   ✅ Successfully pushed to origin/master`);
          } catch (masterError) {
            throw new Error(`Failed to push to both main and master branches: ${pushError}`);
          }
        }
      } else {
        console.log(`   ✅ Already up to date with origin`);
      }

      // Get final commit hash
      const finalCommitHash = execSync('git rev-parse HEAD', { 
        cwd: mcpPath, 
        encoding: 'utf-8',
        stdio: 'pipe'
      }).trim();

      console.log(`✅ ${mcpName} successfully pushed to GitHub!`);
      
      return {
        mcpName,
        success: true,
        commitHash: finalCommitHash,
        pushedFiles: changedFiles
      };

    } catch (error) {
      console.error(`❌ ${mcpName} push failed:`, error);
      
      return {
        mcpName,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Push all updated MCPs to GitHub
   */
  async pushAllToGitHub(mcps: string[] = []): Promise<GitPushSummary> {
    console.log('🎯 Starting GitHub push for third-party MCPs...\n');

    // Auto-discover if no MCPs specified
    const mcpsToPush = mcps.length > 0 ? mcps : await this.discoverUpdatedMCPs();
    
    if (mcpsToPush.length === 0) {
      console.log('✅ No MCPs found with changes to push');
      return { total: 0, successful: 0, failed: 0, results: [] };
    }

    console.log('🚀 Starting GitHub pushes...\n');
    const results: GitOperationResult[] = [];

    for (const mcpName of mcpsToPush) {
      const result = await this.pushMCPToGitHub(mcpName);
      results.push(result);
      
      // Add a small delay between pushes to be respectful to GitHub
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(''); // Add spacing
    }

    // Generate summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    const summary: GitPushSummary = {
      total: results.length,
      successful,
      failed,
      results
    };

    this.printSummary(summary);
    return summary;
  }

  /**
   * Print push summary
   */
  printSummary(summary: GitPushSummary): void {
    console.log('\n📊 GitHub Push Summary');
    console.log('=====================');
    console.log(`   Total MCPs: ${summary.total}`);
    console.log(`   ✅ Successfully pushed: ${summary.successful}`);
    console.log(`   ❌ Failed to push: ${summary.failed}`);

    if (summary.failed > 0) {
      console.log('\n❌ Failed pushes:');
      summary.results.filter(r => !r.success).forEach(r => {
        console.log(`   - ${r.mcpName}: ${r.error}`);
      });
    }

    if (summary.successful > 0) {
      console.log('\n✅ Successfully pushed:');
      summary.results.filter(r => r.success).forEach(r => {
        console.log(`   - ${r.mcpName}: https://github.com/sigyl-dev/${r.mcpName} (${r.commitHash?.substring(0, 8)})`);
        if (r.pushedFiles && r.pushedFiles.length > 0) {
          console.log(`     📝 Updated files: ${r.pushedFiles.join(', ')}`);
        }
      });
    }
  }

  /**
   * Save push report to file
   */
  async saveReport(summary: GitPushSummary): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(process.cwd(), `github-push-report-${timestamp}.json`);
    
    await fs.writeFile(reportPath, JSON.stringify(summary, null, 2));
    console.log(`\n📄 Push report saved to: ${reportPath}`);
  }

  /**
   * Check git configuration
   */
  checkGitConfig(): boolean {
    console.log('🔍 Checking git configuration...\n');

    try {
      const userName = execSync('git config --global user.name', { encoding: 'utf-8', stdio: 'pipe' }).trim();
      const userEmail = execSync('git config --global user.email', { encoding: 'utf-8', stdio: 'pipe' }).trim();
      
      console.log(`✅ Git user.name: ${userName}`);
      console.log(`✅ Git user.email: ${userEmail}`);
      
      // Check if we have GitHub authentication
      try {
        execSync('git ls-remote https://github.com/sigyl-dev/weather.git HEAD', { stdio: 'pipe' });
        console.log(`✅ GitHub authentication: Working`);
      } catch {
        console.log(`⚠️ GitHub authentication: May need setup (try: gh auth login)`);
      }
      
      console.log('');
      return true;
    } catch (error) {
      console.error('❌ Git configuration issue:', error);
      console.log('');
      console.log('Please configure git:');
      console.log('  git config --global user.name "Your Name"');
      console.log('  git config --global user.email "your.email@example.com"');
      console.log('  gh auth login  # for GitHub authentication');
      console.log('');
      return false;
    }
  }

  /**
   * Show available MCPs to push
   */
  async showAvailableMCPs(): Promise<void> {
    console.log('\n📋 Available third-party MCPs to push:');
    
    try {
      const mcps = await this.discoverUpdatedMCPs();
      
      if (mcps.length === 0) {
        console.log('   No MCPs found with changes to push');
        return;
      }
      
      for (const mcpName of mcps) {
        const mcpPath = path.join(this.thirdPartyMcpsPath, mcpName);
        
        try {
          // Get some info about the changes
          const statusOutput = execSync('git status --porcelain', { 
            cwd: mcpPath, 
            encoding: 'utf-8',
            stdio: 'pipe'
          });
          
          const changedFiles = statusOutput.trim().split('\n').filter(line => line.trim()).length;
          console.log(`   - ${mcpName} (${changedFiles} changed files)`);
        } catch {
          console.log(`   - ${mcpName} (status unknown)`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error listing MCPs:', error);
    }
  }
}

async function main() {
  const mcpName = process.argv[2];
  
  console.log('🎯 Third-Party MCP GitHub Push');
  console.log('==============================\n');

  const pusher = new ThirdPartyMCPGitPusher();
  
  // Check git configuration
  if (!pusher.checkGitConfig()) {
    console.error('❌ Git configuration incomplete. Please configure git first.');
    process.exit(1);
  }

  if (mcpName === '--list' || mcpName === '-l') {
    await pusher.showAvailableMCPs();
    return;
  }

  if (!mcpName) {
    console.error('❌ Please provide an MCP name to push, or use --list to see available MCPs');
    console.error('Usage: npx tsx src/scripts/pushThirdPartyMCPsToGitHub.ts <mcp-name>');
    console.error('       npx tsx src/scripts/pushThirdPartyMCPsToGitHub.ts --list');
    console.error('       npx tsx src/scripts/pushThirdPartyMCPsToGitHub.ts --all');
    console.error('');
    console.error('Examples:');
    console.error('  npx tsx src/scripts/pushThirdPartyMCPsToGitHub.ts weather');
    console.error('  npx tsx src/scripts/pushThirdPartyMCPsToGitHub.ts --all');
    
    await pusher.showAvailableMCPs();
    process.exit(1);
  }

  try {
    if (mcpName === '--all') {
      // Push all MCPs
      const summary = await pusher.pushAllToGitHub();
      await pusher.saveReport(summary);
      
      console.log('\n🎉 Bulk GitHub push completed!');
      console.log('\nNext steps:');
      console.log('1. Test single deployment: npx tsx src/scripts/deployLocalThirdPartyMCPs.ts weather');
      console.log('2. Run bulk deployment: npx tsx src/scripts/correctBulkDeployMCPs.ts');
      
      // Exit with error code if any pushes failed
      if (summary.failed > 0) {
        process.exit(1);
      }
    } else {
      // Push single MCP
      const result = await pusher.pushMCPToGitHub(mcpName);
      
      if (result.success) {
        console.log('\n🎉 Single MCP push completed successfully!');
        console.log(`📦 Commit hash: ${result.commitHash}`);
        console.log(`🌐 Repository: https://github.com/sigyl-dev/${result.mcpName}`);
        
        if (result.pushedFiles && result.pushedFiles.length > 0) {
          console.log(`📝 Updated files: ${result.pushedFiles.join(', ')}`);
        }
        
        console.log('\nNext step:');
        console.log(`  npx tsx src/scripts/deployLocalThirdPartyMCPs.ts ${mcpName}`);
      } else {
        console.log('\n❌ MCP push failed!');
        console.log(`Error: ${result.error}`);
        process.exit(1);
      }
    }
    
  } catch (error) {
    console.error('❌ Push failed:', error);
    process.exit(1);
  }
}

// Export for testing
export { ThirdPartyMCPGitPusher };

// Run if called directly
if (require.main === module) {
  main();
} 