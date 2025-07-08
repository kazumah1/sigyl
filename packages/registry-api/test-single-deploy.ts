#!/usr/bin/env npx tsx

import { deployRepo } from './src/services/deployer';
import { signGitHubAppJWT, getInstallationAccessToken } from './src/services/githubAppAuth';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testSingleDeploy() {
  console.log('🧪 Testing single MCP deployment...\n');

  // Get GitHub App token for sigyl-dev organization
  let githubToken: string | undefined;
  
  try {
    if (process.env.GITHUB_APP_ID && process.env.GITHUB_PRIVATE_KEY) {
      console.log('🔑 Getting GitHub App token...');
      const jwt = signGitHubAppJWT(process.env.GITHUB_APP_ID, process.env.GITHUB_PRIVATE_KEY);
      
      // Find sigyl-dev installation
      const { Octokit } = await import('@octokit/rest');
      const octokit = new Octokit({ auth: jwt });
      const { data: installations } = await octokit.rest.apps.listInstallations();
      const sigylDevInstallation = installations.find(
        installation => installation.account?.login === 'sigyl-dev'
      );
      
      if (sigylDevInstallation) {
        githubToken = await getInstallationAccessToken(jwt, sigylDevInstallation.id);
        console.log('✅ Got GitHub App installation token');
      } else {
        console.log('⚠️ No sigyl-dev installation found, will try without token');
      }
    } else {
      console.log('⚠️ GitHub App credentials not configured');
    }
  } catch (error) {
    console.log('⚠️ Could not get GitHub token:', error instanceof Error ? error.message : String(error));
  }

  // Test with Brave-Search MCP server (has sigyl.yaml)
  const testRequest = {
    repoUrl: 'https://github.com/sigyl-dev/Brave-Search',
    repoName: 'sigyl-dev/Brave-Search',
    branch: 'main',
    env: {
      NODE_ENV: 'production',
      PORT: '8080'
    },
    githubToken
  };

  console.log('📋 Test deployment request:');
  console.log(`   Repository: ${testRequest.repoName}`);
  console.log(`   Branch: ${testRequest.branch}`);
  console.log(`   GitHub Token: ${testRequest.githubToken ? '✅ Present' : '❌ Missing'}`);

  try {
    console.log('\n🚀 Starting deployment...');
    const result = await deployRepo(testRequest);

    if (result.success) {
      console.log('\n✅ Deployment successful!');
      console.log(`   Deployment URL: ${result.deploymentUrl}`);
      console.log(`   Service Name: ${result.serviceName}`);
      console.log(`   Package ID: ${result.packageId}`);
    } else {
      console.log('\n❌ Deployment failed:');
      console.log(`   Error: ${result.error}`);
      if (result.securityReport) {
        console.log(`   Security Report: ${JSON.stringify(result.securityReport, null, 2)}`);
      }
    }
  } catch (error) {
    console.log('\n❌ Deployment failed:');
    console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

testSingleDeploy().catch(console.error); 