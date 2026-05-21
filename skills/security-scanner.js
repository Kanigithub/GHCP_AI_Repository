/**
 * Security Scanner Skill
 * Scans for security vulnerabilities, secrets, and compliance issues
 */

const fs = require('fs');

class SecurityScanner {
  constructor(config = {}) {
    this.config = {
      enableSecretDetection: config.enableSecretDetection !== false,
      enableDependencyCheck: config.enableDependencyCheck !== false,
      enableInjectionDetection: config.enableInjectionDetection !== false,
      ...config
    };
    this.vulnerabilities = [];
  }

  async scan(filePaths, dependencies = {}) {
    console.log('[Security Scanner] Starting security scan');
    this.vulnerabilities = [];
    if (this.config.enableSecretDetection) await this.detectSecrets(filePaths);
    if (this.config.enableInjectionDetection) await this.detectInjectionVulnerabilities(filePaths);
    if (this.config.enableDependencyCheck) await this.checkDependencies(dependencies);
    await this.checkAuthenticationIssues(filePaths);
    await this.checkDataExposure(filePaths);
    return this.generateSecurityReport();
  }

  async detectSecrets(filePaths) {
    const secretPatterns = {
      'API_KEY': /['\"][a-zA-Z0-9_\-]{20,}['\"]/g,
      'AWS_KEY': /AKIA[0-9A-Z]{16}/g,
      'PRIVATE_KEY': /-----BEGIN (RSA |OPENSSH |)PRIVATE KEY/g,
      'DATABASE_URL': /(?:mysql|postgres|mongodb):\/\/[\w:]+@[\w\.]+/g,
      'JWT_SECRET': /jwt_secret\s*[:=]\s*['\"][^'\"]{20,}['\"]/gi,
      'PASSWORD': /password\s*[:=]\s*['\"](?!.*\*)[^'\"]{6,}['\"]/gi,
    };
    for (const filePath of filePaths) {
      if (this.shouldSkipFile(filePath)) continue;
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        Object.entries(secretPatterns).forEach(([secretType, pattern]) => {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            this.vulnerabilities.push({
              file: filePath,
              type: 'HARDCODED_SECRET',
              severity: 'critical',
              message: `Hardcoded ${secretType} detected`,
              suggestion: 'Move to environment variables'
            });
          }
        });
      } catch (error) {}
    }
  }

  async detectInjectionVulnerabilities(filePaths) {
    for (const filePath of filePaths) {
      if (this.shouldSkipFile(filePath)) continue;
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.match(/query\s*=.*\+|query\s*=.*template/gi)) {
          this.vulnerabilities.push({
            file: filePath,
            type: 'SQL_INJECTION',
            severity: 'high',
            message: 'Potential SQL injection via concatenation',
            suggestion: 'Use parameterized queries'
          });
        }
        if (content.match(/innerHTML|dangerouslySetInnerHTML/g)) {
          this.vulnerabilities.push({
            file: filePath,
            type: 'XSS_VULNERABILITY',
            severity: 'high',
            message: 'Potential XSS vulnerability',
            suggestion: 'Use textContent or sanitize input'
          });
        }
      } catch (error) {}
    }
  }

  async checkDependencies(dependencies) {
    const vulnerablePackages = {
      'lodash': { versions: ['<4.17.21'], cve: 'CVE-2021-23337' },
      'minimist': { versions: ['<1.2.6'], cve: 'CVE-2021-44906' }
    };
    Object.entries(dependencies).forEach(([packageName, version]) => {
      if (vulnerablePackages[packageName]) {
        const vuln = vulnerablePackages[packageName];
        this.vulnerabilities.push({
          type: 'VULNERABLE_DEPENDENCY',
          package: packageName,
          severity: 'high',
          message: `Vulnerable package: ${packageName}@${version}`,
          suggestion: `Update to latest secure version`
        });
      }
    });
  }

  async checkAuthenticationIssues(filePaths) {
    for (const filePath of filePaths) {
      if (this.shouldSkipFile(filePath)) continue;
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.match(/app\.(get|post|put|delete)\s*\(\s*['\"]\/api\//) && !content.match(/middleware.*auth/)) {
          this.vulnerabilities.push({
            file: filePath,
            type: 'MISSING_AUTHENTICATION',
            severity: 'high',
            message: 'API endpoint without authentication',
            suggestion: 'Add authentication middleware'
          });
        }
      } catch (error) {}
    }
  }

  async checkDataExposure(filePaths) {
    for (const filePath of filePaths) {
      if (this.shouldSkipFile(filePath)) continue;
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.match(/console\.log.*password|console\.log.*token/gi)) {
          this.vulnerabilities.push({
            file: filePath,
            type: 'SENSITIVE_DATA_LOGGING',
            severity: 'high',
            message: 'Sensitive data logged to console',
            suggestion: 'Remove or mask sensitive information'
          });
        }
      } catch (error) {}
    }
  }

  shouldSkipFile(filePath) {
    const skipPatterns = ['node_modules', 'dist', 'build', '.min.js'];
    return skipPatterns.some(pattern => filePath.includes(pattern));
  }

  generateSecurityReport() {
    const bySeverity = {
      critical: this.vulnerabilities.filter(v => v.severity === 'critical'),
      high: this.vulnerabilities.filter(v => v.severity === 'high'),
      medium: this.vulnerabilities.filter(v => v.severity === 'medium')
    };
    const hasCritical = bySeverity.critical.length > 0;
    return {
      status: hasCritical ? 'FAILED' : 'PASSED',
      total_vulnerabilities: this.vulnerabilities.length,
      by_severity: bySeverity,
      security_score: Math.max(0, 100 - (bySeverity.critical.length * 20) - (bySeverity.high.length * 10)),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = SecurityScanner;