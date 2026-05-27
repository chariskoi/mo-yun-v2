require('dotenv').config();
module.exports = {
  port:          parseInt(process.env.PORT || '3001'),
  databaseUrl:   process.env.DATABASE_URL || 'postgresql://localhost:5432/moyun',
  jwtSecret:     process.env.JWT_SECRET || 'mo-yun-dev-secret-change-in-production',
  jwtExpiresIn:  process.env.JWT_EXPIRES_IN || '7d'
};
