import { writeFileSync } from "fs"
import { join } from "path"

// Add shebang to the built file
const distPath = join("dist", "index.js")
try {
  const content = `#!/usr/bin/env node
` + `require('./index.js')`
  
  writeFileSync(distPath, content)
  console.log("✅ Build script completed")
} catch (error) {
  console.error("❌ Build script failed:", error)
  process.exit(1)
} 