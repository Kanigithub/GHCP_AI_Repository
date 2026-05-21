/**
 * Code Quality Analyzer Skill
 * Performs static code analysis, checks complexity, and identifies code smells
 */

const fs = require('fs');
const path = require('path');

class CodeQualityAnalyzer {
  constructor(config = {}) {
    this.config = {
      maxCyclomaticComplexity: config.maxCyclomaticComplexity || 10,
      maxNestingLevel: config.maxNestingLevel || 4,
      minTestCoverage: config.minTestCoverage || 80,
      excludePaths: config.excludePaths || ['node_modules', 'dist', 'build'],
      ...config
    };
    this.findings = [];
  }

  async analyze(filePaths) {
    console.log('[Code Quality Analyzer] Starting analysis on', filePaths.length, 'files');
    this.findings = [];
    
    for (const filePath of filePaths) {
      if (this.shouldExclude(filePath)) continue;
      const content = fs.readFileSync(filePath, 'utf8');
      this.checkUnusedVariables(filePath, content);
      this.checkComplexity(filePath, content);
      this.checkErrorHandling(filePath, content);
      this.checkDocumentation(filePath, content);
      this.checkCodeDuplication(filePath, content);
      this.checkImports(filePath, content);
    }
    return this.generateReport();
  }

  checkUnusedVariables(filePath, content) {
    const variablePattern = /(?:const|let|var)\s+(\w+)\s*=/g;
    const usagePattern = (varName) => new RegExp(`\\b${varName}\\b`, 'g');
    let match;
    while ((match = variablePattern.exec(content)) !== null) {
      const varName = match[1];
      const usages = (content.match(usagePattern(varName)) || []).length;
      if (usages <= 1 && !varName.startsWith('_')) {
        this.findings.push({
          file: filePath,
          type: 'UNUSED_VARIABLE',
          severity: 'medium',
          line: content.substring(0, match.index).split('\n').length,
          message: `Unused variable: ${varName}`,
          suggestion: `Remove unused variable or prefix with underscore: _${varName}`
        });
      }
    }
  }

  checkComplexity(filePath, content) {
    const functionPattern = /(?:function|=>|async\s+function)\s*\w*\s*\(.*?\)\s*{/g;
    let match;
    while ((match = functionPattern.exec(content)) !== null) {
      const functionBody = this.extractFunctionBody(content, match.index);
      const complexity = this.calculateCyclomaticComplexity(functionBody);
      if (complexity > this.config.maxCyclomaticComplexity) {
        this.findings.push({
          file: filePath,
          type: 'HIGH_COMPLEXITY',
          severity: 'high',
          line: content.substring(0, match.index).split('\n').length,
          message: `Function complexity: ${complexity} (max: ${this.config.maxCyclomaticComplexity})`,
          suggestion: 'Consider breaking this function into smaller functions'
        });
      }
    }
  }

  checkErrorHandling(filePath, content) {
    const tryBlocks = (content.match(/try\s*{/g) || []).length;
    const throwStatements = (content.match(/throw\s+/g) || []).length;
    if (throwStatements > 0 && tryBlocks === 0) {
      this.findings.push({
        file: filePath,
        type: 'MISSING_ERROR_HANDLING',
        severity: 'high',
        message: 'Code throws errors but has no try-catch block',
        suggestion: 'Implement proper error handling with try-catch blocks'
      });
    }
    if ((content.match(/\.(then|catch|finally)\(/g) || []).length > 0 && !content.includes('.catch(')) {
      this.findings.push({
        file: filePath,
        type: 'UNHANDLED_PROMISE',
        severity: 'medium',
        message: 'Promise chain without .catch() handler',
        suggestion: 'Add .catch() handler or use async/await with try-catch'
      });
    }
  }

  checkDocumentation(filePath, content) {
    const functionCount = (content.match(/(?:function|=>|async\s+function)\s+(\w+)/g) || []).length;
    const commentCount = (content.match(/\/\*\*[\s\S]*?\*\/|\/\/.*/g) || []).length;
    if (functionCount > 3 && commentCount === 0) {
      this.findings.push({
        file: filePath,
        type: 'MISSING_DOCUMENTATION',
        severity: 'low',
        message: `File has ${functionCount} functions but no documentation`,
        suggestion: 'Add JSDoc comments for functions and complex logic'
      });
    }
  }

  checkCodeDuplication(filePath, content) {
    const lines = content.split('\n');
    const duplicates = {};
    for (let i = 0; i < lines.length - 2; i++) {
      const chunk = lines.slice(i, i + 3).join('\n');
      duplicates[chunk] = (duplicates[chunk] || 0) + 1;
    }
    Object.entries(duplicates).forEach(([chunk, count]) => {
      if (count > 1 && chunk.trim().length > 20) {
        this.findings.push({
          file: filePath,
          type: 'CODE_DUPLICATION',
          severity: 'medium',
          message: `Code block appears ${count} times`,
          suggestion: 'Extract duplicated code into a reusable function'
        });
      }
    });
  }

  checkImports(filePath, content) {
    const importPattern = /import\s+.*\s+from\s+['\"](.+?)['\"]$/gm;
    const imports = new Set();
    let match;
    while ((match = importPattern.exec(content)) !== null) {
      imports.add(match[1]);
    }
    imports.forEach(importName => {
      const usagePattern = new RegExp(`\\b${path.basename(importName, path.extname(importName))}\\b`, 'g');
      const usages = (content.match(usagePattern) || []).length;
      if (usages <= 1) {
        this.findings.push({
          file: filePath,
          type: 'UNUSED_IMPORT',
          severity: 'low',
          message: `Unused import: ${importName}`,
          suggestion: 'Remove unused import'
        });
      }
    });
  }

  calculateCyclomaticComplexity(code) {
    let complexity = 1;
    const patterns = [/if\s*\(/g, /for\s*\(/g, /while\s*\(/g, /case\s+/g, /catch\s*\(/g, /\?\s*:/g];
    patterns.forEach(pattern => {
      complexity += (code.match(pattern) || []).length;
    });
    return complexity;
  }

  extractFunctionBody(code, startIndex) {
    let braceCount = 0, inBody = false, body = '';
    for (let i = startIndex; i < code.length; i++) {
      const char = code[i];
      if (char === '{') { inBody = true; braceCount++; }
      else if (char === '}') { braceCount--; if (braceCount === 0 && inBody) break; }
      if (inBody) body += char;
    }
    return body;
  }

  shouldExclude(filePath) {
    return this.config.excludePaths.some(excludePath => filePath.includes(excludePath));
  }

  generateReport() {
    const bySeverity = { critical: [], high: [], medium: [], low: [] };
    this.findings.forEach(finding => { bySeverity[finding.severity].push(finding); });
    const passed = this.findings.filter(f => f.severity === 'low').length === this.findings.length;
    return {
      status: passed ? 'PASSED' : 'FAILED',
      total_issues: this.findings.length,
      by_severity: bySeverity,
      findings: this.findings,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = CodeQualityAnalyzer;