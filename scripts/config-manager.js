#!/usr/bin/env node

/**
 * SOVREN AI Configuration Manager CLI
 * Command-line tool for managing configuration settings
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function printHeader() {
  console.log(colorize('\n🔧 SOVREN AI Configuration Manager', 'cyan'));
  console.log(colorize('=====================================\n', 'cyan'));
}

function printUsage() {
  console.log(colorize('Usage:', 'bright'));
  console.log('  npm run config <command> [options]\n');
  
  console.log(colorize('Commands:', 'bright'));
  console.log('  validate [env]     Validate configuration for environment');
  console.log('  audit [env]        Perform security audit');
  console.log('  report [env]       Generate configuration report');
  console.log('  health [env]       Check configuration health');
  console.log('  init <env>         Initialize configuration for environment');
  console.log('  check-env          Check environment variables');
  console.log('  generate-env       Generate .env template');
  console.log('  help               Show this help message\n');
  
  console.log(colorize('Environments:', 'bright'));
  console.log('  development (default)');
  console.log('  staging');
  console.log('  production');
  console.log('  test\n');
  
  console.log(colorize('Examples:', 'bright'));
  console.log('  npm run config validate production');
  console.log('  npm run config audit');
  console.log('  npm run config report staging');
  console.log('  npm run config health');
}

async function validateConfiguration(environment = 'development') {
  try {
    console.log(colorize(`🔍 Validating ${environment} configuration...`, 'blue'));
    
    // Set environment
    process.env.NODE_ENV = environment;
    
    // Import and run validation
    const { configManager } = require('../dist/lib/config/ConfigurationManager');
    const { configValidator } = require('../dist/lib/config/ConfigurationValidator');
    
    const config = configManager.getConfig();
    const validation = configValidator.validateConfiguration(config);
    
    console.log(colorize(`\n📊 Validation Results for ${environment}:`, 'bright'));
    console.log(`Configuration Score: ${validation.score}/100`);
    console.log(`Valid: ${validation.valid ? colorize('Yes', 'green') : colorize('No', 'red')}`);
    
    if (validation.errors.length > 0) {
      console.log(colorize('\n❌ Errors:', 'red'));
      validation.errors.forEach(error => {
        console.log(`   • ${error.field}: ${error.message} (${error.severity})`);
        console.log(`     Suggestion: ${error.suggestion}`);
      });
    }
    
    if (validation.warnings.length > 0) {
      console.log(colorize('\n⚠️  Warnings:', 'yellow'));
      validation.warnings.forEach(warning => {
        console.log(`   • ${warning.field}: ${warning.message}`);
        console.log(`     Suggestion: ${warning.suggestion}`);
      });
    }
    
    if (validation.errors.length === 0 && validation.warnings.length === 0) {
      console.log(colorize('\n✅ No issues found!', 'green'));
    }
    
    return validation.valid;
    
  } catch (error) {
    console.error(colorize(`❌ Validation failed: ${error.message}`, 'red'));
    return false;
  }
}

async function performSecurityAudit(environment = 'development') {
  try {
    console.log(colorize(`🛡️ Performing security audit for ${environment}...`, 'blue'));
    
    process.env.NODE_ENV = environment;
    
    const { configManager } = require('../dist/lib/config/ConfigurationManager');
    const { configValidator } = require('../dist/lib/config/ConfigurationValidator');
    
    const config = configManager.getConfig();
    const audit = configValidator.performSecurityAudit(config);
    
    console.log(colorize(`\n🔒 Security Audit Results for ${environment}:`, 'bright'));
    console.log(`Security Score: ${audit.score}/100`);
    
    if (audit.vulnerabilities.length > 0) {
      console.log(colorize('\n🚨 Security Vulnerabilities:', 'red'));
      audit.vulnerabilities.forEach(vuln => {
        const severityColor = vuln.severity === 'critical' ? 'red' : 
                             vuln.severity === 'high' ? 'yellow' : 'blue';
        console.log(`   • ${colorize(vuln.severity.toUpperCase(), severityColor)} - ${vuln.field}`);
        console.log(`     ${vuln.description}`);
        console.log(`     Impact: ${vuln.impact}`);
        console.log(`     Fix: ${vuln.remediation}`);
      });
    }
    
    if (audit.recommendations.length > 0) {
      console.log(colorize('\n💡 Security Recommendations:', 'cyan'));
      audit.recommendations.forEach(rec => {
        console.log(`   • ${rec.category}: ${rec.recommendation} (${rec.priority})`);
      });
    }
    
    if (audit.vulnerabilities.length === 0) {
      console.log(colorize('\n✅ No security vulnerabilities found!', 'green'));
    }
    
    return audit.score >= 80;
    
  } catch (error) {
    console.error(colorize(`❌ Security audit failed: ${error.message}`, 'red'));
    return false;
  }
}

async function generateReport(environment = 'development') {
  try {
    console.log(colorize(`📋 Generating configuration report for ${environment}...`, 'blue'));
    
    process.env.NODE_ENV = environment;
    
    const { configInitializer } = require('../dist/lib/config/ConfigurationInitializer');
    
    await configInitializer.initialize();
    const report = configInitializer.generateConfigurationReport();
    
    console.log('\n' + report);
    
    // Save report to file
    const reportPath = `config-report-${environment}-${Date.now()}.txt`;
    fs.writeFileSync(reportPath, report);
    console.log(colorize(`\n📄 Report saved to: ${reportPath}`, 'green'));
    
    return true;
    
  } catch (error) {
    console.error(colorize(`❌ Report generation failed: ${error.message}`, 'red'));
    return false;
  }
}

async function checkHealth(environment = 'development') {
  try {
    console.log(colorize(`🏥 Checking configuration health for ${environment}...`, 'blue'));
    
    process.env.NODE_ENV = environment;
    
    const { configInitializer } = require('../dist/lib/config/ConfigurationInitializer');
    
    await configInitializer.initialize();
    const health = configInitializer.getConfigurationHealth();
    
    const statusColor = health.status === 'healthy' ? 'green' : 
                       health.status === 'warning' ? 'yellow' : 'red';
    
    console.log(colorize(`\n🏥 Configuration Health for ${environment}:`, 'bright'));
    console.log(`Status: ${colorize(health.status.toUpperCase(), statusColor)}`);
    console.log(`Configuration Score: ${health.score}/100`);
    console.log(`Security Score: ${health.securityScore}/100`);
    
    console.log('\nIssues:');
    console.log(`   Critical: ${colorize(health.issues.critical, 'red')}`);
    console.log(`   High: ${colorize(health.issues.high, 'yellow')}`);
    console.log(`   Medium: ${colorize(health.issues.medium, 'blue')}`);
    console.log(`   Low: ${colorize(health.issues.low, 'cyan')}`);
    
    if (health.recommendations.length > 0) {
      console.log(colorize('\n💡 Top Recommendations:', 'cyan'));
      health.recommendations.slice(0, 5).forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }
    
    return health.status === 'healthy';
    
  } catch (error) {
    console.error(colorize(`❌ Health check failed: ${error.message}`, 'red'));
    return false;
  }
}

async function initializeConfiguration(environment) {
  try {
    console.log(colorize(`🚀 Initializing configuration for ${environment}...`, 'blue'));
    
    process.env.NODE_ENV = environment;
    
    const { configInitializer } = require('../dist/lib/config/ConfigurationInitializer');
    
    const result = await configInitializer.initialize();
    
    if (result.success) {
      console.log(colorize(`✅ Configuration initialized successfully for ${environment}`, 'green'));
    } else {
      console.log(colorize(`❌ Configuration initialization failed for ${environment}`, 'red'));
      
      if (result.errors.length > 0) {
        console.log(colorize('\nErrors:', 'red'));
        result.errors.forEach(error => console.log(`   • ${error}`));
      }
    }
    
    return result.success;
    
  } catch (error) {
    console.error(colorize(`❌ Initialization failed: ${error.message}`, 'red'));
    return false;
  }
}

function checkEnvironmentVariables() {
  console.log(colorize('🔍 Checking environment variables...', 'blue'));
  
  const required = [
    'NODE_ENV',
    'JWT_SECRET',
    'DATABASE_URL',
    'REDIS_URL'
  ];
  
  const optional = [
    'PORT',
    'HOST',
    'BASE_URL',
    'TTS_MODELS_PATH',
    'TTS_OUTPUT_PATH',
    'SMTP_HOST',
    'SMTP_USER'
  ];
  
  console.log(colorize('\n📋 Environment Variables Status:', 'bright'));
  
  console.log(colorize('\nRequired:', 'red'));
  let missingRequired = 0;
  required.forEach(envVar => {
    const exists = process.env[envVar];
    const status = exists ? colorize('✓', 'green') : colorize('✗', 'red');
    console.log(`   ${status} ${envVar}${exists ? ` = ${envVar === 'JWT_SECRET' ? '[HIDDEN]' : process.env[envVar]}` : ''}`);
    if (!exists) missingRequired++;
  });
  
  console.log(colorize('\nOptional:', 'yellow'));
  let missingOptional = 0;
  optional.forEach(envVar => {
    const exists = process.env[envVar];
    const status = exists ? colorize('✓', 'green') : colorize('○', 'yellow');
    console.log(`   ${status} ${envVar}${exists ? ` = ${process.env[envVar]}` : ''}`);
    if (!exists) missingOptional++;
  });
  
  console.log(colorize('\n📊 Summary:', 'bright'));
  console.log(`Required: ${required.length - missingRequired}/${required.length} configured`);
  console.log(`Optional: ${optional.length - missingOptional}/${optional.length} configured`);
  
  if (missingRequired > 0) {
    console.log(colorize(`\n❌ ${missingRequired} required environment variables are missing!`, 'red'));
    return false;
  } else {
    console.log(colorize('\n✅ All required environment variables are configured!', 'green'));
    return true;
  }
}

function generateEnvTemplate() {
  console.log(colorize('📝 Generating .env template...', 'blue'));
  
  const templatePath = '.env.example';
  const outputPath = '.env.generated';
  
  if (fs.existsSync(templatePath)) {
    fs.copyFileSync(templatePath, outputPath);
    console.log(colorize(`✅ Environment template generated: ${outputPath}`, 'green'));
    console.log(colorize('Edit the generated file with your actual values.', 'yellow'));
  } else {
    console.error(colorize(`❌ Template file not found: ${templatePath}`, 'red'));
    return false;
  }
  
  return true;
}

// Main CLI handler
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const environment = args[1] || 'development';
  
  printHeader();
  
  // Build TypeScript files if needed
  if (!fs.existsSync('dist')) {
    console.log(colorize('🔨 Building TypeScript files...', 'yellow'));
    try {
      execSync('npm run build', { stdio: 'inherit' });
    } catch (error) {
      console.error(colorize('❌ Build failed', 'red'));
      process.exit(1);
    }
  }
  
  let success = true;
  
  switch (command) {
    case 'validate':
      success = await validateConfiguration(environment);
      break;
      
    case 'audit':
      success = await performSecurityAudit(environment);
      break;
      
    case 'report':
      success = await generateReport(environment);
      break;
      
    case 'health':
      success = await checkHealth(environment);
      break;
      
    case 'init':
      if (!environment || environment === 'development') {
        console.error(colorize('❌ Please specify an environment for initialization', 'red'));
        success = false;
      } else {
        success = await initializeConfiguration(environment);
      }
      break;
      
    case 'check-env':
      success = checkEnvironmentVariables();
      break;
      
    case 'generate-env':
      success = generateEnvTemplate();
      break;
      
    case 'help':
    case undefined:
      printUsage();
      break;
      
    default:
      console.error(colorize(`❌ Unknown command: ${command}`, 'red'));
      printUsage();
      success = false;
  }
  
  process.exit(success ? 0 : 1);
}

// Run CLI
main().catch(error => {
  console.error(colorize(`💥 Unexpected error: ${error.message}`, 'red'));
  process.exit(1);
});
