const { z } = require('zod')

// Validation for creating category
const createCategorySchema = z.object({
  name: z
    .string({ required_error: 'Category name is required' })
    .min(1, 'Category name cannot be empty')
    .max(100, 'Category name must not exceed 100 characters')
    .regex(
      /^[a-zA-Z0-9\s-_]+$/,
      'Category name can only contain letters, numbers, spaces, hyphens, and underscores'
    )
})

module.exports = {
  createCategorySchema
}
