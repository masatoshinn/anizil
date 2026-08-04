const { v4: uuidv4 } = require('uuid');

// Convert arbitrary text into a URL-friendly slug
function generateSlug(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// Generate a unique token from UUID plus timestamp
function generateToken() {
  return uuidv4().replace(/-/g, '') + Date.now().toString(36);
}

// Generate a 12-character redeem code with dash separators
function generateRedeemCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    if (i === 4 || i === 8) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Clamp page and limit, returning computed SQL offset
function paginate(page, limit) {
  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const offset = (p - 1) * l;
  return { page: p, limit: l, offset };
}

// Resolve a promise after the given milliseconds
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  generateSlug,
  generateToken,
  generateRedeemCode,
  paginate,
  delay
};
