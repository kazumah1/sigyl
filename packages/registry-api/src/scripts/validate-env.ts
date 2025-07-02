#!/usr/bin/env node

/**
 * Environment validation script for production deployment
 * Run this before launching to ensure all required configuration is present
 */
require('dotenv').config();
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

interface EnvCheck {
  key: string;
  required: boolean;
  description: string;
  validator?: (value: string) => boolean;
  sensitive?: boolean;
}

const ENV_CHECKS: EnvCheck[] = [
  // Database
  {
    key: 'SUPABASE_URL',
    required: true,
    description: 'Supabase database URL',
    validator: (v) => v.startsWith('https://') && v.includes('supabase')
  },
  {
    key: 'SUPABASE_ANON_KEY',
    required: false,
    description: 'Supabase anonymous key',
    sensitive: true
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    required: false,
    description: 'Supabase service role key',
    sensitive: true
  },

  // Google Cloud
  {
    key: 'GOOGLE_CLOUD_PROJECT_ID',
    required: true,
    description: 'Google Cloud project ID',
    validator: (v) => /^[a-z0-9-]+$/.test(v)
  },
  {
    key: 'GOOGLE_CLOUD_REGION',
    required: false,
    description: 'Google Cloud region',
    validator: (v) => v.includes('-')
  },

  // GitHub App
  {
    key: 'GITHUB_PRIVATE_KEY',
    required: false,
    description: 'GitHub App private key',
    validator: (v) => v.includes('BEGIN RSA PRIVATE KEY'),
    sensitive: true
  },
  {
    key: 'GITHUB_CLIENT_ID',
    required: false,
    description: 'GitHub OAuth client ID'
  },
  {
    key: 'GITHUB_CLIENT_SECRET',
    required: false,
    description: 'GitHub OAuth client secret',
    sensitive: true
  },

  // Application
  {
    key: 'NODE_ENV',
    required: true,
    description: 'Node environment',
    validator: (v) => ['development', 'production', 'staging'].includes(v)
  },
  {
    key: 'PORT',
    required: false,
    description: 'Server port',
    validator: (v) => /^\d+$/.test(v) && parseInt(v) > 0 && parseInt(v) < 65536
  },
  {
    key: 'FRONTEND_URL',
    required: false,
    description: 'Frontend application URL',
    validator: (v) => v.startsWith('http')
  },

  // Encryption
  {
    key: 'ENCRYPTION_KEY',
    required: false,
    description: 'Encryption key for secrets',
    validator: (v) => v.length >= 32,
    sensitive: true
  },

  // Optional but recommended
  {
    key: 'API_KEYS',
    required: false,
    description: 'Comma-separated API keys for public endpoints'
  },
  {
    key: 'LOG_LEVEL',
    required: false,
    description: 'Logging level',
    validator: (v) => ['error', 'warn', 'info', 'debug'].includes(v)
  }
];

function validateEnvironment(): { success: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log('🔍 Validating environment configuration...\n');

  // Check if .env file exists
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    warnings.push('.env file not found - using system environment variables');
  }

  for (const check of ENV_CHECKS) {
    const value = process.env[check.key];
    const displayValue = check.sensitive && value ? '***REDACTED***' : value || 'NOT SET';

    if (check.required && !value) {
      errors.push(`❌ ${check.key}: Required but not set - ${check.description}`);
      continue;
    }

    if (!value) {
      warnings.push(`⚠️  ${check.key}: ${displayValue} (optional - ${check.description})`);
      continue;
    }

    if (check.validator && !check.validator(value)) {
      warnings.push(`⚠️  ${check.key}: Invalid format - ${check.description}`);
      continue;
    }

    console.log(`✅ ${check.key}: ${displayValue}`);
  }

  return { success: errors.length === 0, errors, warnings };
}

function checkDependencies() {
  console.log('\n🔍 Checking critical dependencies...\n');
  
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.log('❌ package.json not found');
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const criticalDeps = [
    'express',
    '@supabase/supabase-js',
    'google-auth-library',
    '@google-cloud/cloudbuild',
    '@google-cloud/run',
    'octokit'
  ];

  let allPresent = true;
  for (const dep of criticalDeps) {
    if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
      console.log(`✅ ${dep}: installed`);
    } else {
      console.log(`❌ ${dep}: missing`);
      allPresent = false;
    }
  }

  return allPresent;
}

function generateDeploymentChecklist() {
  console.log('\n📋 Pre-Launch Deployment Checklist:\n');
  
  const checklist = [
    'Environment variables configured and validated',
    'Database schema up to date',
    'Google Cloud APIs enabled',
    'Service account permissions configured',
    'GitHub App registered and configured',
    'Frontend build and deployment ready',
    'Health check endpoints working',
    'Rate limiting configured',
    'Security headers enabled',
    'Error handling and logging in place',
    'Monitoring and alerting configured',
    'Backup strategy implemented',
    'SSL certificates configured',
    'Domain DNS configured',
    'Load testing completed'
  ];

  checklist.forEach((item, index) => {
    console.log(`${index + 1}. [ ] ${item}`);
  });
}

function main() {
  console.log('🚀 Sigil MCP Platform - Production Readiness Check\n');

  const envResult = validateEnvironment();
  const depsOk = checkDependencies();

  if (envResult.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    envResult.warnings.forEach(warning => console.log(`   ${warning}`));
  }

  if (envResult.errors.length > 0) {
    console.log('\n❌ Environment validation failed:');
    envResult.errors.forEach(error => console.log(`   ${error}`));
  }

  generateDeploymentChecklist();

  const overall = envResult.success && depsOk;
  console.log('\n' + '='.repeat(60));
  console.log(`🎯 Overall Status: ${overall ? '✅ READY FOR LAUNCH' : '❌ NEEDS ATTENTION'}`);
  
  if (!overall) {
    console.log('\nPlease fix the issues above before deploying to production.');
    process.exit(1);
  } else {
    console.log('\n🎉 All checks passed! Your backend is ready for launch.');
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

export { validateEnvironment, checkDependencies }; 