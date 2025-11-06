const authService = require("./service");
const jwt = require("jsonwebtoken");
const db = require("../../../db/models");
const User = db.User;
const bcrypt = require("bcrypt");
const { checkPasswordBreach } = require("../../utils/pwnedCheck")

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { token, user } = await authService.login(email, password);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user,
      },
    });
  } catch (err) {
    console.error("❌ Login error:", err.message);
    return res.status(401).json({
      success: false,
      message: err.message || "Login failed",
    });
  }
};

exports.register = async (req, res) => {
  try {
    const { email, master_password } = req.body;

    if (!email || !master_password) {
      return res.status(400).json({
        success: false,
        message: "Email and master_password are required"
      });
    }

    // Cek apakah user sudah ada
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered"
      });
    }

    const breachCount = await checkPasswordBreach(master_password);
    if (breachCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Password ini ditemukan ${breachCount} kali dalam kebocoran data publik. Gunakan password yang lebih aman.`,
      });
    }

    // Hash master password sebelum disimpan
    const saltRounds = 12;
    const hash = await bcrypt.hash(master_password, saltRounds);

    // Simpan ke database
    const user = await User.create({
      email,
      master_hash: hash
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error"
    });
  }
};

exports.logout = async (req, res) => {
  try {
    res.clearCookie("token");
    return res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    console.error("❌ Logout error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message || "Logout failed",
    });
  }
};
