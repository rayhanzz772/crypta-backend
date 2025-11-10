const express = require("express");
const router = require('express').Router()
const Controller = require('./controller')
const rateLimit = require("express-rate-limit")

const decryptLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 5,
  message: "Too many decryption attempts. Try again later."
});

// Semua route vault butuh token JWT
router.post("/", Controller.createVaultPassword);
router.get("/", Controller.getVaultPasswords);
router.post("/:id/decrypt", decryptLimiter, Controller.decryptVaultPassword);
router.delete("/:id/delete", Controller.deleteVaultPassword);
router.put("/:id/update", Controller.updateVaultPassword);
router.get("/logs", Controller.getVaultLogs);
router.post("/logs", Controller.logAction);
router.get("/recent-activity", Controller.logRecentActivity);

module.exports = router;
