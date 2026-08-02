const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/database');

const ADMIN_ROLES = ['super_admin', 'content_admin', 'moderator'];

// In-memory cache so the admin role check doesn't hit the DB on every request.
const adminRoleCache = new Map(); // { id: { isAdmin, ts } }
const ADMIN_ROLE_CACHE_TTL = 10 * 1000;

function isAdminUser(req) {
  return req.user && ADMIN_ROLES.includes(req.user.role);
}

// Detect whether the caller (by bearer/cookie token) is an admin/mod.
async function hasAdminRole(req) {
  if (isAdminUser(req)) return true;

  let token = (req.cookies && req.cookies.token) || null;
  if (!token && req.headers && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return false;

  let id;
  try {
    id = jwt.verify(token, process.env.JWT_SECRET).id;
  } catch (e) {
    return false;
  }

  const cached = adminRoleCache.get(id);
  if (cached && Date.now() - cached.ts < ADMIN_ROLE_CACHE_TTL) {
    return cached.isAdmin;
  }

  let role = null;
  try {
    const pool = await getPool();
    const [rows] = await pool.query('SELECT role FROM users WHERE id = ?', [id]);
    if (rows.length > 0) role = rows[0].role;
  } catch (e) {
    return false;
  }

  const isAdmin = ADMIN_ROLES.includes(role);
  adminRoleCache.set(id, { isAdmin, ts: Date.now() });
  return isAdmin;
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: async (req) => hasAdminRole(req),
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts, please try again later.'
  }
});

const importLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: async (req) => hasAdminRole(req),
  message: {
    success: false,
    message: 'Too many import requests, please try again later.'
  }
});

module.exports = { apiLimiter, authLimiter, importLimiter };
