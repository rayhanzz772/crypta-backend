const router = require('express').Router()
const Controller = require('./controller')
const validateRequest = require('../../middleware/validateRequest')
const { createCategorySchema } = require('./schema')

router.post(
  '/',
  validateRequest({ body: createCategorySchema }),
  Controller.createCategory
)
router.get('/', Controller.getCategories)

module.exports = router
