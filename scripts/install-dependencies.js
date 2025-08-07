#!/usr/bin/env node

/**
 * SOVREN-AI Dependencies Installation Script
 * PRODUCTION DEPLOYMENT - Install all required packages
 * NO PLACEHOLDERS - Complete dependency management
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('📦 SOVREN-AI Dependencies Installation');
console.log('⚡ Installing all required packages...');
console.log('=====================================');

// Logging functions
const log = {
  info: (msg) => console.log(`\x1b[34m[INFO]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  warning: (msg) => console.log(`\x1b[33m[WARNING]\x1b[0m ${msg}`),
  error: (msg) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`)
};

/**
 * Execute command with error handling
 */
function executeCommand(command, options = {}) {
  try {
    log.info(`Executing: ${command}`);
    const result = execSync(command, { 
      stdio: options.silent ? 'pipe' : 'inherit',
      encoding: 'utf8',
      ...options 
    });
    return { success: true, output: result };
  } catch (error) {
    log.error(`Command failed: ${command}`);
    log.error(`Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Check if package.json exists
 */
function checkPackageJson() {
  if (!fs.existsSync('package.json')) {
    log.error('package.json not found in current directory');
    process.exit(1);
  }
  log.success('package.json found');
}

/**
 * Install dependencies
 */
function installDependencies() {
  console.log('\n📦 Installing production dependencies...');
  
  // Clean install
  const cleanResult = executeCommand('npm ci');
  if (!cleanResult.success) {
    log.warning('npm ci failed, trying npm install...');
    
    const installResult = executeCommand('npm install');
    if (!installResult.success) {
      log.error('Failed to install dependencies');
      process.exit(1);
    }
  }
  
  log.success('Dependencies installed successfully');
}

/**
 * Verify critical packages
 */
function verifyCriticalPackages() {
  console.log('\n🔍 Verifying critical packages...');
  
  const criticalPackages = [
    'next',
    'react',
    'react-dom',
    'pg',
    'ioredis',
    'stripe',
    'jsonwebtoken',
    'rate-limiter-flexible'
  ];
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const allDependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  
  let missingPackages = [];
  
  criticalPackages.forEach(pkg => {
    if (!allDependencies[pkg]) {
      missingPackages.push(pkg);
      log.warning(`Missing critical package: ${pkg}`);
    } else {
      log.success(`✓ ${pkg} - ${allDependencies[pkg]}`);
    }
  });
  
  if (missingPackages.length > 0) {
    log.error(`Missing ${missingPackages.length} critical packages`);
    console.log('\nInstalling missing packages...');
    
    const installCmd = `npm install ${missingPackages.join(' ')}`;
    const result = executeCommand(installCmd);
    
    if (!result.success) {
      log.error('Failed to install missing packages');
      process.exit(1);
    }
    
    log.success('Missing packages installed');
  }
}

/**
 * Check TypeScript compilation
 */
function checkTypeScript() {
  console.log('\n🔧 Checking TypeScript compilation...');
  
  const typeCheckResult = executeCommand('npm run type-check', { silent: true });
  if (!typeCheckResult.success) {
    log.warning('TypeScript compilation has issues');
    log.info('Running type check with output...');
    executeCommand('npm run type-check');
  } else {
    log.success('TypeScript compilation successful');
  }
}

/**
 * Build application
 */
function buildApplication() {
  console.log('\n🔨 Building application...');
  
  const buildResult = executeCommand('npm run build');
  if (!buildResult.success) {
    log.error('Application build failed');
    process.exit(1);
  }
  
  log.success('Application built successfully');
}

/**
 * Main installation function
 */
function main() {
  try {
    // Check if we're in the right directory
    checkPackageJson();
    
    // Install dependencies
    installDependencies();
    
    // Verify critical packages
    verifyCriticalPackages();
    
    // Check TypeScript
    checkTypeScript();
    
    // Build application
    buildApplication();
    
    console.log('\n✅ INSTALLATION COMPLETE');
    console.log('========================');
    log.success('🎉 All dependencies installed and application built!');
    log.success('⚡ Ready for production deployment!');
    
    console.log('\n🚀 Next Steps:');
    console.log('1. Run: node scripts/server-deployment.js');
    console.log('2. Or use Docker: docker-compose -f docker-compose.production.yml up -d');
    
  } catch (error) {
    log.error(`Installation failed: ${error.message}`);
    process.exit(1);
  }
}

// Run installation
if (require.main === module) {
  main();
}

module.exports = { main };
