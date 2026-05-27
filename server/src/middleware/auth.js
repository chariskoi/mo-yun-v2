var jwt = require('jsonwebtoken');
var config = require('../config');

function authMiddleware(req, res, next) {
  var header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }
  var token = header.slice(7);
  try {
    var decoded = jwt.verify(token, config.jwtSecret);
    req.userId = decoded.userId;
    next();
  } catch (e) {
    if (e.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '登录已过期，请重新登录' });
    }
    return res.status(401).json({ error: '无效的认证令牌' });
  }
}

module.exports = authMiddleware;
