const { CognitoJwtVerifier } = require('aws-jwt-verify');

// Lazy initialization of verifiers (created on first use)
let accessVerifier;
let idVerifier;

// Token blacklist for revoked tokens (in-memory for now, use Redis in production)
const tokenBlacklist = new Set();

// Rate limiting per user (simple in-memory, use Redis in production)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute

// More lenient in development, strict in production
const MAX_REQUESTS_PER_MINUTE = process.env.NODE_ENV === 'production' ? 100 : 500;

function getAccessVerifier() {
  if (!accessVerifier) {
    accessVerifier = CognitoJwtVerifier.create({
      userPoolId: process.env.COGNITO_USER_POOL_ID,
      tokenUse: 'access',
      clientId: process.env.COGNITO_CLIENT_ID,
    });
  }
  return accessVerifier;
}

function getIdVerifier() {
  if (!idVerifier) {
    idVerifier = CognitoJwtVerifier.create({
      userPoolId: process.env.COGNITO_USER_POOL_ID,
      tokenUse: 'id',
      clientId: process.env.COGNITO_CLIENT_ID,
    });
  }
  return idVerifier;
}

/**
 * Check if token is blacklisted
 */
function isTokenBlacklisted(token) {
  return tokenBlacklist.has(token);
}

/**
 * Add token to blacklist (for logout)
 */
function blacklistToken(token) {
  tokenBlacklist.add(token);
  // Auto-remove after 1 hour (tokens expire anyway)
  setTimeout(() => tokenBlacklist.delete(token), 3600000);
}

/**
 * Simple rate limiting per user
 */
function checkRateLimit(userId) {
  const now = Date.now();
  const userRequests = rateLimitMap.get(userId) || [];
  
  // Remove old requests outside the window
  const recentRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimitMap.set(userId, recentRequests);
  
  // Clean up old entries periodically
  if (rateLimitMap.size > 10000) {
    const cutoff = now - RATE_LIMIT_WINDOW;
    for (const [key, requests] of rateLimitMap.entries()) {
      if (requests.every(time => time < cutoff)) {
        rateLimitMap.delete(key);
      }
    }
  }
  
  return true;
}

/**
 * Middleware to verify JWT tokens from AWS Cognito
 * Supports both access and ID tokens
 * Enhanced with token blacklist and rate limiting
 */
async function verifyToken(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'No token provided',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.split(' ')[1];

    // Check if token is blacklisted
    if (isTokenBlacklisted(token)) {
      return res.status(401).json({ 
        error: 'Token has been revoked',
        code: 'TOKEN_REVOKED'
      });
    }

    // Try to verify as access token first, then ID token
    let payload;
    try {
      payload = await getAccessVerifier().verify(token);
    } catch (e) {
      // If access token fails, try ID token
      try {
        payload = await getIdVerifier().verify(token);
      } catch (idError) {
        console.error('Token verification failed:', idError.message);
        return res.status(401).json({ 
          error: 'Invalid or expired token',
          code: 'INVALID_TOKEN'
        });
      }
    }

    // Check token expiration (additional safety check)
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return res.status(401).json({ 
        error: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    // Rate limiting per user
    if (!checkRateLimit(payload.sub)) {
      return res.status(429).json({ 
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 60
      });
    }
    
    // Add user info to request object
    req.user = {
      id: payload.sub, // User ID for database operations
      sub: payload.sub,
      username: payload.username || payload['cognito:username'],
      email: payload.email,
      name: payload.name || payload.email?.split('@')[0] || 'User',
      picture: payload.picture || '',
      groups: payload['cognito:groups'] || [], // Cognito groups (e.g., ['admin'])
      isAdmin: (payload['cognito:groups'] || []).includes('admin'),
      'cognito:groups': payload['cognito:groups'] || [],
      'cognito:username': payload['cognito:username'],
      tokenExp: payload.exp,
      tokenIat: payload.iat,
    };

    // Log authentication (exclude sensitive endpoints from logs)
    if (!req.path.includes('/health')) {
      console.log('[Auth] User authenticated:', {
        sub: req.user.sub,
        username: req.user.username,
        groups: req.user.groups,
        path: req.path,
        method: req.method,
      });
    }

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ 
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
}

/**
 * Middleware to check if user is an admin
 * Must be used after verifyToken middleware
 * Enhanced with detailed logging
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    console.warn('[Admin Check] No user in request');
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'NOT_AUTHENTICATED'
    });
  }

  const isAdmin = req.user.groups.includes('admin');
  
  if (!isAdmin) {
    console.warn('[Admin Check] Access denied:', {
      user: req.user.sub,
      username: req.user.username,
      groups: req.user.groups,
      path: req.path,
    });
    return res.status(403).json({ 
      error: 'Admin access required. You need to be in the admin group.',
      code: 'FORBIDDEN'
    });
  }

  console.log('[Admin Check] Access granted:', {
    user: req.user.sub,
    username: req.user.username,
    path: req.path,
  });

  next();
}

/**
 * Middleware to check if user owns the resource
 * Compares user ID with resource owner ID
 */
function requireOwnership(resourceUserIdField = 'user_id') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const resourceUserId = req.params[resourceUserIdField] || 
                          req.body[resourceUserIdField] ||
                          req.query[resourceUserIdField];

    if (!resourceUserId) {
      return res.status(400).json({ 
        error: 'Resource owner not specified',
        code: 'MISSING_OWNER'
      });
    }

    // Allow if user is owner OR admin
    if (req.user.sub !== resourceUserId && !req.user.isAdmin) {
      console.warn('[Ownership Check] Access denied:', {
        user: req.user.sub,
        resourceOwner: resourceUserId,
        path: req.path,
      });
      return res.status(403).json({ 
        error: 'You can only access your own resources',
        code: 'NOT_OWNER'
      });
    }

    next();
  };
}

/**
 * Optional authentication - sets req.user if token is valid, but doesn't fail if missing
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  try {
    const token = authHeader.split(' ')[1];
    
    if (isTokenBlacklisted(token)) {
      req.user = null;
      return next();
    }

    let payload;
    try {
      payload = await getAccessVerifier().verify(token);
    } catch (e) {
      try {
        payload = await getIdVerifier().verify(token);
      } catch (idError) {
        req.user = null;
        return next();
      }
    }

    req.user = {
      id: payload.sub,
      sub: payload.sub,
      username: payload.username || payload['cognito:username'],
      email: payload.email,
      name: payload.name || payload.email?.split('@')[0] || 'User',
      groups: payload['cognito:groups'] || [],
      isAdmin: (payload['cognito:groups'] || []).includes('admin'),
    };

    next();
  } catch (error) {
    req.user = null;
    next();
  }
}

module.exports = { 
  verifyToken, 
  requireAdmin, 
  requireOwnership,
  optionalAuth,
  blacklistToken,
  isTokenBlacklisted 
};
