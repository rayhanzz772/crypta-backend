const express = require('express')
const router = require('express').Router()
const Controller = require('./controller')
const rateLimit = require('express-rate-limit')
const validateRequest = require('../../middleware/validateRequest')
const {
  createVaultPasswordSchema,
  updateVaultPasswordSchema,
  idParamSchema,
  getVaultPasswordsQuerySchema,
  toggleFavoriteSchema
} = require('./schema')



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



module.exports = router
