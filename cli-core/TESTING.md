# Testing the MCP-Init CLI

## Quick Test

Run the comprehensive test script:

```bash
npm run test-cli
```

## Individual Command Testing

### 1. Basic CLI Info
```bash
./bin/run.js --version
./bin/run.js --help
```

### 2. Init Command
```bash
# Basic initialization
./bin/run.js init my-project

# With scan flag
./bin/run.js init --scan

# With wizard flag
./bin/run.js init --wizard

# With template
./bin/run.js init --template python

# With verbose output
./bin/run.js init --verbose
```

### 3. Dev Command
```bash
# Basic dev mode
./bin/run.js dev

# With playground
./bin/run.js dev --playground

# Custom port
./bin/run.js dev --port 8080

# Debug mode
./bin/run.js dev --debug
```

### 4. Test Command
```bash
# Basic testing
./bin/run.js test

# Generate fixtures
./bin/run.js test --generate-fixtures

# With coverage
./bin/run.js test --coverage

# Test specific tool
./bin/run.js test --tool my-tool
```

### 5. Lint Command
```bash
# Basic linting
./bin/run.js lint

# With security checks
./bin/run.js lint --security

# Auto-fix issues
./bin/run.js lint --fix

# Verbose output
./bin/run.js lint --verbose
```

### 6. Deploy Command
```bash
# Basic deployment
./bin/run.js deploy

# Preview tier
./bin/run.js deploy --tier preview

# Specific platform
./bin/run.js deploy --platform cloudflare

# Dry run
./bin/run.js deploy --dry-run
```

## Testing Help for Each Command

You can get detailed help for any command:

```bash
./bin/run.js init --help
./bin/run.js dev --help
./bin/run.js test --help
./bin/run.js lint --help
./bin/run.js deploy --help
```

## Current Status

All commands are currently **placeholder implementations** that:
- ✅ Parse arguments and flags correctly
- ✅ Display appropriate help text
- ✅ Show what would happen when implemented
- ✅ Return proper exit codes

The actual functionality will be implemented in the coming days according to the project plan.

## Building and Testing

```bash
# Build the CLI
npm run build

# Run unit tests
npm test

# Test CLI functionality
npm run test-cli

# Lint the code
npm run lint
``` 