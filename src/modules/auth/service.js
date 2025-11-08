require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const db = require("../../../db/models"); 
const User = db.User;

exports.login = async (email, master_password) => {
  if (!email || !master_password) {
    throw new Error("Email and password are required");
  }

  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new Error("Invalid email or password");
  }

  const isValid = await bcrypt.compare(master_password, user.master_hash);
  if (!isValid) {
    throw new Error("Invalid email or password");
  }

  const payload = { userId: user.id, email: user.email };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    }
  };
};

