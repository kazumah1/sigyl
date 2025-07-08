#!/usr/bin/env npx tsx

import { BulkMCPDeployer } from './bulkDeployMCPs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runBulkDeployment() {
  console.log('🚀 Sigyl MCP Bulk Deployment Tool');
  console.log('=====================================\n');

  // Validate environment variables
  const requiredEnvVars = [
    'GITHUB_APP_ID',
    'GITHUB_PRIVATE_KEY',
    'GOOGLE_CLOUD_PROJECT_ID',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease ensure all required environment variables are set.');
    process.exit(1);
  }

  console.log('✅ Environment validation passed\n');

  try {
    const deployer = new BulkMCPDeployer();
    
    // Optional: specify a user ID for deployment attribution
    const userId = process.env.DEPLOYMENT_USER_ID;
    if (userId) {
      console.log(`👤 Using deployment user ID: ${userId}\n`);
    }
    
    const results = await deployer.discoverAndDeployAll(userId);
    
    // Save comprehensive report
    await deployer.saveDeploymentReport(results);
    
    console.log('\n🎉 Bulk deployment process completed successfully!');
    console.log(`\n📊 Final Summary:`);
    console.log(`   🎯 Total MCP repositories discovered: ${results.summary.total}`);
    console.log(`   ✅ Successfully deployed: ${results.summary.successful}`);
    console.log(`   ❌ Failed to deploy: ${results.summary.failed}`);
    
    if (results.summary.successful > 0) {
      console.log(`\n🌐 Your MCP servers are now available in the Sigyl registry!`);
      console.log(`   Visit your registry to see the deployed packages.`);
    }
    
    // Exit with error code if any deployments failed
    if (results.summary.failed > 0) {
      console.log(`\n⚠️ Some deployments failed. Check the detailed report for more information.`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Bulk deployment failed:', error instanceof Error ? error.message : 'Unknown error');
    
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  runBulkDeployment();
}

export { runBulkDeployment }; 