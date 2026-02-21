const rateLimit = require('express-rate-limit');

// Rate limiting for email endpoints - very generous limits for testing
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many email requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General rate limiter for API endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// STRICT Rate Limiter for sensitive actions like non-user invitations
const strictEmailLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 20, // Limit to 20 invites per day per IP
  message: {
    success: false,
    error: 'Daily invitation limit reached. Please try again tomorrow to protect against spam.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// STRICT Rate Limiter for Email Existence Checks (Anti-Enumeration)
const strictEmailCheckLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit to 10 checks per hour per IP
  message: {
    success: false,
    error: 'Too many attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate Limiter for User Search (Anti-Scraping/Enumeration)
const userSearchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit to 30 searches per 15 mins per IP
  message: {
    success: false,
    error: 'Too many search attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for creation endpoints
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each IP to 20 group creations per hour
  message: {
    success: false,
    error: 'Too many groups created, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  emailLimiter,
  generalLimiter,
  strictEmailLimiter,
  strictEmailCheckLimiter,
  userSearchLimiter,
  createLimiter
};
