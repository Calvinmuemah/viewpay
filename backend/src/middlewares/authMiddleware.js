const { verifyAccessToken } = require('../utils/jwt');
const { query } = require('../config/db');

/**
 * Protect routes - User Authentication
 */
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    if (!decoded || decoded.type !== 'user') {
      return res.status(401).json({ success: false, message: 'Invalid or expired access token' });
    }

    // Optional: Check if user exists and is active
    const userRes = await query('SELECT id, email, status, is_verified FROM users WHERE id = $1', [decoded.id]);
    if (userRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User account not found' });
    }

    const user = userRes.rows[0];
    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: `Account is ${user.status}` });
    }

    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Protect routes - Advertiser Authentication
 */
const authenticateAdvertiser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    if (!decoded || decoded.type !== 'advertiser') {
      return res.status(401).json({ success: false, message: 'Invalid or expired access token' });
    }

    const advertiserRes = await query('SELECT id, email, status, is_verified FROM advertisers WHERE id = $1', [decoded.id]);
    if (advertiserRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Advertiser account not found' });
    }

    const advertiser = advertiserRes.rows[0];
    if (advertiser.status !== 'active') {
      return res.status(403).json({ success: false, message: `Advertiser account is ${advertiser.status}` });
    }

    req.advertiser = decoded;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Protect routes - Admin Authentication
 */
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Admin authorization token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    if (!decoded || decoded.type !== 'admin') {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }

    const adminRes = await query(
      `SELECT a.id, a.username, a.email, a.role_id, r.name as role_name 
       FROM admin_users a 
       JOIN roles r ON a.role_id = r.id 
       WHERE a.id = $1`, 
      [decoded.id]
    );

    if (adminRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Admin user not found' });
    }

    req.admin = adminRes.rows[0];
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Authorize Admin Permissions
 * @param {string} permission 
 */
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.admin) {
        return res.status(403).json({ success: false, message: 'Admin privileges required' });
      }

      // Check permissions associated with the role
      const permRes = await query(
        `SELECT p.name 
         FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.id
         WHERE rp.role_id = $1 AND p.name = $2`,
        [req.admin.role_id, permission]
      );

      if (permRes.rowCount === 0 && req.admin.role_name !== 'super_admin') {
        return res.status(403).json({ success: false, message: `Access denied. Requires permission: ${permission}` });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  authenticateUser,
  authenticateAdvertiser,
  authenticateAdmin,
  requirePermission
};
