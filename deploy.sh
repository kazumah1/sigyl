#!/bin/bash

# Sigil MCP Platform - Production Deployment Script
# This script deploys the entire platform to production

set -e  # Exit on any error

echo "🚀 Sigil MCP Platform - Production Deployment"
echo "=============================================="
echo ""

# Configuration
GOOGLE_CLOUD_PROJECT="sigyl"
GOOGLE_CLOUD_REGION="us-central1"
FRONTEND_BUILD_DIR="packages/web/dist"
API_SERVICE_NAME="sigil-registry-api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if gcloud is installed and authenticated
    if ! command -v gcloud &> /dev/null; then
        log_error "Google Cloud CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        log_error "Not authenticated with Google Cloud. Run: gcloud auth login"
        exit 1
    fi
    
    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed."
        exit 1
    fi
    
    # Check if npm is available
    if ! command -v npm &> /dev/null; then
        log_error "npm is not available."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Build the monorepo
build_monorepo() {
    log_info "Building monorepo packages..."
    
    # Install dependencies
    npm install
    
    # Build all packages
    npm run build
    
    log_success "Monorepo build completed"
}

# Deploy backend API to Google Cloud Run
deploy_backend() {
    log_info "Deploying backend API to Google Cloud Run..."
    
    cd packages/registry-api
    
    # Build and push Docker image
    gcloud builds submit --tag gcr.io/${GOOGLE_CLOUD_PROJECT}/${API_SERVICE_NAME} .
    
    # Deploy to Cloud Run
    gcloud run deploy ${API_SERVICE_NAME} \
        --image gcr.io/${GOOGLE_CLOUD_PROJECT}/${API_SERVICE_NAME} \
        --platform managed \
        --region ${GOOGLE_CLOUD_REGION} \
        --allow-unauthenticated \
        --port 3000 \
        --memory 512Mi \
        --cpu 0.5 \
        --min-instances 0 \
        --max-instances 10 \
        --timeout 300 \
        --concurrency 80 \
        --set-env-vars NODE_ENV=production
    
    # Get the deployed URL
    API_URL=$(gcloud run services describe ${API_SERVICE_NAME} --region=${GOOGLE_CLOUD_REGION} --format='value(status.url)')
    
    cd ../..
    
    log_success "Backend API deployed to: $API_URL"
    echo "API_URL=$API_URL" > .deployment-vars
}

# Build and deploy frontend
deploy_frontend() {
    log_info "Building and deploying frontend..."
    
    cd packages/web
    
    # Source the API URL from backend deployment
    source ../../.deployment-vars
    
    # Create production environment file
    cat > .env.production << EOF
VITE_REGISTRY_API_URL=${API_URL}/api/v1
VITE_NODE_ENV=production
EOF
    
    # Build for production
    npm run build
    
    log_success "Frontend built successfully"
    log_warning "Frontend deployment depends on your hosting choice:"
    echo ""
    echo "For Vercel:"
    echo "  1. Connect your repository to Vercel"
    echo "  2. Set build command: cd packages/web && npm run build"
    echo "  3. Set output directory: packages/web/dist"
    echo "  4. Add environment variables in Vercel dashboard"
    echo ""
    echo "For Netlify:"
    echo "  1. Connect your repository to Netlify"
    echo "  2. Set build command: cd packages/web && npm run build"
    echo "  3. Set publish directory: packages/web/dist"
    echo "  4. Add environment variables in Netlify dashboard"
    echo ""
    echo "For manual deployment:"
    echo "  Static files are ready in: packages/web/dist/"
    
    cd ../..
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    source .deployment-vars
    
    # Test API health endpoint
    if curl -f -s "${API_URL}/health" > /dev/null; then
        log_success "API health check passed"
    else
        log_error "API health check failed"
        exit 1
    fi
    
    # Test API endpoints
    if curl -f -s "${API_URL}/api/v1/packages" > /dev/null; then
        log_success "API endpoints are responding"
    else
        log_error "API endpoints are not responding"
        exit 1
    fi
    
    log_success "Deployment verification completed"
}

# Main deployment flow
main() {
    log_info "Starting production deployment..."
    
    check_prerequisites
    build_monorepo
    deploy_backend
    deploy_frontend
    verify_deployment
    
    echo ""
    log_success "🎉 Deployment completed successfully!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Deploy frontend to your chosen platform (Vercel/Netlify)"
    echo "2. Update DNS records if using custom domain"
    echo "3. Test the complete application flow"
    echo "4. Monitor logs and performance"
    echo ""
    echo "🔗 Deployed Services:"
    source .deployment-vars
    echo "  Backend API: $API_URL"
    echo "  Frontend: Deploy to your static hosting platform"
    echo "  Database: Supabase (already configured)"
    echo ""
}

# Handle script arguments
case "${1:-}" in
    "backend")
        check_prerequisites
        build_monorepo
        deploy_backend
        ;;
    "frontend")
        deploy_frontend
        ;;
    "verify")
        verify_deployment
        ;;
    *)
        main
        ;;
esac 