/**
 * SOVREN AI PM2 ECOSYSTEM CONFIGURATION
 * Bare metal production deployment with PM2 process management
 */

module.exports = {
  apps: [
    {
      name: 'sovren-ai-production',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/sovren-ai',
      instances: 'max', // Use all CPU cores
      exec_mode: 'cluster',
      
      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        NEXT_TELEMETRY_DISABLED: 1
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_TELEMETRY_DISABLED: 1,
        
        // Database configuration
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_NAME: 'sovren_ai_prod',
        DB_USER: 'sovren_user',
        DB_PASSWORD: process.env.DB_PASSWORD,
        
        // Security
        JWT_SECRET: process.env.JWT_SECRET,
        ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
        
        // TTS Backend
        TTS_MODELS_PATH: '/var/lib/sovren-ai/models',
        TTS_OUTPUT_PATH: '/var/www/sovren-ai/public/audio/generated',
        PYTHON_PATH: '/usr/bin/python3',
        STYLETTS2_PATH: '/opt/styletts2',
        
        // Redis (if available)
        REDIS_URL: process.env.REDIS_URL,
        
        // Monitoring
        ENABLE_MONITORING: true,
        LOG_LEVEL: 'info'
      },
      
      // Process management
      watch: false, // Disable in production
      ignore_watch: ['node_modules', 'logs', '.git'],
      
      // Logging
      log_file: '/var/log/sovren-ai/combined.log',
      out_file: '/var/log/sovren-ai/out.log',
      error_file: '/var/log/sovren-ai/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto-restart configuration
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      
      // Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Performance
      node_args: [
        '--max-old-space-size=2048',
        '--optimize-for-size'
      ],
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Source map support
      source_map_support: true,
      
      // Merge logs
      merge_logs: true,
      
      // Time zone
      time: true
    },
    
    // TTS Backend Service (separate process)
    {
      name: 'sovren-tts-backend',
      script: '/opt/styletts2/server.py',
      interpreter: '/usr/bin/python3',
      cwd: '/opt/styletts2',
      instances: 2, // Limited instances for TTS processing
      exec_mode: 'cluster',
      
      env_production: {
        PYTHONPATH: '/opt/styletts2',
        TTS_PORT: 8001,
        TTS_HOST: '127.0.0.1',
        MODEL_PATH: '/var/lib/sovren-ai/models',
        CACHE_DIR: '/var/cache/sovren-ai/tts',
        LOG_LEVEL: 'INFO'
      },
      
      // Logging
      log_file: '/var/log/sovren-ai/tts-combined.log',
      out_file: '/var/log/sovren-ai/tts-out.log',
      error_file: '/var/log/sovren-ai/tts-error.log',
      
      // Auto-restart
      autorestart: true,
      max_restarts: 5,
      min_uptime: '30s',
      max_memory_restart: '2G',
      
      // Health check
      health_check_grace_period: 10000
    },
    
    // Database backup service
    {
      name: 'sovren-db-backup',
      script: '/usr/local/bin/sovren-backup.sh',
      cron_restart: '0 2 * * *', // Daily at 2 AM
      autorestart: false,
      
      env_production: {
        BACKUP_DIR: '/var/backups/sovren-ai',
        DB_NAME: 'sovren_ai_prod',
        RETENTION_DAYS: 30
      },
      
      log_file: '/var/log/sovren-ai/backup.log'
    },
    
    // System monitoring
    {
      name: 'sovren-monitor',
      script: '/usr/local/bin/sovren-monitor.js',
      cwd: '/var/www/sovren-ai',
      instances: 1,
      
      env_production: {
        MONITOR_INTERVAL: 30000, // 30 seconds
        ALERT_EMAIL: process.env.ALERT_EMAIL,
        METRICS_PORT: 9090
      },
      
      log_file: '/var/log/sovren-ai/monitor.log',
      autorestart: true
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'sovren',
      host: ['production-server-1', 'production-server-2'],
      ref: 'origin/main',
      repo: 'git@github.com:sovren-ai/production.git',
      path: '/var/www/sovren-ai',
      
      // Pre-deployment
      'pre-deploy-local': 'echo "Starting deployment..."',
      
      // Post-receive
      'post-deploy': [
        'npm ci --production',
        'npm run build',
        'pm2 reload ecosystem.config.js --env production',
        'pm2 save'
      ].join(' && '),
      
      // Post-setup
      'post-setup': [
        'ls -la',
        'npm ci --production',
        'npm run build',
        'pm2 start ecosystem.config.js --env production',
        'pm2 save',
        'pm2 startup'
      ].join(' && '),
      
      // Environment
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};
