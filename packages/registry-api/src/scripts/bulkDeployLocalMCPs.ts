#!/usr/bin/env npx tsx

// import { deployRepo } from '../services/deployer';
import yaml from 'js-yaml';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';

// Import the expected schema from the yaml service
const SigylConfigSchema = z.object({
  runtime: z.enum(['node', 'container']),
  language: z.enum(['typescript', 'javascript']).optional(),
  startCommand: z.object({
    type: z.literal('http'),
    configSchema: z.record(z.any()).optional(),
    exampleConfig: z.record(z.any()).optional(),
  }).optional(),
});

interface ValidationIssue {
  type: 'error' | 'warning' | 'fixed';
  field: string;
  message: string;
  suggestion?: string;
  autoFixed?: boolean;
}

interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  fixedConfig?: any;
}

interface RepoInfo {
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  has_sigyl: boolean;
  has_smithery: boolean;
  config_file: string | null;
  config_content: any;
  local_path: string;
  validation_result?: ValidationResult;
}

interface DeploymentResult {
  repo: string;
  success: boolean;
  packageId?: string;
  deploymentUrl?: string;
  error?: string;
  validationIssues?: ValidationIssue[];
}

class LocalBulkMCPDeployer {
  private localReposPath: string;

  constructor(localReposPath: string) {
    this.localReposPath = localReposPath;
  }

  /**
   * Validate a configuration against the expected schema
   */
  validateConfiguration(config: any, configType: 'sigyl' | 'smithery'): ValidationResult {
    const issues: ValidationIssue[] = [];
    let fixedConfig = { ...config };
    let requiresRewrite = false;

    console.log(`  🔍 Validating ${configType}.yaml configuration...`);

    // For smithery configs, we need to convert first
    if (configType === 'smithery') {
      console.log(`  🔄 Converting smithery.yaml to sigyl format...`);
      fixedConfig = this.convertSmitheryToSigyl(config);
      requiresRewrite = true;
      issues.push({
        type: 'fixed',
        field: 'format',
        message: 'Converted from smithery.yaml to sigyl.yaml format',
        autoFixed: true
      });
    }

    // Now validate against the Sigyl schema
    const validationResult = SigylConfigSchema.safeParse(fixedConfig);

    if (!validationResult.success) {
      console.log(`  ❌ Configuration validation failed`);
      
      // Parse validation errors and provide specific fixes
      const errors = validationResult.error.errors;
      
      for (const error of errors) {
        const fieldPath = error.path.join('.');
        
        switch (error.code) {
          case 'invalid_type':
            if (fieldPath === 'runtime' && typeof fixedConfig.runtime === 'string') {
              // Handle invalid runtime values
              if (fixedConfig.runtime === 'typescript') {
                fixedConfig.runtime = 'node';
                fixedConfig.language = 'typescript';
                requiresRewrite = true;
                issues.push({
                  type: 'fixed',
                  field: 'runtime',
                  message: 'Changed runtime from "typescript" to "node" with language: "typescript"',
                  autoFixed: true
                });
              } else if (!['node', 'container'].includes(fixedConfig.runtime)) {
                issues.push({
                  type: 'error',
                  field: 'runtime',
                  message: `Invalid runtime "${fixedConfig.runtime}". Must be "node" or "container"`,
                  suggestion: 'Change runtime to "node" for Node.js projects or "container" for Docker projects'
                });
              }
            } else if (fieldPath === 'language' && fixedConfig.language) {
              if (!['typescript', 'javascript'].includes(fixedConfig.language)) {
                issues.push({
                  type: 'error',
                  field: 'language',
                  message: `Invalid language "${fixedConfig.language}". Must be "typescript" or "javascript"`,
                  suggestion: 'Change language to "typescript" or "javascript", or remove it for container runtime'
                });
              }
            } else {
              issues.push({
                type: 'error',
                field: fieldPath,
                message: error.message,
                suggestion: 'Check the field type and format'
              });
            }
            break;

          case 'invalid_enum_value':
            if (fieldPath === 'runtime') {
              issues.push({
                type: 'error',
                field: 'runtime',
                message: `Invalid runtime value. Must be "node" or "container"`,
                suggestion: 'Change runtime to "node" for Node.js projects or "container" for Docker projects'
              });
            } else if (fieldPath === 'language') {
              issues.push({
                type: 'error',
                field: 'language',
                message: `Invalid language value. Must be "typescript" or "javascript"`,
                suggestion: 'Change language to "typescript" or "javascript", or remove it for container runtime'
              });
            } else if (fieldPath === 'startCommand.type') {
              if (fixedConfig.startCommand?.type !== 'http') {
                fixedConfig.startCommand = fixedConfig.startCommand || {};
                fixedConfig.startCommand.type = 'http';
                requiresRewrite = true;
                issues.push({
                  type: 'fixed',
                  field: 'startCommand.type',
                  message: 'Changed startCommand.type to "http" (required for MCP servers)',
                  autoFixed: true
                });
              }
            }
            break;

          case 'invalid_literal':
            if (fieldPath === 'startCommand.type') {
              fixedConfig.startCommand = fixedConfig.startCommand || {};
              fixedConfig.startCommand.type = 'http';
              requiresRewrite = true;
              issues.push({
                type: 'fixed',
                field: 'startCommand.type',
                message: 'Set startCommand.type to "http" (required for MCP servers)',
                autoFixed: true
              });
            }
            break;

          default:
            issues.push({
              type: 'error',
              field: fieldPath || 'unknown',
              message: error.message,
              suggestion: 'Please check the configuration format'
            });
        }
      }
    } else {
      console.log(`  ✅ Configuration validation passed`);
    }

    // Additional best practice checks
    if (fixedConfig.runtime === 'node' && !fixedConfig.language) {
      issues.push({
        type: 'warning',
        field: 'language',
        message: 'Language not specified for node runtime',
        suggestion: 'Consider adding "language: typescript" or "language: javascript"'
      });
    }

    if (fixedConfig.runtime === 'container' && fixedConfig.language) {
      issues.push({
        type: 'warning',
        field: 'language',
        message: 'Language field is not needed for container runtime',
        suggestion: 'Remove the language field for container runtime'
      });
    }

    if (!fixedConfig.startCommand) {
      issues.push({
        type: 'warning',
        field: 'startCommand',
        message: 'No startCommand configuration found',
        suggestion: 'Consider adding startCommand with configSchema for secrets management'
      });
    } else if (!fixedConfig.startCommand.configSchema) {
      issues.push({
        type: 'warning',
        field: 'startCommand.configSchema',
        message: 'No configSchema found in startCommand',
        suggestion: 'Add configSchema to define required API keys and configuration'
      });
    }

    // Re-validate the fixed config
    const finalValidation = SigylConfigSchema.safeParse(fixedConfig);

    return {
      isValid: finalValidation.success,
      issues,
      ...(requiresRewrite && { fixedConfig })
    };
  }

  /**
   * Convert smithery.yaml config to sigyl.yaml format
   */
  convertSmitheryToSigyl(smitheryConfig: any): any {
    const sigylConfig: any = {
      runtime: smitheryConfig.runtime === 'typescript' ? 'node' : smitheryConfig.runtime,
    };

    // Add language if it's a node runtime
    if (smitheryConfig.runtime === 'typescript') {
      sigylConfig.language = 'typescript';
    }

    // Convert startCommand structure
    if (smitheryConfig.startCommand) {
      sigylConfig.startCommand = {
        type: smitheryConfig.startCommand.type || 'http',
      };

      if (smitheryConfig.startCommand.configSchema) {
        sigylConfig.startCommand.configSchema = smitheryConfig.startCommand.configSchema;
      }

      if (smitheryConfig.startCommand.exampleConfig) {
        sigylConfig.startCommand.exampleConfig = smitheryConfig.startCommand.exampleConfig;
      }
    }

    return sigylConfig;
  }

  /**
   * Check if a local repository has MCP configuration files
   */
  async checkLocalMCPConfig(repoPath: string): Promise<{
    hasSigyl: boolean;
    hasSmithery: boolean;
    configFile: string | null;
    configContent: any;
  }> {
    const configFiles = ['sigyl.yaml', 'smithery.yaml'];
    
    for (const configFile of configFiles) {
      const configPath = path.join(repoPath, configFile);
      
      try {
        const content = await fs.readFile(configPath, 'utf-8');
        const parsed = yaml.load(content);
        
        return {
          hasSigyl: configFile === 'sigyl.yaml',
          hasSmithery: configFile === 'smithery.yaml',
          configFile,
          configContent: parsed
        };
      } catch (error) {
        // File not found, continue checking
        continue;
      }
    }

    return {
      hasSigyl: false,
      hasSmithery: false,
      configFile: null,
      configContent: null
    };
  }

  /**
   * Discover MCP repositories in the local directory
   */
  async discoverLocalMCPs(): Promise<RepoInfo[]> {
    console.log('\n📊 Analyzing local repositories for MCP configurations...\n');
    
    const discovered: RepoInfo[] = [];
    
    try {
      const repos = await fs.readdir(this.localReposPath);
      
      for (const repoName of repos) {
        const repoPath = path.join(this.localReposPath, repoName);
        
        try {
          // Check if it's a directory
          const stats = await fs.stat(repoPath);
          if (!stats.isDirectory()) continue;
          
          const mcpConfig = await this.checkLocalMCPConfig(repoPath);
          
          if (mcpConfig.hasSigyl || mcpConfig.hasSmithery) {
            console.log(`✅ Found MCP server: sigyl-dev/${repoName} (${mcpConfig.configFile})`);

            const repoInfo: RepoInfo = {
              name: repoName,
              full_name: `sigyl-dev/${repoName}`,
              description: `MCP server for ${repoName}`,
              html_url: `https://github.com/sigyl-dev/${repoName}`,
              has_sigyl: mcpConfig.hasSigyl,
              has_smithery: mcpConfig.hasSmithery,
              config_file: mcpConfig.configFile,
              config_content: mcpConfig.configContent,
              local_path: repoPath
            };

            // Validate the configuration
            const configType = mcpConfig.hasSigyl ? 'sigyl' : 'smithery';
            const validationResult = this.validateConfiguration(mcpConfig.configContent, configType);
            repoInfo.validation_result = validationResult;

            // Report validation results
            if (validationResult.issues.length > 0) {
              console.log(`  📋 Configuration analysis:`);
              for (const issue of validationResult.issues) {
                const icon = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : '✅';
                console.log(`    ${icon} ${issue.field}: ${issue.message}`);
                if (issue.suggestion && !issue.autoFixed) {
                  console.log(`      💡 Suggestion: ${issue.suggestion}`);
                }
              }
            }

            discovered.push(repoInfo);
          }
        } catch (error) {
          console.warn(`⚠️ Error checking ${repoName}:`, error instanceof Error ? error.message : 'Unknown error');
        }
      }
    } catch (error) {
      console.error('❌ Error reading local repositories directory:', error);
    }
    
    return discovered;
  }

  /**
   * Deploy a single repository
   */
  async deployRepository(repoInfo: RepoInfo, userId?: string): Promise<DeploymentResult> {
    console.log(`🚀 Deploying ${repoInfo.full_name}...`);
    
    const validationIssues = repoInfo.validation_result?.issues || [];
    const hasErrors = validationIssues.some(issue => issue.type === 'error');
    
    if (hasErrors) {
      const errorMessages = validationIssues
        .filter(issue => issue.type === 'error')
        .map(issue => `${issue.field}: ${issue.message}`)
        .join('; ');
      
      console.error(`❌ Skipping deployment due to configuration errors: ${errorMessages}`);
      return {
        repo: repoInfo.full_name,
        success: false,
        error: `Configuration validation failed: ${errorMessages}`,
        validationIssues
      };
    }
    
    try {
      // Create a temporary deployment request that includes the local config
      const deploymentRequest = {
        repoUrl: `https://github.com/${repoInfo.full_name}`,
        repoName: repoInfo.full_name,
        branch: 'main',
        env: {},
        userId,
        // Add local configuration data
        localConfig: repoInfo.config_content,
        localConfigPath: repoInfo.config_file
      };

      // Use a modified deployment function that works with local configs
      const result = await this.deployWithLocalConfig(deploymentRequest);

      if (result.success) {
        console.log(`✅ Successfully deployed ${repoInfo.full_name}`);
        return {
          repo: repoInfo.full_name,
          success: true,
          packageId: result.packageId,
          deploymentUrl: result.deploymentUrl,
          validationIssues
        };
      } else {
        console.error(`❌ Failed to deploy ${repoInfo.full_name}:`, result.error);
        return {
          repo: repoInfo.full_name,
          success: false,
          error: result.error,
          validationIssues
        };
      }
    } catch (error) {
      console.error(`❌ Error deploying ${repoInfo.full_name}:`, error);
      return {
        repo: repoInfo.full_name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        validationIssues
      };
    }
  }

  /**
   * Deploy with local configuration instead of fetching from GitHub
   */
  async deployWithLocalConfig(request: any): Promise<any> {
    // Import the deployer service dynamically
    const { deployRepo } = await import('../services/deployer');
    
    // Create a temporary deployment request that includes the local config
    const tempConfigPath = `/tmp/${request.repoName.replace('/', '-')}-sigyl.yaml`;
    const yaml = await import('js-yaml');
    const fs = await import('fs/promises');
    
    try {
      await fs.writeFile(tempConfigPath, yaml.dump(request.localConfig));
      
      // Set an environment variable to tell the deployer to use this local file
      process.env.LOCAL_SIGYL_CONFIG_PATH = tempConfigPath;
      
      // Call the regular deployRepo function
      const result = await deployRepo(request);
      
      // Clean up the temporary file
      try {
        await fs.unlink(tempConfigPath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      return result;
    } catch (error) {
      // Clean up the temporary file on error
      try {
        await fs.unlink(tempConfigPath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  /**
   * Main method to discover and deploy all MCP repositories
   */
  async discoverAndDeployAll(userId?: string): Promise<{
    discovered: RepoInfo[];
    deployments: DeploymentResult[];
    summary: {
      total: number;
      successful: number;
      failed: number;
      configErrors: number;
      autoFixed: number;
    };
  }> {
    console.log('🎯 Starting local MCP discovery and deployment...\n');

    // Discover MCP configurations locally
    const discovered = await this.discoverLocalMCPs();

    console.log(`\n📈 Discovery complete! Found ${discovered.length} MCP repositories\n`);

    // Report validation summary
    const configErrors = discovered.filter(repo => 
      repo.validation_result?.issues.some(issue => issue.type === 'error')
    ).length;
    
    const autoFixed = discovered.filter(repo => 
      repo.validation_result?.issues.some(issue => issue.autoFixed)
    ).length;

    if (configErrors > 0) {
      console.log(`⚠️ ${configErrors} repositories have configuration errors that need manual fixes`);
    }
    
    if (autoFixed > 0) {
      console.log(`🔧 ${autoFixed} repositories had configurations automatically fixed`);
    }

    // Deploy all discovered repositories
    console.log('🚀 Starting deployments...\n');
    const deployments: DeploymentResult[] = [];

    for (const repoInfo of discovered) {
      const result = await this.deployRepository(repoInfo, userId);
      deployments.push(result);
      
      // Add a small delay between deployments to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Generate summary
    const successful = deployments.filter(d => d.success).length;
    const failed = deployments.filter(d => !d.success).length;

    const summary = {
      total: discovered.length,
      successful,
      failed,
      configErrors,
      autoFixed
    };

    console.log('\n📊 Deployment Summary:');
    console.log(`   Total repositories: ${summary.total}`);
    console.log(`   Successfully deployed: ${summary.successful}`);
    console.log(`   Failed to deploy: ${summary.failed}`);
    console.log(`   Configuration errors: ${summary.configErrors}`);
    console.log(`   Auto-fixed configurations: ${summary.autoFixed}`);

    if (failed > 0) {
      console.log('\n❌ Failed deployments:');
      deployments.filter(d => !d.success).forEach(d => {
        console.log(`   - ${d.repo}: ${d.error}`);
      });
    }

    if (successful > 0) {
      console.log('\n✅ Successful deployments:');
      deployments.filter(d => d.success).forEach(d => {
        console.log(`   - ${d.repo}: ${d.deploymentUrl}`);
      });
    }

    return {
      discovered,
      deployments,
      summary
    };
  }

  /**
   * Save deployment report to file
   */
  async saveDeploymentReport(results: any): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(process.cwd(), `local-bulk-deployment-report-${timestamp}.json`);
    
    await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 Deployment report saved to: ${reportPath}`);
  }
}

// CLI execution
async function main() {
  try {
    const localReposPath = process.argv[2] || '/Users/charliemartin/sigyl-mcp-local';
    
    if (!localReposPath) {
      console.error('❌ Please provide the path to local repositories directory');
      console.error('Usage: npx tsx src/scripts/bulkDeployLocalMCPs.ts <local-repos-path>');
      process.exit(1);
    }
    
    const deployer = new LocalBulkMCPDeployer(localReposPath);
    
    // Optional: specify a user ID for deployment attribution
    const userId = process.env.DEPLOYMENT_USER_ID || undefined;
    
    const results = await deployer.discoverAndDeployAll(userId);
    
    // Save report
    await deployer.saveDeploymentReport(results);
    
    console.log('\n🎉 Local bulk deployment process completed!');
    
    // Exit with error code if any deployments failed or had config errors
    if (results.summary.failed > 0 || results.summary.configErrors > 0) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Local bulk deployment failed:', error);
    process.exit(1);
  }
}

// Export for testing
export { LocalBulkMCPDeployer };

// Run if called directly
if (require.main === module) {
  main();
} 