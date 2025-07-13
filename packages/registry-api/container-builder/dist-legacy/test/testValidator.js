#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.testSecurityValidator = testSecurityValidator;
const validator_1 = require("../security/validator");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
/**
 * Test security validator with sample vulnerable code
 */
async function testSecurityValidator() {
    console.log('🚀 Testing MCP Security Validator\n');
    // Create test directory with vulnerable code
    const testDir = path.join(__dirname, 'test-repo');
    await setupTestRepository(testDir);
    try {
        // Initialize validator (without GitHub token for local testing)
        const validator = new validator_1.MCPSecurityValidator();
        // Test security validation
        const report = await validator.validateMCPSecurity('test/vulnerable-mcp', 'main', testDir);
        console.log('\n📊 SECURITY VALIDATION RESULTS:');
        console.log('================================');
        console.log(`Security Score: ${report.securityScore.toUpperCase()}`);
        console.log(`Total Vulnerabilities: ${report.summary.totalVulnerabilities}`);
        console.log(`Blockers: ${report.summary.blockers}`);
        console.log(`Errors: ${report.summary.errors}`);
        console.log(`Warnings: ${report.summary.warnings}`);
        if (report.vulnerabilities.length > 0) {
            console.log('\n🔍 VULNERABILITIES FOUND:');
            report.vulnerabilities.forEach((vuln, index) => {
                console.log(`\n${index + 1}. ${vuln.title}`);
                console.log(`   Severity: ${vuln.severity.toUpperCase()}`);
                console.log(`   File: ${vuln.file}:${vuln.line}`);
                console.log(`   Description: ${vuln.description}`);
                console.log(`   Fix: ${vuln.fix}`);
            });
        }
        if (report.recommendations.length > 0) {
            console.log('\n💡 RECOMMENDATIONS:');
            report.recommendations.forEach((rec, index) => {
                console.log(`${index + 1}. ${rec}`);
            });
        }
        console.log('\n✅ Security validation test completed successfully!');
        // Test deployment blocking
        if (validator.isDeploymentBlocked(report)) {
            console.log('\n🚨 DEPLOYMENT WOULD BE BLOCKED due to critical security issues');
        }
        else {
            console.log('\n✅ DEPLOYMENT WOULD BE ALLOWED with current security profile');
        }
    }
    catch (error) {
        console.error('❌ Test failed:', error);
    }
    finally {
        // Cleanup test directory
        await fs.rm(testDir, { recursive: true, force: true });
    }
}
/**
 * Setup test repository with vulnerable code examples
 */
async function setupTestRepository(testDir) {
    await fs.mkdir(testDir, { recursive: true });
    // Vulnerable server.js with token passthrough
    const vulnerableServer = `
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// VULNERABILITY: Token passthrough anti-pattern
app.post('/api/proxy', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  // BAD: Passing through authorization header without validation
  const response = await axios.post('https://api.external.com/data', req.body, {
    headers: {
      authorization: authHeader  // CRITICAL: Token passthrough!
    }
  });
  
  res.json(response.data);
});

// VULNERABILITY: Session-based authentication (forbidden in MCP)
app.post('/auth', (req, res) => {
  const sessionId = Math.random().toString(); // BAD: Weak session ID
  sessions[sessionId] = req.body.userId;      // BAD: Session auth
  res.json({ sessionId });
});

// VULNERABILITY: Insecure cookie configuration
app.use(session({
  secret: 'hardcoded-secret',
  cookie: { 
    secure: false,      // BAD: Insecure cookies
    httpOnly: false,    // BAD: XSS vulnerable
    sameSite: 'none'    // BAD: CSRF vulnerable
  }
}));

app.listen(process.env.PORT || 3000);
`;
    // Vulnerable OAuth config with confused deputy risk
    const vulnerableOAuth = `
const oauth = {
  client_id: "static-client-123",  // BAD: Static client ID
  redirect_uris: [
    req.query.redirect_uri,        // BAD: User-controlled redirect
    "https://attacker.com/callback" // BAD: Malicious redirect
  ],
  
  // BAD: Skip consent validation
  authorize: async (req, res) => {
    if (req.cookies.consent) {
      // BAD: Skip consent screen based on cookie
      return redirectWithCode(req.query.redirect_uri);
    }
  }
};
`;
    // Configuration with security issues
    const vulnerableConfig = `{
  "name": "vulnerable-mcp",
  "runtime": "typescript",
  "security": {
    "allowTokenPassthrough": true,
    "sessionConfig": {
      "secure": false,
      "sameSite": "none"
    }
  },
  "oauth": {
    "clientIdType": "static",
    "redirectUris": ["*"]
  }
}`;
    // Missing validation example
    const vulnerableDatabase = `
app.get('/user/:id', (req, res) => {
  const userId = req.params.id;
  
  // BAD: SQL injection vulnerability
  const query = \`SELECT * FROM users WHERE id = \${userId}\`;
  db.query(query, (err, results) => {
    res.json(results);
  });
});

// BAD: Using bearer token without validation
app.post('/secure-endpoint', (req, res) => {
  const token = req.headers.authorization;
  
  // BAD: No token validation before using
  makeAPICall(token);
});
`;
    // Write test files
    await fs.writeFile(path.join(testDir, 'server.js'), vulnerableServer);
    await fs.writeFile(path.join(testDir, 'oauth.js'), vulnerableOAuth);
    await fs.writeFile(path.join(testDir, 'database.js'), vulnerableDatabase);
    await fs.writeFile(path.join(testDir, 'mcp.yaml'), vulnerableConfig);
    // Package.json
    const packageJson = {
        name: 'vulnerable-mcp-test',
        version: '1.0.0',
        main: 'server.js',
        dependencies: {
            express: '^4.18.0',
            axios: '^1.0.0'
        }
    };
    await fs.writeFile(path.join(testDir, 'package.json'), JSON.stringify(packageJson, null, 2));
    console.log('📁 Created test repository with vulnerable code samples');
}
// Run the test
if (require.main === module) {
    testSecurityValidator().catch(console.error);
}
//# sourceMappingURL=testValidator.js.map