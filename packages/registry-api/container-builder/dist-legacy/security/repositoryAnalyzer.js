"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepositoryAnalyzer = void 0;
class RepositoryAnalyzer {
    octokit;
    constructor(octokit) {
        this.octokit = octokit;
    }
    /**
     * Analyze a GitHub repository
     */
    async analyzeRepository(repoUrl, branch = 'main') {
        if (!this.octokit) {
            throw new Error('GitHub token required for repository analysis');
        }
        const { owner, repo } = this.parseRepoUrl(repoUrl);
        console.log(`🔍 Analyzing repository ${owner}/${repo}:${branch}`);
        try {
            // Get repository structure
            const { data: tree } = await this.octokit.rest.git.getTree({
                owner,
                repo,
                tree_sha: branch,
                recursive: 'true'
            });
            // Filter for relevant files
            const relevantFiles = tree.tree.filter(item => item.type === 'blob' && this.isRelevantFile(item.path || ''));
            console.log(`📁 Found ${relevantFiles.length} relevant files to analyze`);
            // Fetch file contents
            const files = [];
            for (const file of relevantFiles.slice(0, 50)) { // Limit to 50 files for performance
                try {
                    const content = await this.fetchFileContent(owner, repo, file.path);
                    if (content) {
                        files.push({
                            path: file.path,
                            content,
                            language: this.detectLanguage(file.path),
                            size: file.size || 0
                        });
                    }
                }
                catch (error) {
                    console.warn(`⚠️ Could not fetch ${file.path}:`, error);
                }
            }
            return this.buildRepositoryAnalysis(files);
        }
        catch (error) {
            console.error(`❌ Failed to analyze repository ${owner}/${repo}:`, error);
            throw new Error(`Repository analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Parse GitHub repository URL
     */
    parseRepoUrl(repoUrl) {
        // Handle various GitHub URL formats
        const patterns = [
            /github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/.*)?$/,
            /^([^\/]+)\/([^\/]+)$/
        ];
        for (const pattern of patterns) {
            const match = repoUrl.match(pattern);
            if (match) {
                return {
                    owner: match[1],
                    repo: match[2]
                };
            }
        }
        throw new Error(`Invalid GitHub repository URL: ${repoUrl}`);
    }
    /**
     * Check if file is relevant for security analysis
     */
    isRelevantFile(filePath) {
        // Skip certain directories
        const skipDirs = [
            'node_modules/',
            'dist/',
            'build/',
            '.git/',
            'coverage/',
            '.nyc_output/',
            'vendor/',
            '__pycache__/',
            'target/'
        ];
        if (skipDirs.some(dir => filePath.startsWith(dir))) {
            return false;
        }
        // Include specific file patterns
        const includePatterns = [
            /\.(js|ts|jsx|tsx)$/,
            /\.(json|yaml|yml)$/,
            /^package\.json$/,
            /^mcp\.yaml$/,
            /^smithery\.yaml$/,
            /dockerfile/i,
            /\.env/,
            /^readme\.md$/i
        ];
        return includePatterns.some(pattern => pattern.test(filePath));
    }
    /**
     * Fetch file content from GitHub
     */
    async fetchFileContent(owner, repo, path) {
        if (!this.octokit) {
            return null;
        }
        try {
            const { data } = await this.octokit.rest.repos.getContent({
                owner,
                repo,
                path
            });
            // Handle file content (not directory)
            if ('content' in data && data.content) {
                return Buffer.from(data.content, 'base64').toString('utf-8');
            }
            return null;
        }
        catch (error) {
            // File might not exist or be binary
            return null;
        }
    }
    /**
     * Detect file language from extension
     */
    detectLanguage(filePath) {
        const extension = filePath.split('.').pop()?.toLowerCase();
        const languageMap = {
            'js': 'javascript',
            'ts': 'typescript',
            'jsx': 'jsx',
            'tsx': 'tsx',
            'json': 'json',
            'yaml': 'yaml',
            'yml': 'yaml',
            'md': 'markdown',
            'py': 'python',
            'go': 'go',
            'rs': 'rust',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'php': 'php'
        };
        return languageMap[extension || ''] || 'text';
    }
    /**
     * Build repository analysis from files
     */
    buildRepositoryAnalysis(files) {
        const hasPackageJson = files.some(f => f.path === 'package.json');
        const hasDockerfile = files.some(f => f.path.toLowerCase().includes('dockerfile'));
        const hasMcpYaml = files.some(f => f.path === 'mcp.yaml');
        const hasSmitheryYaml = files.some(f => f.path === 'smithery.yaml');
        // Parse dependencies from package.json
        let dependencies = [];
        let devDependencies = [];
        const packageJsonFile = files.find(f => f.path === 'package.json');
        if (packageJsonFile) {
            try {
                const packageJson = JSON.parse(packageJsonFile.content);
                dependencies = Object.keys(packageJson.dependencies || {});
                devDependencies = Object.keys(packageJson.devDependencies || {});
            }
            catch (error) {
                console.warn('Could not parse package.json:', error);
            }
        }
        return {
            hasPackageJson,
            hasDockerfile,
            hasMcpYaml,
            hasSmitheryYaml,
            files,
            dependencies,
            devDependencies
        };
    }
    /**
     * Get repository statistics
     */
    async getRepositoryStats(repoUrl) {
        if (!this.octokit) {
            return null;
        }
        try {
            const { owner, repo } = this.parseRepoUrl(repoUrl);
            const { data } = await this.octokit.rest.repos.get({ owner, repo });
            return {
                stars: data.stargazers_count,
                forks: data.forks_count,
                openIssues: data.open_issues_count,
                lastPush: new Date(data.pushed_at),
                language: data.language || 'Unknown'
            };
        }
        catch (error) {
            console.warn('Could not fetch repository stats:', error);
            return null;
        }
    }
    /**
     * Check if repository is public
     */
    async isRepositoryPublic(repoUrl) {
        if (!this.octokit) {
            return false;
        }
        try {
            const { owner, repo } = this.parseRepoUrl(repoUrl);
            const { data } = await this.octokit.rest.repos.get({ owner, repo });
            return !data.private;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get repository license information
     */
    async getRepositoryLicense(repoUrl) {
        if (!this.octokit) {
            return null;
        }
        try {
            const { owner, repo } = this.parseRepoUrl(repoUrl);
            const { data } = await this.octokit.rest.repos.get({ owner, repo });
            return data.license?.name || null;
        }
        catch (error) {
            return null;
        }
    }
}
exports.RepositoryAnalyzer = RepositoryAnalyzer;
//# sourceMappingURL=repositoryAnalyzer.js.map