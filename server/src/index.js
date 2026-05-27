var express = require('express');
var cors = require('cors');
var path = require('path');
var config = require('./config');
var { initDB } = require('./db');
var authRoutes = require('./routes/auth');
var bookRoutes = require('./routes/books');
var syncRoutes = require('./routes/sync');

async function main() {
  await initDB();

  var app = express();
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // 手机阅读器静态文件
  app.use('/reader', express.static(path.resolve(__dirname, '../../mobile-reader')));

  // 路由
  app.use('/api/auth', authRoutes);
  app.use('/api/books', bookRoutes);
  app.use('/api/sync', syncRoutes);

  // 健康检查
  app.get('/api/health', function(req, res) {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.listen(config.port, function() {
    console.log('墨韵云同步服务已启动 → http://localhost:' + config.port);
  });
}

main().catch(function(err) {
  console.error('启动失败:', err);
  process.exit(1);
});
