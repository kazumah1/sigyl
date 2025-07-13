import { Octokit } from '@octokit/rest';
import { RepositoryAnalysis } from '../types/security';
export declare class RepositoryAnalyzer {
    private octokit?;
    constructor(octokit?: Octokit);
    /**
     * Analyze a GitHub repository
     */
    analyzeRepository(repoUrl: string, branch?: string): Promise<RepositoryAnalysis>;
    /**
     * Parse GitHub repository URL
     */
    private parseRepoUrl;
    /**
     * Check if file is relevant for security analysis
     */
    private isRelevantFile;
    /**
     * Fetch file content from GitHub
     */
    private fetchFileContent;
    /**
     * Detect file language from extension
     */
    private detectLanguage;
    /**
     * Build repository analysis from files
     */
    private buildRepositoryAnalysis;
    /**
     * Get repository statistics
     */
    getRepositoryStats(repoUrl: string): Promise<{
        stars: number;
        forks: number;
        openIssues: number;
        lastPush: Date;
        language: string;
    } | null>;
    /**
     * Check if repository is public
     */
    isRepositoryPublic(repoUrl: string): Promise<boolean>;
    /**
     * Get repository license information
     */
    getRepositoryLicense(repoUrl: string): Promise<string | null>;
}
//# sourceMappingURL=repositoryAnalyzer.d.ts.map