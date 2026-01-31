// PM2 进程管理配置文件
// 用于手动部署方式

module.exports = {
  apps: [{
    name: 'jiaxiaotong-server',
    script: 'dist/index.js',
    cwd: '/var/www/jiaxiaotong/server',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production'
    },
    error_file: '/var/log/jiaxiaotong/pm2-error.log',
    out_file: '/var/log/jiaxiaotong/pm2-out.log',
    log_file: '/var/log/jiaxiaotong/pm2-combined.log',
    time: true
  }]
};
