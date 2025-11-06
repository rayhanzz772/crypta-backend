const express = require("express");
const router = require('express').Router()
const Controller = require('./controller')
const authentication = require("../../middleware/authMiddleware");
const rateLimit = require("express-rate-limit")

const decryptLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 5,
  message: "Too many decryption attempts. Try again later."
});

// Semua route vault butuh token JWT
router.post("/", authentication, Controller.createVaultPassword);
router.get("/", authentication, Controller.getVaultPasswords);
router.post("/:id/decrypt", authentication, decryptLimiter, Controller.decryptVaultPassword);
router.delete("/:id/delete", authentication, Controller.deleteVaultPassword);
router.put("/:id/update", authentication, Controller.updateVaultPassword);
router.get("/logs", authentication, Controller.getVaultLogs);
router.post("/logs", authentication, Controller.logAction);
router.get("/recent-activity", authentication, Controller.logRecentActivity);

module.exports = router;
