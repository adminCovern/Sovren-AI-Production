/**
 * GLOBAL POLYFILL FOR BROWSER GLOBALS
 * Must be loaded before any other modules
 */

// Polyfill browser globals for Node.js environment
if (typeof globalThis !== 'undefined') {
  if (typeof globalThis.self === 'undefined') {
    globalThis.self = globalThis;
  }
  
  if (typeof globalThis.window === 'undefined') {
    globalThis.window = globalThis;
  }
  
  if (typeof globalThis.document === 'undefined') {
    globalThis.document = {
      createElement: () => ({}),
      getElementById: () => null,
      addEventListener: () => {},
      removeEventListener: () => {},
      body: {},
      head: {},
    };
  }
  
  if (typeof globalThis.navigator === 'undefined') {
    globalThis.navigator = {
      userAgent: 'Node.js',
      platform: 'node',
    };
  }
  
  if (typeof globalThis.location === 'undefined') {
    globalThis.location = {
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
