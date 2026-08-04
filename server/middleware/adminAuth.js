const { getPool } = require('../config/database');

// Verify admin/mod role and load role permissions
const adminAuth = async (req, res, next) => {
  try {
    const pool = await getPool();
    const [roles] = await pool.query('SELECT * FROM settings WHERE setting_key = ?', ['role_permissions']);

    let rolePermissions = {};
    if (roles.length > 0 && roles[0].setting_value) {
      try {
        rolePermissions = JSON.parse(roles[0].setting_value);
      } catch (e) {
        rolePermissions = {};
      }
    }

    const defaultPermissions = {
      super_admin: ['manage_users', 'manage_anime', 'manage_episodes', 'manage_settings', 'manage_roles', 'manage_comments', 'manage_reports', 'manage_tokens', 'manage_codes'],
      content_admin: ['manage_anime', 'manage_episodes', 'manage_comments', 'view_reports'],
      moderator: ['manage_comments', 'manage_reports', 'view_users'],
      creator: ['create_manga'],
      user: []
    };

    const userRole = req.user.role;
    const permissions = rolePermissions[userRole] || defaultPermissions[userRole] || [];

    req.userPermissions = permissions;
    req.userRole = userRole;

    if (!['super_admin', 'content_admin', 'moderator'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin or moderator role required.'
      });
    }

    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error checking admin permissions'
    });
  }
};

// Return middleware guarding routes by required permission
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (req.userRole === 'super_admin') {
      return next();
    }

    if (!req.userPermissions || !req.userPermissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required permission: ${permission}`
      });
    }

    next();
  };
};

module.exports = { adminAuth, requirePermission };
