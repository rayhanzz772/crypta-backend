require("dotenv").config();
const jwt = require("jsonwebtoken");
const db = require("../../db/models");

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Pastikan token dikirim
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "No token provided",
    });
  }

  const token = authHeader.split(" ")[1];
  try {
    // Verifikasi token
    console.log("Token received:", token);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded:", decoded);

    // Simpan data user ke req.user
    req.user = {
      userId: decoded.userId, // 🔥 sama dengan payload JWT dari login
      email: decoded.email,
    };

    next();
  } catch (err) {
    console.error("JWT verification error:", err.message);
    return res.status(401).json({
      success: false,
      message: err.name === "TokenExpiredError"
        ? "Token expired"
        : err.name === "JsonWebTokenError"
          ? "Invalid token"
          : "Token verification failed",
    });
  }
};

const apiKeyAuth = async (req, res, next) => {
  const key = req.headers['x-api-key'];
  if (!key) return res.status(401).json({ message: 'Missing API key' });

  const record = await db.ApiKey.findOne({ where: { key, revoked: false } });
  if (!record) return res.status(403).json({ message: 'Invalid or revoked API key' });

  req.user = { userId: record.user_id };
  next();
};

module.exports = { authMiddleware, apiKeyAuth };
