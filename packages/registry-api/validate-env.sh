#!/bin/bash

# Environment validation script for Sigil MCP Platform
# This script validates all required environment variables before deployment

echo "🚀 Sigil MCP Platform - Environment Validation"
echo "=============================================="
echo ""

# Change to the registry-api directory if not already there
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js to continue."
    exit 1
fi

# Check if TypeScript/ts-node is available
if ! command -v npx &> /dev/null; then
    echo "❌ npm/npx is not available. Please ensure Node.js is properly installed."
    exit 1
fi

# Run the TypeScript validation script
echo "Running environment validation..."
echo ""

npx ts-node src/scripts/validate-env.ts

exit_code=$?

echo ""
if [ $exit_code -eq 0 ]; then
    echo "✅ Environment validation passed! You're ready to deploy."
else
    echo "❌ Environment validation failed. Please fix the issues above."
fi

exit $exit_code 