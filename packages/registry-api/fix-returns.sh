#!/bin/bash

# Fix missing return statements in route files
echo "Fixing missing return statements..."

# Fix deployments.ts
sed -i '' 's/^    res\.status(500)\.json(/    return res.status(500).json(/g' src/routes/deployments.ts
sed -i '' 's/^    res\.status(500)\.json(/    return res.status(500).json(/g' src/routes/deployments.ts

# Fix githubApp.ts
sed -i '' 's/^    res\.status(500)\.json(/    return res.status(500).json(/g' src/routes/githubApp.ts
sed -i '' 's/^    res\.status(500)\.json(/    return res.status(500).json(/g' src/routes/githubApp.ts

# Fix secrets.ts
sed -i '' 's/^    res\.status(201)\.json(/    return res.status(201).json(/g' src/routes/secrets.ts
sed -i '' 's/^    res\.status(500)\.json(/    return res.status(500).json(/g' src/routes/secrets.ts

echo "Fixed return statements in route files" 