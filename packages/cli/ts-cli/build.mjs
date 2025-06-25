import { readFileSync, writeFileSync } from "fs"
import { join } from "path"

// Add shebang to the built file
const distPath = join("dist", "index.js")
try {
  // Read the compiled TypeScript output
  const compiledContent = readFileSync(distPath, 'utf8')
  
  // Add shebang if it doesn't already exist
  if (!compiledContent.startsWith('#!/usr/bin/env node')) {
    const content = `#!/usr/bin/env node
${compiledContent}`
    writeFileSync(distPath, content)
  }
  
  console.log("✅ Build script completed")
} catch (error) {
  console.error("❌ Build script failed:", error)
  process.exit(1)
} 