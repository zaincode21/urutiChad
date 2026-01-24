module.exports = {
  apps: [
    {
      name: 'atelier_uruti',
      script: 'server/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
        DATABASE_URL: 'postgresql://postgres:Serge123@localhost:5432/atelier_uruti',
        JWT_SECRET: 'your-super-secret-jwt-key-change-in-production',
        JWT_EXPIRES_IN: '24h',
        DEFAULT_CURRENCY: 'USD',
        SUPPORTED_CURRENCIES: 'USD,EUR,GBP,JPY,CNY,INR,AED',
        UPLOAD_PATH: './uploads',
        MAX_FILE_SIZE: '5242880'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        DATABASE_URL: 'postgresql://postgres:Serge123@localhost:5432/atelier_uruti',
        JWT_SECRET: 'your-super-secret-jwt-key-change-in-production',
        JWT_EXPIRES_IN: '24h',
        DEFAULT_CURRENCY: 'USD',
        SUPPORTED_CURRENCIES: 'USD,EUR,GBP,JPY,CNY,INR,AED',
        UPLOAD_PATH: './uploads',
        MAX_FILE_SIZE: '5242880'
      },
      cwd: '/home/atelierosJules2',
      watch: false,
      ignore_watch: ['node_modules', 'client', 'uploads', 'database/*.db'],
      max_memory_restart: '1G',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      increment_var: 'PORT',
      watch_options: {
        followSymlinks: false,
        usePolling: true,
        interval: 1000
      }
    },
    {
      name: 'atelier_uruti_frontend',
      script: 'npm',
      args: 'run dev',
      cwd: '/home/atelierosJules2/client',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      watch: false,
      max_memory_restart: '500M',
      error_file: './logs/frontend-err.log',
      out_file: './logs/frontend-out.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ],

  deploy: {
    production: {
      user: 'root',
      host: '84.247.131.178',
      ref: 'origin/main',
      repo: 'https://github.com/zaincode21/atelierosJules2.git',
      path: '/home/atelierosJules2',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && cd client && npm install && cd .. && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};