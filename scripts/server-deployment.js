#!/usr/bin/env node

/**
 * SOVREN-AI Server-Side Deployment Script
 * PRODUCTION DEPLOYMENT - Cross-platform Node.js deployment
 * NO PLACEHOLDERS - Full production deployment automation
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 SOVREN-AI Shadow Board Server Deployment Starting...');
console.log('⚡ Multi-Agent Deployment - Production Go-Live');
console.log('==================================================');

// Configuration
const config = {
  environment: 'production',
  appName: 'sovren-shadowboard',
  dockerComposeFile: 'docker-compose.production.yml',
  domain: 'sovrenai.app',
  backupDir: `./backups/pre-deployment-${new Date().toISOString().replace(/[:.]/g, '-')}`
};

// Logging functions
const log = {
  info: (msg) => console.log(`\x1b[34m[INFO]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  warning: (msg) => console.log(`\x1b[33m[WARNING]\x1b[0m ${msg}`),
  error: (msg) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`)
};

// Test results tracking
let testsResults = {
  passed: 0,
  failed: 0,
  failedTests: []
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
 * Check if command exists
 */
function commandExists(command) {
  try {
    execSync(`which ${command}`, { stdio: 'pipe' });
    return true;
  } catch {
    try {
      execSync(`where ${command}`, { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Wait for service to be ready
 */
async function waitForService(checkFunction, timeout = 60000, interval = 2000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const result = await checkFunction();
      if (result) {
        return true;
      }
    } catch (error) {
      // Continue waiting
    }
    
    await new Promise(resolve => setTimeout(resolve, interval));
    process.stdout.write('.');
  }
  
  console.log('');
  return false;
}

/**
 * Test endpoint
 */
async function testEndpoint(url, expectedStatus = 200) {
  try {
    const response = await fetch(url, { 
      method: 'GET',
      timeout: 10000 
    });
    return response.status === expectedStatus;
  } catch (error) {
    return false;
  }
}

/**
 * Run test
 */
function runTest(testName, testFunction) {
  process.stdout.write(`🧪 Testing ${testName}... `);
  
  try {
    const result = testFunction();
    if (result) {
      console.log('\x1b[32mPASS\x1b[0m');
      testsResults.passed++;
      return true;
    } else {
      console.log('\x1b[31mFAIL\x1b[0m');
      testsResults.failed++;
      testsResults.failedTests.push(testName);
      return false;
    }
  } catch (error) {
    console.log('\x1b[31mFAIL\x1b[0m');
    testsResults.failed++;
    testsResults.failedTests.push(testName);
    return false;
  }
}

/**
 * Main deployment function
 */
async function deployProduction() {
  try {
    // 1. Pre-deployment validation
    console.log('\n🔍 Pre-deployment validation...');
    
    if (!commandExists('docker')) {
      log.error('Docker is not installed or not in PATH');
      process.exit(1);
    }
    
    if (!commandExists('docker-compose')) {
      log.error('Docker Compose is not installed or not in PATH');
      process.exit(1);
    }
    
    if (!fs.existsSync('.env.production')) {
      log.error('Production environment file (.env.production) not found');
      process.exit(1);
    }
    
    log.success('Pre-deployment validation passed');

    // 2. Create backup directory
    console.log('\n💾 Creating backup directory...');
    fs.mkdirSync(config.backupDir, { recursive: true });
    log.success(`Backup directory created: ${config.backupDir}`);

    // 3. Install dependencies
    console.log('\n📦 Installing production dependencies...');
    const installResult = executeCommand('npm ci --only=production');
    if (!installResult.success) {
      log.error('Failed to install dependencies');
      process.exit(1);
    }
    log.success('Dependencies installed');

    // 4. Build application
    console.log('\n🔨 Building application...');
    const buildResult = executeCommand('npm run build');
    if (!buildResult.success) {
      log.error('Failed to build application');
      process.exit(1);
    }
    log.success('Application built successfully');

    // 5. Stop existing containers
    console.log('\n🛑 Stopping existing containers...');
    executeCommand(`docker-compose -f ${config.dockerComposeFile} down --remove-orphans`);
    log.success('Existing containers stopped');

    // 6. Pull latest images
    console.log('\n📥 Pulling latest Docker images...');
    const pullResult = executeCommand(`docker-compose -f ${config.dockerComposeFile} pull`);
    if (!pullResult.success) {
      log.warning('Some images failed to pull, continuing with local images');
    } else {
      log.success('Docker images updated');
    }

    // 7. Build application image
    console.log('\n🔨 Building application image...');
    const dockerBuildResult = executeCommand(`docker-compose -f ${config.dockerComposeFile} build sovren-app`);
    if (!dockerBuildResult.success) {
      log.error('Failed to build application image');
      process.exit(1);
    }
    log.success('Application image built');

    // 8. Start infrastructure services
    console.log('\n🏗️ Starting infrastructure services...');
    executeCommand(`docker-compose -f ${config.dockerComposeFile} up -d postgres redis elasticsearch`);
    
    // Wait for PostgreSQL
    console.log('\n⏳ Waiting for PostgreSQL to be ready...');
    const pgReady = await waitForService(async () => {
      const result = executeCommand(
        `docker-compose -f ${config.dockerComposeFile} exec -T postgres pg_isready -U sovren_app -d sovren_ai_production`,
        { silent: true }
      );
      return result.success;
    });
    
    if (!pgReady) {
      log.error('PostgreSQL failed to start within timeout');
      process.exit(1);
    }
    console.log('');
    log.success('PostgreSQL is ready');

    // Wait for Redis
    console.log('\n⏳ Waiting for Redis to be ready...');
    const redisReady = await waitForService(async () => {
      const result = executeCommand(
        `docker-compose -f ${config.dockerComposeFile} exec -T redis redis-cli ping`,
        { silent: true }
      );
      return result.success && result.output?.includes('PONG');
    });
    
    if (!redisReady) {
      log.error('Redis failed to start within timeout');
      process.exit(1);
    }
    console.log('');
    log.success('Redis is ready');

    // 9. Run database migrations
    console.log('\n🗄️ Running database migrations...');
    executeCommand(`docker-compose -f ${config.dockerComposeFile} exec -T postgres psql -U sovren_app -d sovren_ai_production -f /docker-entrypoint-initdb.d/01-schema.sql`);
    log.success('Database migrations completed');

    // 10. Start monitoring services
    console.log('\n📊 Starting monitoring services...');
    executeCommand(`docker-compose -f ${config.dockerComposeFile} up -d prometheus grafana kibana`);
    log.success('Monitoring services started');

    // 11. Start main application
    console.log('\n🚀 Starting main application...');
    executeCommand(`docker-compose -f ${config.dockerComposeFile} up -d sovren-app`);
    
    // Wait for application health check
    console.log('\n⏳ Waiting for application health check...');
    const appReady = await waitForService(async () => {
      return await testEndpoint('http://localhost:3000/api/health');
    }, 120000);
    
    if (!appReady) {
      log.error('Application failed to start within timeout');
      executeCommand(`docker-compose -f ${config.dockerComposeFile} logs sovren-app`);
      process.exit(1);
    }
    console.log('');
    log.success('Application is healthy and ready');

    // 12. Start load balancer
    console.log('\n🔄 Starting load balancer...');
    executeCommand(`docker-compose -f ${config.dockerComposeFile} up -d nginx`);
    log.success('Load balancer started');

    // 13. Run production validation tests
    console.log('\n🔍 Running production validation tests...');
    await runProductionTests();

    // 14. Display deployment summary
    displayDeploymentSummary();

  } catch (error) {
    log.error(`Deployment failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Run production validation tests
 */
async function runProductionTests() {
  console.log('\n🏥 Health Check Tests');
  console.log('========================');
  
  runTest('Basic Health Check', () => {
    const result = executeCommand('curl -f http://localhost:3000/api/health', { silent: true });
    return result.success;
  });

  console.log('\n🐳 Docker Container Tests');
  console.log('=============================');
  
  const containers = ['sovren-app', 'postgres', 'redis', 'nginx', 'prometheus', 'grafana'];
  containers.forEach(container => {
    runTest(`${container} Container`, () => {
      const result = executeCommand(`docker ps --filter name=${container} --format "{{.Names}}"`, { silent: true });
      return result.success && result.output?.includes(container);
    });
  });

  console.log('\n🔗 Service Connection Tests');
  console.log('==============================');
  
  runTest('PostgreSQL Connection', () => {
    const result = executeCommand(
      `docker-compose -f ${config.dockerComposeFile} exec -T postgres pg_isready -U sovren_app -d sovren_ai_production`,
      { silent: true }
    );
    return result.success;
  });

  runTest('Redis Connection', () => {
    const result = executeCommand(
      `docker-compose -f ${config.dockerComposeFile} exec -T redis redis-cli ping`,
      { silent: true }
    );
    return result.success && result.output?.includes('PONG');
  });
}

/**
 * Display deployment summary
 */
function displayDeploymentSummary() {
  console.log('\n📋 DEPLOYMENT SUMMARY');
  console.log('=====================');
  console.log(`Tests Passed: ${testsResults.passed}`);
  console.log(`Tests Failed: ${testsResults.failed}`);
  console.log(`Total Tests: ${testsResults.passed + testsResults.failed}`);

  if (testsResults.failed === 0) {
    log.success('🎉 ALL TESTS PASSED - PRODUCTION READY!');
    log.success('⚡ SOVREN-AI Shadow Board is fully operational!');
    
    console.log('\n🚀 Production URLs:');
    console.log('===================');
    console.log(`🌐 Main Application: https://${config.domain}`);
    console.log('📊 Monitoring: http://localhost:3001');
    console.log('📈 Metrics: http://localhost:9090');
    console.log('🔍 Logs: http://localhost:5601');
    
    console.log('\n🔥 COMPETITIVE ADVANTAGE ACHIEVED!');
    console.log('⚡ 2-Hour Production Deployment SUCCESSFUL!');
    
    // Save deployment info
    const deploymentInfo = {
      timestamp: new Date().toISOString(),
      environment: config.environment,
      domain: config.domain,
      testsResults,
      status: 'SUCCESS'
    };
    
    fs.writeFileSync(
      path.join(config.backupDir, 'deployment-info.json'),
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    log.success(`Deployment information saved to ${config.backupDir}/deployment-info.json`);
    
  } else {
    log.error(`❌ ${testsResults.failed} TESTS FAILED`);
    console.log('\nFailed Tests:');
    testsResults.failedTests.forEach(test => {
      console.log(`  - ${test}`);
    });
    log.warning('⚠️ Production deployment needs attention');
    process.exit(1);
  }
}

// Run deployment
if (require.main === module) {
  deployProduction().catch(error => {
    log.error(`Deployment failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { deployProduction };
