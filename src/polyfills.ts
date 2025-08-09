/**
 * BROWSER POLYFILLS FOR SERVER-SIDE RENDERING
 * Provides browser globals when running in Node.js environment
 */

// Polyfill browser globals for server-side rendering
if (typeof globalThis !== 'undefined') {
  // Polyfill self - this is the main issue
  if (typeof globalThis.self === 'undefined') {
    (globalThis as any).self = globalThis;
  }

  // Polyfill window
  if (typeof globalThis.window === 'undefined') {
    (globalThis as any).window = globalThis;
  }

  // Polyfill document
  if (typeof globalThis.document === 'undefined') {
    (globalThis as any).document = {
      createElement: () => ({}),
      getElementById: () => null,
      addEventListener: () => {},
      removeEventListener: () => {},
      body: {},
      head: {},
      documentElement: {},
    };
  }

  // Polyfill navigator
  if (typeof globalThis.navigator === 'undefined') {
    (globalThis as any).navigator = {
      userAgent: 'Node.js',
      platform: 'node',
      language: 'en-US',
      languages: ['en-US'],
    };
  }

  // Polyfill location
  if (typeof globalThis.location === 'undefined') {
    (globalThis as any).location = {
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000',
      protocol: 'http:',
      host: 'localhost:3000',
      hostname: 'localhost',
      port: '3000',
      pathname: '/',
      search: '',
      hash: '',
    };
  }

  // Polyfill performance
  if (typeof globalThis.performance === 'undefined') {
    (globalThis as any).performance = {
      now: () => Date.now(),
      mark: () => {},
      measure: () => {},
    };
  }
}
