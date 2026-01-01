const { z } = require('zod')

// Validation for checking password
const checkPasswordSchema = z.object({
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password cannot be empty')
})

// Validation for query params (pagination/search)
const getUsersQuerySchema = z.object({
  per_page: z.coerce.number().min(1).max(100).optional().default(10),
  page: z.coerce.number().min(1).optional().default(1),
  q: z.string().max(100).optional()
})

module.exports = {
  checkPasswordSchema,
  getUsersQuerySchema
}
