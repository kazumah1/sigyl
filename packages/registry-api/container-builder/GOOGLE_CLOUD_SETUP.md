# Google Cloud Setup Guide for Sigyl MCP Platform

This guide will help you set up Google Cloud Run integration for deploying MCP servers with 60-75% cost savings compared to Railway.

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **Google Cloud Project** created
3. **gcloud CLI** installed (optional but recommended)

## Step 1: Enable Required APIs

Enable the following APIs in your Google Cloud Console:

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

Or enable them in the [Google Cloud Console](https://console.cloud.google.com/apis/library):

- Cloud Build API
- Cloud Run Admin API  
- Container Registry API

## Step 2: Create Service Account

1. Go to [IAM & Admin > Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)

2. Click "Create Service Account"

3. Fill in details:
   - **Name**: `sigyl-mcp-deployer`
   - **Description**: `Service account for Sigyl MCP deployments`

4. Grant the following roles:
   - `Cloud Build Editor`
   - `Cloud Run Admin`
   - `Storage Admin` (for Container Registry)
   - `Service Account User`

5. Create and download a JSON key file

## Step 3: Configure Environment Variables

Add these to your `.env` file in `packages/registry-api/`:

```env
# Google Cloud Platform Configuration
GOOGLE_CLOUD_PROJECT_ID=your-gcp-project-id
GOOGLE_CLOUD_REGION=us-central1
GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project",...}'

# OR use a key file path instead:
# GOOGLE_CLOUD_KEY_FILE_PATH=/path/to/your/service-account-key.json
```

### Option A: Service Account Key as JSON String

```env
GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"sigyl-mcp-deployer@your-project.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/sigyl-mcp-deployer%40your-project.iam.gserviceaccount.com"}'
```

### Option B: Service Account Key File Path

```env
GOOGLE_CLOUD_KEY_FILE_PATH=/path/to/your/service-account-key.json
```

## Step 4: Test the Setup

Run this test to verify your Google Cloud configuration:

```bash
cd packages/container-builder
npm run test:gcp
```

Or manually test with Node.js:

```javascript
const { CloudRunService } = require('./dist/gcp/cloudRunService');

const config = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  region: process.env.GOOGLE_CLOUD_REGION,
  serviceAccountKey: process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY
};

const service = new CloudRunService(config);
console.log('✅ Google Cloud Run service initialized successfully');
```

## Step 5: Deploy Your First MCP Server

With everything configured, you can now deploy MCP servers:

### Via API

```bash
curl -X POST http://localhost:3000/api/v1/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "https://github.com/your-username/your-mcp-server",
    "branch": "main"
  }'
```

### Via Frontend

1. Go to your frontend at `http://localhost:5173`
2. Click "Deploy MCP"
3. Connect your GitHub account
4. Select a repository with a `sigyl.yaml` file
5. Configure environment variables and secrets
6. Click "Deploy to Google Cloud Run"

## Cost Optimization

Google Cloud Run is configured for maximum cost efficiency:

- **Scale to Zero**: No charges when not in use
- **Resource Limits**: 0.25 vCPU, 512MB RAM optimized for MCP servers
- **Pay-per-Request**: Only pay for actual usage
- **Auto-scaling**: Handle traffic spikes efficiently

**Expected Cost Savings**: 60-75% compared to Railway

## Troubleshooting

### Common Issues

1. **Authentication Error**
   ```
   Error: Could not load the default credentials
   ```
   - Verify your service account key is correct
   - Check that all required APIs are enabled

2. **Permission Denied**
   ```
   Error: The caller does not have permission
   ```
   - Ensure your service account has all required roles
   - Check project ID is correct

3. **Build Failed**
   ```
   Error: Build failed with status: FAILURE
   ```
   - Check your `sigyl.yaml` configuration
   - Verify Dockerfile exists (for container runtime)
   - Review build logs in Google Cloud Console

### Debugging Commands

```bash
# Check service account permissions
gcloud auth activate-service-account --key-file=/path/to/key.json
gcloud auth list

# Test Cloud Run API access
gcloud run services list --region=us-central1

# Test Cloud Build API access
gcloud builds list --limit=5
```

## Security Best Practices

1. **Least Privilege**: Only grant necessary permissions
2. **Key Rotation**: Regularly rotate service account keys
3. **Environment Variables**: Never commit keys to version control
4. **Network Security**: Use VPC connectors for private resources
5. **Monitoring**: Enable Cloud Logging and monitoring

## Next Steps

With Google Cloud Run configured, you can:

1. **Deploy Production MCPs**: Real deployments to Google Cloud
2. **Monitor Performance**: Use Google Cloud monitoring
3. **Scale Automatically**: Handle traffic with auto-scaling
4. **Optimize Costs**: Benefit from serverless pricing

Your MCP platform is now ready for production deployments! 🚀 