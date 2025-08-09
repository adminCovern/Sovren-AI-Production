#!/usr/bin/env node

/**
 * SOVREN AI Production Server
 * Optimized for B200 GPU Infrastructure
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

// Configuration
const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// B200 GPU Detection and Initialization
async function initializeB200Resources() {
  console.log('🚀 Initializing B200 Blackwell GPU Resources...');
  
  try {
    // Check NVIDIA GPU availability
    const { execSync } = require('child_process');
    
    try {
      const gpuInfo = execSync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits', { encoding: 'utf8' });
      const gpus = gpuInfo.trim().split('\n');
      
      console.log(`✅ Detected ${gpus.length} NVIDIA GPUs:`);
      gpus.forEach((gpu, index) => {
        console.log(`   GPU ${index}: ${gpu}`);
      });
      
      // Check for B200 specifically
      const b200Count = gpus.filter(gpu => gpu.includes('B200')).length;
      if (b200Count > 0) {
        console.log(`🎯 Found ${b200Count} B200 Blackwell GPUs - Optimal configuration detected!`);
        process.env.B200_GPU_COUNT = b200Count.toString();
        process.env.TOTAL_VRAM_GB = (b200Count * 183).toString(); // 183GB per B200
      } else {
        console.log('⚠️  No B200 GPUs detected - using available NVIDIA GPUs');
      }
      
    } catch (error) {
      console.log('⚠️  NVIDIA GPU detection failed - running in CPU mode');
      console.log('   This is normal if GPUs are not available or nvidia-smi is not installed');
    }
    
    // Set B200 optimization flags
    process.env.CUDA_VISIBLE_DEVICES = process.env.CUDA_VISIBLE_DEVICES || 'all';
    process.env.NVIDIA_VISIBLE_DEVICES = process.env.NVIDIA_VISIBLE_DEVICES || 'all';
    
    console.log('✅ B200 resource initialization completed');
    
  } catch (error) {
    console.error('❌ B200 resource initialization failed:', error.message);
    console.log('   Continuing with standard configuration...');
  }
}

// Enhanced error handling for production
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  
  // Graceful shutdown
  setTimeout(() => {
    console.log('🛑 Shutting down due to uncaught exception');
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit on unhandled rejections in production - just log them
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('📡 SIGTERM received - starting graceful shutdown');
  server.close(() => {
    console.log('✅ Server closed gracefully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📡 SIGINT received - starting graceful shutdown');
  server.close(() => {
    console.log('✅ Server closed gracefully');
    process.exit(0);
  });
});

// Memory monitoring for B200 servers
function startMemoryMonitoring() {
  setInterval(() => {
    const used = process.memoryUsage();
    const memoryMB = {
      rss: Math.round(used.rss / 1024 / 1024),
      heapTotal: Math.round(used.heapTotal / 1024 / 1024),
      heapUsed: Math.round(used.heapUsed / 1024 / 1024),
      external: Math.round(used.external / 1024 / 1024)
    };
    
    // Log memory usage every 5 minutes
    if (memoryMB.heapUsed > 1000) { // Only log if using more than 1GB
      console.log(`📊 Memory Usage: RSS: ${memoryMB.rss}MB, Heap: ${memoryMB.heapUsed}/${memoryMB.heapTotal}MB, External: ${memoryMB.external}MB`);
    }
  }, 5 * 60 * 1000); // 5 minutes
}

// Custom request handler with B200 optimizations
async function customRequestHandler(req, res) {
  try {
    const parsedUrl = parse(req.url, true);
    
    // Add B200 GPU information to health checks
    if (parsedUrl.pathname === '/api/health') {
      // Add GPU info to request context
      req.b200Info = {
        gpuCount: process.env.B200_GPU_COUNT || '0',
        totalVram: process.env.TOTAL_VRAM_GB || '0',
        cudaDevices: process.env.CUDA_VISIBLE_DEVICES || 'none'
      };
    }
    
    // Handle the request with Next.js
    await handle(req, res, parsedUrl);
    
  } catch (error) {
    console.error('❌ Request handling error:', error);
    
    // Send error response if headers haven't been sent
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'Internal Server Error',
        message: dev ? error.message : 'Something went wrong'
      }));
    }
  }
}

// Main server initialization
async function startServer() {
  try {
    console.log('🚀 Starting SOVREN AI Production Server...');
    console.log(`📍 Environment: ${process.env.NODE_ENV}`);
    console.log(`🌐 Hostname: ${hostname}`);
    console.log(`🔌 Port: ${port}`);
    
    // Initialize B200 resources
    await initializeB200Resources();
    
    // Prepare Next.js app
    console.log('⚙️  Preparing Next.js application...');
    await app.prepare();
    
    // Create HTTP server
    const server = createServer(customRequestHandler);
    
    // Configure server settings for production
    server.keepAliveTimeout = 65000; // Slightly higher than ALB idle timeout
    server.headersTimeout = 66000;   // Slightly higher than keepAliveTimeout
    
    // Start memory monitoring
    startMemoryMonitoring();
    
    // Start listening
    server.listen(port, hostname, (err) => {
      if (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
      }
      
      console.log('');
      console.log('🎉 SOVREN AI Server Successfully Started!');
      console.log('==========================================');
      console.log(`🌐 Server URL: http://${hostname}:${port}`);
      console.log(`📊 Admin Dashboard: http://${hostname}:${port}/dashboard/b200`);
      console.log(`🔍 Health Check: http://${hostname}:${port}/api/health`);
      console.log(`🎯 Shadow Board API: http://${hostname}:${port}/api/shadowboard`);
      console.log('');
      
      if (process.env.B200_GPU_COUNT) {
        console.log(`🚀 B200 Blackwell GPUs: ${process.env.B200_GPU_COUNT} GPUs`);
        console.log(`💾 Total VRAM: ${process.env.TOTAL_VRAM_GB}GB`);
        console.log('');
      }
      
      console.log('✅ Ready to serve Shadow Board executives!');
      console.log('');
    });
    
    // Store server reference for graceful shutdown
    global.server = server;
    
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  console.error('❌ Fatal server error:', error);
  process.exit(1);
});
