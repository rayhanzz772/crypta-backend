const express = require('express')
const router = express.Router()
const TagController = require('./controller')
const { authMiddleware } = require('../../middleware/authMiddleware')
const validateRequest = require('../../middleware/validateRequest')
const {
  createTagSchema,
  bulkCreateTagsSchema,
  updateTagSchema,
  bulkUpdateTagsSchema,
  bulkDeleteTagsSchema,
  idParamSchema,
  getTagsQuerySchema
} = require('./schema')

// Apply authentication middleware to all routes
router.use(authMiddleware)

// Get all tags (with search & pagination)
router.get(
  '/',
  validateRequest({ query: getTagsQuerySchema }),
  TagController.getAllTags
)

// Get single tag by ID
router.get(
  '/:id',
  validateRequest({ params: idParamSchema }),
  TagController.getTagById
)

// Create single tag
router.post(
  '/',
  validateRequest({ body: createTagSchema }),
  TagController.createTag
)

// Bulk create tags
router.post(
  '/bulk',
  validateRequest({ body: bulkCreateTagsSchema }),
  TagController.bulkCreateTags
)

// Update single tag
router.put(
  '/:id',
  validateRequest({ params: idParamSchema, body: updateTagSchema }),
  TagController.updateTag
)

// Bulk update tags
router.put(
  '/bulk',
  validateRequest({ body: bulkUpdateTagsSchema }),
  TagController.bulkUpdateTags
)

// Delete single tag
router.delete(
  '/:id',
  validateRequest({ params: idParamSchema }),
  TagController.deleteTag
)

// Bulk delete tags
router.delete(
  '/bulk',
  validateRequest({ body: bulkDeleteTagsSchema }),
  TagController.bulkDeleteTags
)

module.exports = router
