import '../polyfills';
import 'reflect-metadata';
import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Orbitron } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers/Providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SOVREN AI - Executive Command Center',
  description: 'Neural War Terminal - Reality-Transcending Business Operating System',
  keywords: [
    'SOVREN AI',
    'Executive Command Center',
    'Neural War Terminal',
    'AI Executives',
    'Business Operating System',
    'Voice Integration',
    'Real-time Collaboration',
  ],
  authors: [{ name: 'SOVREN AI', url: 'https://sovren.ai' }],
  creator: 'SOVREN AI',
  publisher: 'SOVREN AI',
  robots: {
    index: false,
    follow: false,
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  themeColor: '#0c4a6e',
  colorScheme: 'dark',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://command.sovren.ai',
    title: 'SOVREN AI - Executive Command Center',
    description: 'Neural War Terminal - Reality-Transcending Business Operating System',
    siteName: 'SOVREN AI Command Center',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SOVREN AI - Executive Command Center',
    description: 'Neural War Terminal - Reality-Transcending Business Operating System',
    creator: '@sovrenai',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html 
      lang="en" 
      className={`${inter.variable} ${jetbrainsMono.variable} ${orbitron.variable} dark`}
      suppressHydrationWarning
    >
      <head>
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SOVREN AI" />
        <meta name="application-name" content="SOVREN AI Command Center" />
        <meta name="msapplication-TileColor" content="#0c4a6e" />
        <meta name="theme-color" content="#0c4a6e" />
        
        {/* Preload critical resources */}
        <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/orbitron-var.woff2" as="font" type="font/woff2" crossOrigin="" />
        
        {/* WebGL and advanced browser features */}
        <meta httpEquiv="origin-trial" content="WebGL2RenderingContext" />
        <meta name="supported-color-schemes" content="dark" />
        
        {/* Performance hints */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body 
        className="min-h-screen bg-neural-gradient font-sans antialiased overflow-hidden"
        suppressHydrationWarning
      >
        <Providers>
          <div id="neural-war-terminal" className="relative h-screen w-screen">
            {children}
          </div>
          
          {/* WebGL Context Fallback */}
          <noscript>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-neural-900">
              <div className="text-center text-neural-100">
                <h1 className="text-2xl font-display mb-4">SOVREN AI Command Center</h1>
                <p className="text-neural-300">
                  JavaScript and WebGL are required for the Neural War Terminal.
                </p>
              </div>
            </div>
          </noscript>
          
          {/* Loading Indicator */}
          <div id="neural-loading" className="fixed inset-0 z-40 bg-neural-900 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-pulse-glow text-neural-400 text-6xl font-display mb-4">
                SOVREN AI
              </div>
              <div className="text-neural-300 font-mono">
                Initializing Neural War Terminal...
              </div>
              <div className="mt-4 flex justify-center space-x-1">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-8 bg-neural-400 animate-voice-wave"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
