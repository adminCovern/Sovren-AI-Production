#!/usr/bin/env node

/**
 * CUSTOM BUILD SCRIPT WITH POLYFILLS
 * Sets up browser globals before running Next.js build
 */

// Set up browser globals for server-side rendering
if (typeof global !== 'undefined') {
  if (typeof global.self === 'undefined') {
    global.self = global;
  }
  
  if (typeof global.window === 'undefined') {
    global.window = global;
  }
  
  if (typeof global.document === 'undefined') {
    global.document = {
      createElement: () => ({}),
      getElementById: () => null,
      addEventListener: () => {},
      removeEventListener: () => {},
      body: {},
      head: {},
    };
  }
  
  if (typeof global.navigator === 'undefined') {
    global.navigator = {
      userAgent: 'Node.js',
      platform: 'node',
    };
  }
  
  if (typeof global.location === 'undefined') {
    global.location = {
      href: '',
      origin: '',
      protocol: 'http:',
      host: 'localhost',
      hostname: 'localhost',
      port: '',
      pathname: '/',
      search: '',
      hash: '',
    };
  }
}

console.log('✅ Browser globals polyfilled for server-side rendering');

// Run Next.js build
const { spawn } = require('child_process');
const path = require('path');

const nextBuild = spawn('npx', ['next', 'build'], {
  stdio: 'inherit',
  cwd: process.cwd(),
  shell: true
});

nextBuild.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Next.js build completed successfully');
    
    // Run TypeScript compilation for server
    const tscBuild = spawn('npx', ['tsc', '--project', 'tsconfig.server.json'], {
      stdio: 'inherit',
      cwd: process.cwd(),
      shell: true
    });
    
    tscBuild.on('close', (tscCode) => {
      if (tscCode === 0) {
        console.log('✅ TypeScript server compilation completed successfully');
        process.exit(0);
      } else {
        console.error('❌ TypeScript server compilation failed');
        process.exit(tscCode);
      }
    });
  } else {
    console.error('❌ Next.js build failed');
    process.exit(code);
  }
});
