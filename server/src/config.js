// ============================================================
// config.js — Server configuration from environment
// ============================================================

module.exports = {
  port: parseInt(process.env.PORT || '3001', 10),

  jwt: {
    accessSecret:  process.env.JWT_ACCESS_SECRET  || 'dev-access-secret-change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
    accessExpires: process.env.ACCESS_TOKEN_EXPIRES || '15m',
    refreshExpiresDays: parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '7', 10)
  },

  bcryptRounds: 10
};
