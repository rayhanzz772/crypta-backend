const express = require('express')
const router = require('express').Router()
const Controller = require('./controller')
const rateLimit = require('express-rate-limit')
const validateRequest = require('../../middleware/validateRequest')
const {
  createSecretNoteSchema,
  updateSecretNoteSchema,
  idParamSchema,
  getSecretNotesQuerySchema,
  toggleFavoriteSchema
} = require('./schema')



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
