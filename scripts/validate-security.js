#!/usr/bin/env node

/**
 * Security Validation Script
 * Validates that no hardcoded executive names exist in the codebase
 */

const fs = require('fs');
const path = require('path');

// FORBIDDEN: These names should NEVER appear hardcoded in components
const FORBIDDEN_HARDCODED_NAMES = [
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

// Files to exclude from validation
const EXCLUDED_FILES = [
  'ExecutiveAccessManager.ts',
  'ExecutiveNameValidator.ts',
  'validate-security.js',
  'ShadowBoardInitializer.ts', // Contains legitimate name pools
  'GlobalNameRegistry.ts' // Contains legitimate name pools
];

// Directories to scan
const SCAN_DIRECTORIES = [
  'src',
  'config',
  'scripts'
];

function scanDirectory(dirPath, violations = []) {
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and other build directories
      if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(item)) {
        scanDirectory(fullPath, violations);
      }
    } else if (stat.isFile()) {
      // Check relevant file types
      if (/\.(ts|tsx|js|jsx|json)$/.test(item) && !EXCLUDED_FILES.includes(item)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const fileViolations = validateFileContent(fullPath, content);
        violations.push(...fileViolations);
      }
    }
  }
  
  return violations;
}

function validateFileContent(filePath, content) {
  const violations = [];
  
  // Check for forbidden hardcoded names
  for (const forbiddenName of FORBIDDEN_HARDCODED_NAMES) {
    if (content.includes(forbiddenName)) {
      violations.push({
        file: filePath,
        violation: `Contains hardcoded executive name: "${forbiddenName}"`,
        type: 'HARDCODED_NAME'
      });
    }
  }
  
  return violations;
}

function generateReport(violations) {
  console.log('🔐 EXECUTIVE NAME SECURITY VALIDATION REPORT');
  console.log('='.repeat(50));
  console.log('');
  
  if (violations.length === 0) {
    console.log('✅ NO SECURITY VIOLATIONS DETECTED');
    console.log('All files properly avoid hardcoded executive names.');
    console.log('');
    console.log('🛡️ SECURITY STATUS: SECURE');
    return true;
  } else {
    console.log(`🚨 ${violations.length} SECURITY VIOLATIONS DETECTED`);
    console.log('');
    
    const violationsByFile = violations.reduce((acc, v) => {
      if (!acc[v.file]) acc[v.file] = [];
      acc[v.file].push(v);
      return acc;
    }, {});
    
    for (const [file, fileViolations] of Object.entries(violationsByFile)) {
      console.log(`📁 ${file}`);
      for (const violation of fileViolations) {
        console.log(`   ❌ ${violation.violation}`);
      }
      console.log('');
    }
    
    console.log('🔧 REMEDIATION REQUIRED:');
    console.log('1. Replace hardcoded executive names with ExecutiveAccessManager calls');
    console.log('2. Use getUserExecutives(userId) for user-specific executives');
    console.log('3. Ensure all components require userId for executive access');
    console.log('');
    console.log('🛡️ SECURITY STATUS: VIOLATIONS DETECTED');
    return false;
  }
}

function main() {
  console.log('🔍 Scanning codebase for hardcoded executive names...');
  console.log('');
  
  let allViolations = [];
  
  for (const dir of SCAN_DIRECTORIES) {
    if (fs.existsSync(dir)) {
      console.log(`📂 Scanning ${dir}/...`);
      const violations = scanDirectory(dir);
      allViolations.push(...violations);
    }
  }
  
  console.log('');
  const isSecure = generateReport(allViolations);
  
  console.log('');
  console.log('📋 APPROVED ACCESS PATTERNS:');
  console.log('   ✅ ExecutiveAccessManager.getUserExecutives(userId)');
  console.log('   ✅ ExecutiveAccessManager.getUserExecutive(userId, role)');
  console.log('   ✅ B200AutoScalerFactory.getForUser(userId)');
  console.log('   ✅ shadowBoardManager.getShadowBoard(userId)');
  console.log('   ✅ globalNameRegistry.reserveUniqueName(role, userId)');
  
  process.exit(isSecure ? 0 : 1);
}

if (require.main === module) {
  main();
}
