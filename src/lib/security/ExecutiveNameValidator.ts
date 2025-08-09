/**
 * Executive Name Security Validator
 * CRITICAL SECURITY COMPONENT: Prevents hardcoded executive names
 * 
 * This system validates that no component uses hardcoded executive names,
 * ensuring proper user isolation for Shadow Board executives.
 */

export class ExecutiveNameValidator {
  // FORBIDDEN: These names should NEVER appear hardcoded in components
  private static readonly FORBIDDEN_HARDCODED_NAMES = [
    // Old hardcoded names that were causing security issues
    'Sarah Chen', 'Marcus Rivera', 'Alex Kim', 'Diana Blackstone',
    'James Wright', 'Lisa Martinez', 'Robert Taylor', 'Jennifer Walsh',
    'Michael Torres', 'Carlos Mendez', 'Ahmed Hassan', 'Elena Volkov',
    'Sarah Mitchell', 'Robert Zhang', 'James Anderson', 'Priya Sharma',
    'Jennifer Brooks', 'Aisha Johnson', 'Thomas Mueller', 'Yuki Sato',
    'Lisa Wang', 'Rachel Green', 'Hiroshi Tanaka', 'Daniel Foster',
    'Maria Santos', 'Kevin O\'Brien', 'Fatima Al-Rashid', 'Zhang Wei',
    'Amanda Clarke', 'Raj Gupta', 'Isabella Romano', 'Samuel Jackson',
    'Mei Lin', 'Antonio Silva', 'Catherine Moore', 'Omar Khalil',
    'Yuki Nakamura', 'Jonathan Steel', 'Natasha Petrov', 'Gabriel Martinez',
    'Zara Khan', 'Akira Yamamoto'
  ];

  // FORBIDDEN: These patterns indicate hardcoded executive usage
  private static readonly FORBIDDEN_PATTERNS = [
    /name:\s*['"`]([A-Z][a-z]+\s+[A-Z][a-z]+)['"`]/g, // name: "First Last"
    /['"`]([A-Z][a-z]+\s+[A-Z][a-z]+)['"`]\s*,\s*['"`](CFO|CTO|CMO|CLO|COO|CHRO|CSO)['"`]/g, // "Name", "Role"
    /CFO.*['"`]([A-Z][a-z]+\s+[A-Z][a-z]+)['"`]/g, // CFO: "Name"
    /CTO.*['"`]([A-Z][a-z]+\s+[A-Z][a-z]+)['"`]/g, // CTO: "Name"
    /CMO.*['"`]([A-Z][a-z]+\s+[A-Z][a-z]+)['"`]/g, // CMO: "Name"
  ];

  /**
   * Validate that code content doesn't contain hardcoded executive names
   */
  public static validateCodeContent(
    componentName: string, 
    codeContent: string,
    throwOnViolation: boolean = true
  ): { isValid: boolean; violations: string[] } {
    const violations: string[] = [];

    // Check for forbidden hardcoded names
    for (const forbiddenName of this.FORBIDDEN_HARDCODED_NAMES) {
      if (codeContent.includes(forbiddenName)) {
        violations.push(
          `SECURITY VIOLATION: Component ${componentName} contains hardcoded executive name "${forbiddenName}". ` +
          `Use ExecutiveAccessManager.getUserExecutives() instead.`
        );
      }
    }

    // Check for forbidden patterns
    for (const pattern of this.FORBIDDEN_PATTERNS) {
      const matches = codeContent.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].length > 3) { // Avoid false positives
          violations.push(
            `SECURITY VIOLATION: Component ${componentName} contains hardcoded name pattern "${match[0]}". ` +
            `Use ExecutiveAccessManager for user-specific executive access.`
          );
        }
      }
    }

    if (violations.length > 0 && throwOnViolation) {
      throw new Error(`SECURITY VIOLATIONS DETECTED:\n${violations.join('\n')}`);
    }

    return {
      isValid: violations.length === 0,
      violations
    };
  }

  /**
   * Validate that a file doesn't contain hardcoded executive names
   */
  public static async validateFile(filePath: string): Promise<{ isValid: boolean; violations: string[] }> {
    try {
      const fs = await import('fs/promises');
      const fileContent = await fs.readFile(filePath, 'utf-8');
      return this.validateCodeContent(filePath, fileContent, false);
    } catch (error) {
      return {
        isValid: false,
        violations: [`Failed to read file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Validate multiple files for hardcoded executive names
   */
  public static async validateFiles(filePaths: string[]): Promise<{
    totalFiles: number;
    validFiles: number;
    invalidFiles: number;
    violations: Array<{ file: string; violations: string[] }>;
  }> {
    const results = await Promise.all(
      filePaths.map(async (filePath) => {
        const result = await this.validateFile(filePath);
        return { file: filePath, ...result };
      })
    );

    const violations = results.filter(r => !r.isValid);
    
    return {
      totalFiles: results.length,
      validFiles: results.length - violations.length,
      invalidFiles: violations.length,
      violations: violations.map(v => ({ file: v.file, violations: v.violations }))
    };
  }

  /**
   * Get list of approved executive access patterns
   */
  public static getApprovedPatterns(): string[] {
    return [
      'ExecutiveAccessManager.getUserExecutives(userId)',
      'ExecutiveAccessManager.getUserExecutive(userId, role)',
      'ExecutiveAccessManager.getUserExecutiveNames(userId)',
      'executiveAccessManager.ensureUserShadowBoard(userId)',
      'shadowBoardManager.getShadowBoard(userId)',
      'globalNameRegistry.reserveUniqueName(role, userId)',
      'B200AutoScalerFactory.getForUser(userId)'
    ];
  }

  /**
   * Check if code uses approved executive access patterns
   */
  public static hasApprovedPatterns(codeContent: string): boolean {
    const approvedPatterns = this.getApprovedPatterns();
    return approvedPatterns.some(pattern => {
      const methodParts = pattern.split('(');
      if (methodParts.length > 0) {
        return codeContent.includes(methodParts[0]); // Check for method name
      }
      return false;
    });
  }

  /**
   * Generate security report for codebase
   */
  public static generateSecurityReport(validationResults: {
    totalFiles: number;
    validFiles: number;
    invalidFiles: number;
    violations: Array<{ file: string; violations: string[] }>;
  }): string {
    const report = [
      '🔐 EXECUTIVE NAME SECURITY VALIDATION REPORT',
      '=' .repeat(50),
      '',
      `📊 SUMMARY:`,
      `   Total Files Checked: ${validationResults.totalFiles}`,
      `   ✅ Valid Files: ${validationResults.validFiles}`,
      `   ❌ Invalid Files: ${validationResults.invalidFiles}`,
      `   🔒 Security Status: ${validationResults.invalidFiles === 0 ? 'SECURE' : 'VIOLATIONS DETECTED'}`,
      ''
    ];

    if (validationResults.violations.length > 0) {
      report.push('🚨 SECURITY VIOLATIONS:');
      report.push('-'.repeat(30));
      
      for (const violation of validationResults.violations) {
        report.push(`\n📁 File: ${violation.file}`);
        for (const v of violation.violations) {
          report.push(`   ❌ ${v}`);
        }
      }
      
      report.push('');
      report.push('🔧 REMEDIATION STEPS:');
      report.push('1. Replace hardcoded executive names with ExecutiveAccessManager calls');
      report.push('2. Use getUserExecutives(userId) to get user-specific executives');
      report.push('3. Ensure all components require userId for executive access');
      report.push('4. Test with multiple users to verify isolation');
    } else {
      report.push('✅ NO SECURITY VIOLATIONS DETECTED');
      report.push('All files properly use ExecutiveAccessManager for executive access.');
    }

    report.push('');
    report.push('📋 APPROVED ACCESS PATTERNS:');
    for (const pattern of this.getApprovedPatterns()) {
      report.push(`   ✅ ${pattern}`);
    }

    return report.join('\n');
  }

  /**
   * Runtime validation for component initialization
   */
  public static validateComponentInitialization(
    componentName: string,
    hasUserId: boolean,
    usesExecutiveAccessManager: boolean
  ): void {
    if (!hasUserId) {
      throw new Error(
        `SECURITY VIOLATION: Component ${componentName} must require userId for executive access. ` +
        `Components cannot access executives without user context.`
      );
    }

    if (!usesExecutiveAccessManager) {
      console.warn(
        `⚠️ SECURITY WARNING: Component ${componentName} should use ExecutiveAccessManager ` +
        `for secure executive access instead of direct Shadow Board access.`
      );
    }
  }

  /**
   * Validate API endpoint for proper executive access
   */
  public static validateAPIEndpoint(
    endpointName: string,
    hasUserIdValidation: boolean,
    hasExecutiveAccessValidation: boolean
  ): void {
    if (!hasUserIdValidation) {
      throw new Error(
        `SECURITY VIOLATION: API endpoint ${endpointName} must validate userId ` +
        `before allowing executive access.`
      );
    }

    if (!hasExecutiveAccessValidation) {
      throw new Error(
        `SECURITY VIOLATION: API endpoint ${endpointName} must validate executive access ` +
        `using ExecutiveAccessManager before returning executive data.`
      );
    }
  }

  /**
   * Get security best practices
   */
  public static getSecurityBestPractices(): string[] {
    return [
      '🔐 NEVER hardcode executive names in components',
      '👤 ALWAYS require userId for executive access',
      '🛡️ USE ExecutiveAccessManager for all executive operations',
      '🔍 VALIDATE executive access before returning data',
      '📝 LOG all executive access for security auditing',
      '🧪 TEST with multiple users to verify isolation',
      '⚡ CACHE user executives securely with proper cleanup',
      '🚨 MONITOR for hardcoded name violations in CI/CD'
    ];
  }
}

// Export validation functions for use in build process
export const validateCodeForHardcodedNames = ExecutiveNameValidator.validateCodeContent;
export const validateFileForHardcodedNames = ExecutiveNameValidator.validateFile;
export const generateSecurityReport = ExecutiveNameValidator.generateSecurityReport;
