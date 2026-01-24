const database = require('../database/database');

// Permission definitions
const PERMISSIONS = {
  // User Management
  'users:read': ['admin', 'manager'],
  'users:create': ['admin'],
  'users:update': ['admin', 'manager'],
  'users:delete': ['admin'],
  
  // Product Management
  'products:read': ['admin', 'manager', 'cashier', 'inventory'],
  'products:create': ['admin', 'manager', 'inventory'],
  'products:update': ['admin', 'manager', 'inventory'],
  'products:delete': ['admin', 'manager'],
  
  // Category Management
  'categories:read': ['admin', 'manager', 'cashier', 'inventory'],
  'categories:create': ['admin', 'manager'],
  'categories:update': ['admin', 'manager'],
  'categories:delete': ['admin'],
  
  // Customer Management
  'customers:read': ['admin', 'cashier'],
  'customers:create': ['admin', 'cashier'],
  'customers:update': ['admin', 'cashier'],
  'customers:delete': ['admin'],
  
  // Order Management
  'orders:read': ['admin', 'cashier'],
  'orders:create': ['admin', 'cashier'],
  'orders:update': ['admin', 'cashier'],
  'orders:delete': ['admin'],
  'orders:cancel': ['admin'],
  
  // Inventory Management
  'inventory:read': ['admin', 'inventory', 'cashier'],
  'inventory:update': ['admin', 'inventory', 'cashier'],
  'inventory:adjust': ['admin', 'inventory'],
  'inventory:transfer': ['admin', 'inventory'],
  
  // Financial Management
  'financial:read': ['admin'],
  'financial:update': ['admin'],
  'financial:reports': ['admin'],
  
  // Settings Management
  'settings:read': ['admin'],
  'settings:update': ['admin'],
  
  // System Administration
  'system:admin': ['admin'],
  'system:backup': ['admin'],
  'system:restore': ['admin'],
  
  // Analytics and Reports
  'analytics:read': ['admin'],
  'analytics:export': ['admin'],
  
  // Integrations
  'integrations:read': ['admin'],
  'integrations:create': ['admin'],
  'integrations:update': ['admin'],
  'integrations:delete': ['admin'],
  
  // Notifications
  'notifications:read': ['admin', 'cashier'],
  'notifications:send': ['admin'],
  'notifications:configure': ['admin'],
  
  // Shop Management
  'shops:read': ['admin'],
  'shops:create': ['admin'],
  'shops:update': ['admin'],
  'shops:delete': ['admin'],
  
  // Perfume Management
  'perfume:read': ['admin', 'inventory'],
  'perfume:create': ['admin', 'inventory'],
  'perfume:update': ['admin', 'inventory'],
  'perfume:delete': ['admin'],
  
  // SMART BOTTLING PERMISSIONS - COMMENTED OUT
  // Uncomment the block below to enable Smart Bottling permissions
  /*
  // Smart Bottling
  'bottling:read': ['admin', 'inventory'],
  'bottling:create': ['admin', 'inventory'],
  'bottling:update': ['admin', 'inventory'],
  'bottling:delete': ['admin'],
  */
  
  // Procurement
  'procurement:read': ['admin'],
  'procurement:create': ['admin'],
  'procurement:update': ['admin'],
  'procurement:delete': ['admin'],
  
  // Expenses
  'expenses:read': ['admin', 'cashier'],
  'expenses:create': ['admin', 'cashier'],
  'expenses:update': ['admin'],
  'expenses:delete': ['admin'],
  
  // Loyalty Program
  'loyalty:read': ['admin', 'cashier'],
  'loyalty:create': ['admin'],
  'loyalty:update': ['admin'],
  'loyalty:delete': ['admin'],
  
  // Layaway
  'layaway:read': ['admin', 'cashier'],
  'layaway:create': ['admin', 'cashier'],
  'layaway:update': ['admin', 'cashier'],
  'layaway:delete': ['admin'],
  
  // Discounts
  'discounts:read': ['admin', 'cashier'],
  'discounts:create': ['admin'],
  'discounts:update': ['admin'],
  'discounts:delete': ['admin'],
};

// Role hierarchy
const ROLE_HIERARCHY = {
  'admin': ['admin', 'manager', 'cashier', 'inventory', 'viewer'],
  'manager': ['manager', 'cashier', 'inventory', 'viewer'],
  'cashier': ['cashier', 'viewer'],
  'inventory': ['inventory', 'viewer'],
  'viewer': ['viewer']
};

/**
 * Check if user has permission for a specific action
 */
const hasPermission = (userRole, permission) => {
  if (!userRole || !permission) return false;
  
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) return false;
  
  return allowedRoles.includes(userRole);
};

/**
 * Check if user has any of the specified permissions
 */
const hasAnyPermission = (userRole, permissions) => {
  return permissions.some(permission => hasPermission(userRole, permission));
};

/**
 * Check if user has all of the specified permissions
 */
const hasAllPermissions = (userRole, permissions) => {
  return permissions.every(permission => hasPermission(userRole, permission));
};

/**
 * Get all permissions for a role
 */
const getRolePermissions = (role) => {
  const permissions = [];
  for (const [permission, allowedRoles] of Object.entries(PERMISSIONS)) {
    if (allowedRoles.includes(role)) {
      permissions.push(permission);
    }
  }
  return permissions;
};

/**
 * Check if user can access resource based on shop
 */
const canAccessShop = async (userId, shopId) => {
  try {
    const user = await database.get(
      'SELECT role, shop_id FROM users WHERE id = ?',
      [userId]
    );
    
    if (!user) return false;
    
    // Admin can access all shops
    if (user.role === 'admin') return true;
    
    // Manager can access all shops (same as admin)
    if (user.role === 'manager') return true;
    
    // Other roles can only access their assigned shop
    return user.shop_id === shopId;
  } catch (error) {
    console.error('Error checking shop access:', error);
    return false;
  }
};

/**
 * Permission middleware factory
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permission,
        current_role: req.user.role
      });
    }
    
    next();
  };
};

/**
 * Multiple permissions middleware factory
 */
const requireAnyPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!hasAnyPermission(req.user.role, permissions)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permissions,
        current_role: req.user.role
      });
    }
    
    next();
  };
};

/**
 * All permissions middleware factory
 */
const requireAllPermissions = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!hasAllPermissions(req.user.role, permissions)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permissions,
        current_role: req.user.role
      });
    }
    
    next();
  };
};

/**
 * Shop access middleware
 * Allows passing custom param keys to resolve shop id from request.
 */
const requireShopAccess = (paramKeys = ['shopId', 'shop_id']) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Resolve candidate shop id from params/body/query by provided keys
    let shopId = null;
    for (const key of paramKeys) {
      if (req.params && req.params[key]) { shopId = req.params[key]; break; }
      if (req.body && req.body[key]) { shopId = req.body[key]; break; }
      if (req.query && req.query[key]) { shopId = req.query[key]; break; }
    }

    if (shopId && !(await canAccessShop(req.user.id, shopId))) {
      return res.status(403).json({
        error: 'Access denied to this shop',
        shop_id: shopId,
        user_role: req.user.role
      });
    }

    next();
  };
};

/**
 * Role hierarchy middleware
 */
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userRoles = ROLE_HIERARCHY[req.user.role] || [];
    
    if (!userRoles.includes(requiredRole)) {
      return res.status(403).json({ 
        error: 'Insufficient role level',
        required_role: requiredRole,
        current_role: req.user.role,
        available_roles: userRoles
      });
    }
    
    next();
  };
};

module.exports = {
  PERMISSIONS,
  ROLE_HIERARCHY,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
  canAccessShop,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireShopAccess,
  requireRole
};
