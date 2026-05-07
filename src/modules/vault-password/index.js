const express = require('express')
const router = require('express').Router()
const Controller = require('./controller')
const rateLimit = require('express-rate-limit')
const validateRequest = require('../../middleware/validateRequest')
const {
  createVaultPasswordSchema,
  updateVaultPasswordSchema,
  decryptVaultPasswordSchema,
  idParamSchema,
  getVaultPasswordsQuerySchema,
  toggleFavoriteSchema,
  exportVaultSchema
} = require('./schema')

const decryptLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 5,
  message: 'Too many decryption attempts. Try again later.'
})

const exportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 menit
  max: 10,
  message: 'Too many export attempts. Please wait before exporting again.'
})

// Semua route vault butuh token JWT
router.post(
  '/',
  validateRequest({ body: createVaultPasswordSchema }),
  Controller.createVaultPassword
)
router.get(
  '/',
  validateRequest({ query: getVaultPasswordsQuerySchema }),
  Controller.getVaultPasswords
)
router.post(
  '/:id/decrypt',
  validateRequest({ params: idParamSchema, body: decryptVaultPasswordSchema }),
  decryptLimiter,
  Controller.decryptVaultPassword
)
router.delete(
  '/:id/delete',
  validateRequest({ params: idParamSchema }),
  Controller.deleteVaultPassword
)
router.put(
  '/:id/update',
  validateRequest({ params: idParamSchema, body: updateVaultPasswordSchema }),
  Controller.updateVaultPassword
)

router.post(
  '/favorite',
  validateRequest({ body: toggleFavoriteSchema }),
  Controller.toggleFavorite
)

router.post(
  '/export',
  exportLimiter,
  validateRequest({ body: exportVaultSchema }),
  Controller.exportVaultCSV
)

module.exports = router
