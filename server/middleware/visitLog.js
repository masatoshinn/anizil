const { getPool } = require('../config/database');

const visitLog = async (req, res, next) => {
  res.on('finish', () => {
    if (req.path.startsWith('/api')) return;
    if (!['GET', 'HEAD'].includes(req.method)) return;

    const page = req.path || '/';
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null;
    const userAgent = (req.headers['user-agent'] || '').substring(0, 300);

    getPool()
      .then((pool) => pool.query(
        'INSERT INTO visitor_log (page, ip_address, user_agent, user_id) VALUES (?, ?, ?, ?)',
        [page, ipAddress, userAgent, req.user ? req.user.id : null]
      ))
      .catch((err) => console.error('Visitor log error:', err.message));
  });
  next();
};

module.exports = visitLog;
