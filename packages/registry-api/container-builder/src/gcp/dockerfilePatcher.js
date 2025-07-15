// dockerfilePatcher.js
// Usage: node dockerfilePatcher.js [Dockerfile path]
// Patches a Dockerfile for MCP deployment: removes conflicting ENTRYPOINT, CMD, EXPOSE lines,
// ensures wrapper is copied, sets correct EXPOSE and ENTRYPOINT, and can be extended for other requirements.

const fs = require('fs');
const path = require('path');

const DOCKERFILE_PATH = process.argv[2] || 'Dockerfile';
const WRAPPER_FILENAME = process.env.WRAPPER_FILENAME || 'wrapper.cjs'; // Change to wrapper.cjs if needed
const MCP_PORT = 8080;

if (!fs.existsSync(DOCKERFILE_PATH)) {
  console.error(`[dockerfilePatcher] Dockerfile not found at: ${DOCKERFILE_PATH}`);
  process.exit(1);
}

let dockerfile = fs.readFileSync(DOCKERFILE_PATH, 'utf8').split('\n');

// Remove unwanted lines
const removePatterns = [/^ENTRYPOINT /, /^CMD /, /^EXPOSE /];
dockerfile = dockerfile.filter(line => !removePatterns.some(re => re.test(line)));

// Find runtime stage (second FROM)
const fromIndices = dockerfile
  .map((line, idx) => (/^FROM /.test(line) ? idx : -1))
  .filter(idx => idx !== -1);
const runtimeStageIdx = fromIndices.length > 1 ? fromIndices[1] : fromIndices[0];

// Insert COPY wrapper after WORKDIR in runtime stage
if (runtimeStageIdx !== undefined && runtimeStageIdx !== -1) {
  // Find WORKDIR after runtimeStageIdx
  const workdirIdx = dockerfile.findIndex((line, idx) => idx > runtimeStageIdx && /^WORKDIR /.test(line));
  if (workdirIdx !== -1) {
    // Only insert if not already present
    const alreadyCopied = dockerfile.some(line => line.includes(`COPY wrapper/wrapper.cjs`));
    if (!alreadyCopied) {
      dockerfile.splice(workdirIdx + 1, 0, `COPY wrapper/wrapper.cjs .`);
    }
  }
}

// Add required lines at the end
if (!dockerfile.some(line => line.trim() === `EXPOSE ${MCP_PORT}`)) {
  dockerfile.push(`EXPOSE ${MCP_PORT}`);
}
if (!dockerfile.some(line => line.startsWith('ENTRYPOINT '))) {
  dockerfile.push(`ENTRYPOINT ["node", "wrapper/wrapper.cjs"]`);
}

// Optionally, add a healthcheck
// dockerfile.push('HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 CMD curl -f http://localhost:8080/mcp || exit 1');

fs.writeFileSync(DOCKERFILE_PATH, dockerfile.join('\n'));
console.log(`[dockerfilePatcher] Patched Dockerfile at: ${DOCKERFILE_PATH}`); 