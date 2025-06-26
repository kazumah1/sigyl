/**
 * Security types for frontend deployment validation
 * Simplified version of container-builder security types
 */

export interface SecurityValidationResult {
  passed: boolean
  score: 'safe' | 'warning' | 'blocked'
  vulnerabilities: number
  blockers: number
  errors: number
  warnings: number
  summary: string
  recommendations: string[]
}

export interface SecurityVulnerability {
  type: string
  severity: 'info' | 'warning' | 'error' | 'block'
  title: string
  description: string
  file: string
  line?: number
  evidence: string
  fix: string
}

export interface SecurityReport {
  repoUrl: string
  branch: string
  scannedAt: Date
  vulnerabilities: SecurityVulnerability[]
  securityScore: 'safe' | 'warning' | 'blocked'
  summary: {
    totalVulnerabilities: number
    blockers: number
    errors: number
    warnings: number
    info: number
  }
  recommendations: string[]
} 