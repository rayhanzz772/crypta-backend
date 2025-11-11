const express = require("express");
const router = require('express').Router()
const Controller = require('./controller')
const rateLimit = require("express-rate-limit")

const decryptLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  message: "Too many decryption attempts. Try again later."
});

router.post("/", Controller.createSecretNote);
router.get("/", Controller.getSecretNotes);
router.post("/:id/decrypt", decryptLimiter, Controller.decryptSecretNote);
router.delete("/:id/delete", Controller.deleteSecretNote);
router.put("/:id/update", Controller.updateSecretNote);

router.post("/favorite", Controller.toggleFavoriteSecretNote);

module.exports = router;
