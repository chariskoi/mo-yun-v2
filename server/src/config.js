require('dotenv').config();
module.exports = {
  port:      parseInt(process.env.PORT || '3001'),
  jwtSecret: process.env.JWT_SECRET || 'mo-yun-dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  dbPath:    process.env.DB_PATH || './data/moyun.db'
};
