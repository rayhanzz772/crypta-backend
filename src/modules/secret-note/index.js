const express = require('express')
const router = require('express').Router()
const Controller = require('./controller')
const rateLimit = require('express-rate-limit')
const validateRequest = require('../../middleware/validateRequest')
const {
  createSecretNoteSchema,
  updateSecretNoteSchema,
  decryptSecretNoteSchema,
  idParamSchema,
  getSecretNotesQuerySchema,
  toggleFavoriteSchema
} = require('./schema')

const decryptLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,
  message: 'Too many decryption attempts. Try again later.'
})

router.post(
  '/',
  validateRequest({ body: createSecretNoteSchema }),
  Controller.createSecretNote
)
router.get(
  '/',
  validateRequest({ query: getSecretNotesQuerySchema }),
  Controller.getSecretNotes
)
router.post(
  '/:id/decrypt',
  validateRequest({ params: idParamSchema, body: decryptSecretNoteSchema }),
  decryptLimiter,
  Controller.decryptSecretNote
)
router.delete(
  '/:id/delete',
  validateRequest({ params: idParamSchema }),
  Controller.deleteSecretNote
)
router.put(
  '/:id/update',
  validateRequest({ params: idParamSchema, body: updateSecretNoteSchema }),
  Controller.updateSecretNote
)

router.post(
  '/favorite',
  validateRequest({ body: toggleFavoriteSchema }),
  Controller.toggleFavoriteSecretNote
)

module.exports = router
