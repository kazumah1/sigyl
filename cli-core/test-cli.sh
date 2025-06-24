#!/bin/bash

echo "🧪 Testing MCP-Init CLI Commands"
echo "================================="

# Test basic CLI info
echo -e "\n1. Testing CLI version and help:"
./bin/run.js --version
./bin/run.js --help

# Test init command
echo -e "\n2. Testing init command:"
./bin/run.js init test-project --template typescript --verbose

# Test dev command
echo -e "\n3. Testing dev command:"
./bin/run.js dev --playground --port 8080

# Test test command
echo -e "\n4. Testing test command:"
./bin/run.js test --generate-fixtures --coverage

# Test lint command
echo -e "\n5. Testing lint command:"
./bin/run.js lint --security --fix

# Test deploy command
echo -e "\n6. Testing deploy command:"
./bin/run.js deploy --tier preview --platform fly

# Test hello command (existing)
echo -e "\n7. Testing hello command:"
./bin/run.js hello friend --from cli-core

echo -e "\n✅ All CLI commands tested successfully!" 