const rateLimit = require("express-rate-limit");

// 🔒 Private (JWT) limiter — longgar
const privateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 200, // 200 request per user
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests (private route). Please slow down.",
  },
  keyGenerator: (req) => req.user?.userId || req.ip, // identifikasi berdasarkan user id
});

// 🌍 Public (API key) limiter — lebih ketat
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100, // 100 request per API key
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this API key. Try again later.",
  },
  keyGenerator: (req) => req.headers["x-api-key"] || req.ip, // identifikasi berdasarkan API key
});

module.exports = { privateLimiter, publicLimiter };
