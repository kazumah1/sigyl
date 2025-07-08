#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { signGitHubAppJWT, getInstallationAccessToken } from '../services/githubAppAuth';
import { supabase } from '../config/database';
import { google } from 'googleapis';

// Load environment variables
dotenv.config();

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

class BulkDeploySetupChecker {
  private results: CheckResult[] = [];

  private addResult(name: string, status: 'pass' | 'fail' | 'warning', message: string, details?: string) {
    this.results.push({ name, status, message, details });
  }

  async checkEnvironmentVariables(): Promise<void> {
    console.log('🔍 Checking environment variables...\n');

    const requiredVars = [
      { name: 'GITHUB_APP_ID', description: 'GitHub App ID' },
      { name: 'GITHUB_PRIVATE_KEY', description: 'GitHub App private key' },
      { name: 'GOOGLE_CLOUD_PROJECT_ID', description: 'Google Cloud project ID' },
      { name: 'SUPABASE_URL', description: 'Supabase URL' },
      { name: 'SUPABASE_SERVICE_ROLE_KEY', description: 'Supabase service role key' }
    ];

    const optionalVars = [
      { name: 'GOOGLE_CLOUD_REGION', description: 'Google Cloud region (defaults to us-central1)' },
      { name: 'DEPLOYMENT_USER_ID', description: 'User ID for deployment attribution' },
      { name: 'GOOGLE_APPLICATION_CREDENTIALS', description: 'Google Cloud service account key file' }
    ];

    // Check required variables
    for (const envVar of requiredVars) {
      if (process.env[envVar.name]) {
        this.addResult(
          `Environment: ${envVar.name}`,
          'pass',
          `✅ ${envVar.description} is set`
        );
      } else {
        this.addResult(
          `Environment: ${envVar.name}`,
          'fail',
          `❌ ${envVar.description} is missing`,
          `Set ${envVar.name} environment variable`
        );
      }
    }

    // Check optional variables
    for (const envVar of optionalVars) {
      if (process.env[envVar.name]) {
        this.addResult(
          `Environment: ${envVar.name}`,
          'pass',
          `✅ ${envVar.description} is set`
        );
      } else {
        this.addResult(
          `Environment: ${envVar.name}`,
          'warning',
          `⚠️ ${envVar.description} is not set (optional)`
        );
      }
    }
  }

  async checkGitHubAppAuthentication(): Promise<void> {
    console.log('🔍 Checking GitHub App authentication...\n');

    try {
      if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_PRIVATE_KEY) {
        this.addResult(
          'GitHub Auth',
          'fail',
          '❌ GitHub App credentials not configured'
        );
        return;
      }

      // Test JWT generation
      const jwt = signGitHubAppJWT(process.env.GITHUB_APP_ID!, process.env.GITHUB_PRIVATE_KEY!);
      this.addResult(
        'GitHub JWT',
        'pass',
        '✅ GitHub App JWT generated successfully'
      );

      // Test finding sigyl-dev installation
      const { Octokit } = await import('@octokit/rest');
      const octokit = new Octokit({ auth: jwt });
      
      const { data: installations } = await octokit.rest.apps.listInstallations();
      const sigylDevInstallation = installations.find(
        installation => installation.account?.login === 'sigyl-dev'
      );

      if (sigylDevInstallation) {
        this.addResult(
          'GitHub Installation',
          'pass',
          `✅ Found sigyl-dev installation (ID: ${sigylDevInstallation.id})`
        );

        // Test installation token
        try {
          const installToken = await getInstallationAccessToken(jwt, sigylDevInstallation.id);
          this.addResult(
            'GitHub Installation Token',
            'pass',
            '✅ Installation access token obtained successfully'
          );
        } catch (error) {
          this.addResult(
            'GitHub Installation Token',
            'fail',
            '❌ Failed to get installation access token',
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      } else {
        this.addResult(
          'GitHub Installation',
          'fail',
          '❌ No GitHub App installation found for sigyl-dev organization',
          'Ensure your GitHub App is installed on the sigyl-dev organization'
        );
      }

    } catch (error) {
      this.addResult(
        'GitHub Auth',
        'fail',
        '❌ GitHub App authentication failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async checkGoogleCloudSetup(): Promise<void> {
    console.log('🔍 Checking Google Cloud setup...\n');

    try {
      if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
        this.addResult(
          'Google Cloud Project',
          'fail',
          '❌ Google Cloud project ID not configured'
        );
        return;
      }

      // Test Google Cloud authentication
      const auth = await google.auth.getClient({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });

      this.addResult(
        'Google Cloud Auth',
        'pass',
        '✅ Google Cloud authentication successful'
      );

      // Test Cloud Run API access
      const run = google.run('v1');
      try {
        await run.namespaces.services.list({
          parent: `namespaces/${process.env.GOOGLE_CLOUD_PROJECT_ID}`,
          auth
        });
        
        this.addResult(
          'Google Cloud Run API',
          'pass',
          '✅ Cloud Run API access verified'
        );
      } catch (error) {
        this.addResult(
          'Google Cloud Run API',
          'warning',
          '⚠️ Cloud Run API access test failed',
          'Ensure Cloud Run API is enabled and you have proper permissions'
        );
      }

    } catch (error) {
      this.addResult(
        'Google Cloud Auth',
        'fail',
        '❌ Google Cloud authentication failed',
        error instanceof Error ? error.message : 'Set up Google Cloud authentication'
      );
    }
  }

  async checkSupabaseConnection(): Promise<void> {
    console.log('🔍 Checking Supabase connection...\n');

    try {
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        this.addResult(
          'Supabase Config',
          'fail',
          '❌ Supabase configuration missing'
        );
        return;
      }

      // Test database connection
      const { error } = await supabase
        .from('mcp_packages')
        .select('count')
        .limit(1);

      if (error) {
        this.addResult(
          'Supabase Connection',
          'fail',
          '❌ Supabase database connection failed',
          error.message
        );
      } else {
        this.addResult(
          'Supabase Connection',
          'pass',
          '✅ Supabase database connection successful'
        );
      }

      // Check if required tables exist
      const tables = ['mcp_packages', 'mcp_deployments', 'mcp_tools', 'profiles'];
      for (const table of tables) {
        try {
          const { error: tableError } = await supabase
            .from(table)
            .select('*')
            .limit(1);

          if (tableError) {
            this.addResult(
              `Supabase Table: ${table}`,
              'fail',
              `❌ Table '${table}' not accessible`,
              tableError.message
            );
          } else {
            this.addResult(
              `Supabase Table: ${table}`,
              'pass',
              `✅ Table '${table}' accessible`
            );
          }
        } catch (error) {
          this.addResult(
            `Supabase Table: ${table}`,
            'fail',
            `❌ Error checking table '${table}'`,
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      }

    } catch (error) {
      this.addResult(
        'Supabase Connection',
        'fail',
        '❌ Supabase connection test failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async checkDependencies(): Promise<void> {
    console.log('🔍 Checking Node.js dependencies...\n');

    const requiredPackages = [
      '@octokit/rest',
      'js-yaml',
      'googleapis',
      '@supabase/supabase-js',
      'jsonwebtoken'
    ];

    for (const pkg of requiredPackages) {
      try {
        require.resolve(pkg);
        this.addResult(
          `Dependency: ${pkg}`,
          'pass',
          `✅ Package '${pkg}' is available`
        );
      } catch (error) {
        this.addResult(
          `Dependency: ${pkg}`,
          'fail',
          `❌ Package '${pkg}' is missing`,
          `Run 'npm install' to install dependencies`
        );
      }
    }
  }

  displayResults(): void {
    console.log('\n📊 Setup Check Results');
    console.log('======================\n');

    const grouped = this.results.reduce((acc, result) => {
      const category = result.name.split(':')[0];
      if (!acc[category]) acc[category] = [];
      acc[category].push(result);
      return acc;
    }, {} as Record<string, CheckResult[]>);

    for (const [category, results] of Object.entries(grouped)) {
      console.log(`\n📋 ${category}:`);
      for (const result of results) {
        console.log(`   ${result.message}`);
        if (result.details) {
          console.log(`      💡 ${result.details}`);
        }
      }
    }

    // Summary
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;

    console.log('\n📊 Summary:');
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   ⚠️ Warnings: ${warnings}`);

    if (failed === 0) {
      console.log('\n🎉 All critical checks passed! You\'re ready for bulk deployment.');
      console.log('\nRun the deployment with:');
      console.log('   npm run bulk-deploy');
    } else {
      console.log('\n❌ Some critical checks failed. Please fix the issues above before running bulk deployment.');
    }
  }

  async runAllChecks(): Promise<boolean> {
    console.log('🚀 Sigyl Bulk Deployment Setup Checker');
    console.log('=====================================\n');

    await this.checkEnvironmentVariables();
    await this.checkDependencies();
    await this.checkGitHubAppAuthentication();
    await this.checkGoogleCloudSetup();
    await this.checkSupabaseConnection();

    this.displayResults();

    const failed = this.results.filter(r => r.status === 'fail').length;
    return failed === 0;
  }
}

async function main() {
  const checker = new BulkDeploySetupChecker();
  const allPassed = await checker.runAllChecks();
  
  process.exit(allPassed ? 0 : 1);
}

// Export for testing
export { BulkDeploySetupChecker };

// Run if called directly
if (require.main === module) {
  main();
} 