import { SecurityPattern, FileAnalysis, PatternMatch } from '../types/security';
export declare class PatternMatcher {
    /**
     * Find pattern matches in a file
     */
    findPatternMatches(file: FileAnalysis, patterns: SecurityPattern[]): PatternMatch[];
    /**
     * Check if pattern applies to this file type
     */
    private isPatternApplicable;
    /**
     * Find all matches of a pattern in a file
     */
    private findMatches;
    /**
     * Get context around a line (for better understanding of the match)
     */
    private getContext;
    /**
     * Check if a string contains potential security issues
     * Quick check without full pattern matching
     */
    hasSecurityIndicators(content: string): boolean;
    /**
     * Get a quick security score for content (0-100)
     */
    getSecurityScore(content: string): number;
}
//# sourceMappingURL=patternMatcher.d.ts.map