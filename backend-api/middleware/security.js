/**
 * Security Headers Middleware
 * Adds various security headers to protect against common attacks
 */

function securityHeaders(req, res, next) {
  // Prevent clickjacking attacks
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Strict Transport Security (HTTPS only)
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https://cognito-idp.*.amazonaws.com https://*.amazonaws.com; " +
    "frame-ancestors 'none';"
  );
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy (formerly Feature Policy)
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  next();
}

/**
 * CORS Configuration
 * Configures Cross-Origin Resource Sharing
 */
function configureCORS(allowedOrigins = []) {
  return (req, res, next) => {
    const origin = req.headers.origin;
    
    // Check if origin is allowed
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    } else if (process.env.NODE_ENV === 'development') {
      // Allow all origins in development
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    
    next();
  };
}

/**
 * Request logging middleware
 * Logs all incoming requests for security audit
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  
  // Log request
  console.log('[Request]', {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    user: req.user?.sub || 'anonymous',
  });
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log('[Response]', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      user: req.user?.sub || 'anonymous',
    });
  });
  
  next();
}

/**
 * Input sanitization middleware
 * Prevents XSS and injection attacks
 */
function sanitizeInput(req, res, next) {
  // Sanitize strings in body
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }
  
  next();
}

function sanitizeObject(obj) {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      // Remove script tags and dangerous HTML
      obj[key] = obj[key]
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}

/**
 * Rate limiting middleware per IP
 */
const ipRateLimitMap = new Map();
const IP_RATE_LIMIT_WINDOW = 60000; // 1 minute

// More lenient in development, strict in production
const MAX_IP_REQUESTS_PER_MINUTE = process.env.NODE_ENV === 'production' ? 200 : 1000;

function rateLimitByIP(req, res, next) {
  // Skip rate limiting for localhost in development
  const ip = req.ip || req.connection.remoteAddress;
  const isLocalhost = ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1';
  
  if (process.env.NODE_ENV === 'development' && isLocalhost) {
    // Very lenient for local development
    return next();
  }
  
  const now = Date.now();
  const requests = ipRateLimitMap.get(ip) || [];
  
  // Remove old requests
  const recentRequests = requests.filter(time => now - time < IP_RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= MAX_IP_REQUESTS_PER_MINUTE) {
    console.warn('[Rate Limit] IP blocked:', ip, `(${recentRequests.length} requests in last minute)`);
    return res.status(429).json({
      error: 'Too many requests from this IP. Please try again later.',
      code: 'RATE_LIMIT_IP',
      retryAfter: 60
    });
  }
  
  recentRequests.push(now);
  ipRateLimitMap.set(ip, recentRequests);
  
  // Periodic cleanup
  if (ipRateLimitMap.size > 10000) {
    const cutoff = now - IP_RATE_LIMIT_WINDOW;
    for (const [key, reqs] of ipRateLimitMap.entries()) {
      if (reqs.every(time => time < cutoff)) {
        ipRateLimitMap.delete(key);
      }
    }
  }
  
  next();
}

/**
 * Validate required environment variables
 */
function validateEnvironment() {
  const required = [
    'COGNITO_USER_POOL_ID',
    'COGNITO_CLIENT_ID',
    'AWS_REGION',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    process.exit(1);
  }
  
  console.log('✅ All required environment variables are set');
}

module.exports = {
  securityHeaders,
  configureCORS,
  requestLogger,
  sanitizeInput,
  rateLimitByIP,
  validateEnvironment,
};
