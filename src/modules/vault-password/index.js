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
  logActionSchema
} = require('./schema')

const decryptLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 5,
  message: 'Too many decryption attempts. Try again later.'
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
router.get('/logs', Controller.getVaultLogs)
router.post(
  '/logs',
  validateRequest({ body: logActionSchema }),
  Controller.logAction
)
router.get('/recent-activity', Controller.logRecentActivity)

router.post(
  '/favorite',
  validateRequest({ body: toggleFavoriteSchema }),
  Controller.toggleFavorite
)

module.exports = router
