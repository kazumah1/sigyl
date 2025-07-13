"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatternMatcher = void 0;
class PatternMatcher {
    /**
     * Find pattern matches in a file
     */
    findPatternMatches(file, patterns) {
        const matches = [];
        // Filter patterns by file type
        const applicablePatterns = patterns.filter(pattern => this.isPatternApplicable(pattern, file.path));
        for (const pattern of applicablePatterns) {
            const fileMatches = this.findMatches(file, pattern);
            matches.push(...fileMatches);
        }
        return matches;
    }
    /**
     * Check if pattern applies to this file type
     */
    isPatternApplicable(pattern, filePath) {
        // If no file types specified, apply to all files
        if (!pattern.fileTypes || pattern.fileTypes.length === 0) {
            return true;
        }
        // Check if file extension matches any of the pattern's file types
        return pattern.fileTypes.some(fileType => filePath.toLowerCase().endsWith(fileType.toLowerCase()));
    }
    /**
     * Find all matches of a pattern in a file
     */
    findMatches(file, pattern) {
        const matches = [];
        const lines = file.content.split('\n');
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            const lineNumber = lineIndex + 1;
            // Reset regex lastIndex to ensure proper matching
            pattern.regex.lastIndex = 0;
            let match;
            while ((match = pattern.regex.exec(line)) !== null) {
                const context = this.getContext(lines, lineIndex, 2);
                matches.push({
                    pattern,
                    file: file.path,
                    line: lineNumber,
                    column: match.index + 1,
                    match: match[0],
                    context
                });
                // Prevent infinite loop for global regex
                if (!pattern.regex.global) {
                    break;
                }
            }
        }
        return matches;
    }
    /**
     * Get context around a line (for better understanding of the match)
     */
    getContext(lines, lineIndex, contextSize = 2) {
        const start = Math.max(0, lineIndex - contextSize);
        const end = Math.min(lines.length, lineIndex + contextSize + 1);
        const contextLines = lines.slice(start, end).map((line, index) => {
            const actualLineNumber = start + index + 1;
            const isMatchLine = start + index === lineIndex;
            const prefix = isMatchLine ? '>>>' : '   ';
            return `${prefix} ${actualLineNumber.toString().padStart(3)}: ${line}`;
        });
        return contextLines.join('\n');
    }
    /**
     * Check if a string contains potential security issues
     * Quick check without full pattern matching
     */
    hasSecurityIndicators(content) {
        const indicators = [
            'authorization',
            'bearer',
            'token',
            'password',
            'secret',
            'session',
            'cookie',
            'oauth',
            'redirect_uri',
            'client_id'
        ];
        const lowerContent = content.toLowerCase();
        return indicators.some(indicator => lowerContent.includes(indicator));
    }
    /**
     * Get a quick security score for content (0-100)
     */
    getSecurityScore(content) {
        let score = 100;
        // Deduct points for potential security issues
        const riskPatterns = [
            /bearer\s+[^\\s]+/gi, // Bearer tokens
            /password\s*[:=]\s*["']?[^"'\s]+/gi, // Hardcoded passwords
            /secret\s*[:=]\s*["']?[^"'\s]+/gi, // Hardcoded secrets
            /http:\/\/(?!localhost)/gi, // HTTP (not localhost)
            /console\.log\(/gi, // Debug logging
            /eval\(/gi, // eval usage
            /document\.cookie/gi, // Cookie manipulation
            /innerHTML\s*=/gi // innerHTML usage
        ];
        for (const pattern of riskPatterns) {
            const matches = content.match(pattern) || [];
            score -= matches.length * 5; // Deduct 5 points per match
        }
        return Math.max(0, score);
    }
}
exports.PatternMatcher = PatternMatcher;
//# sourceMappingURL=patternMatcher.js.map