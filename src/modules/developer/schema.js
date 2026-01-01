const { z } = require('zod')

// Validation for ID param (revoke key)
const idParamSchema = z.object({
  id: z
    .string({ required_error: 'API Key ID is required' })
    .min(1, 'API Key ID cannot be empty')
})

module.exports = {
  idParamSchema
}
