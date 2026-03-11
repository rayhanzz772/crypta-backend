const { z } = require('zod')

const logActionSchema = z.object({
  vault_id: z
    .string({ required_error: 'Vault ID is required' })
    .min(1, 'Vault ID cannot be empty'),
  action: z
    .string({ required_error: 'Action is required' })
    .min(1, 'Action cannot be empty')
    .max(255, 'Action must not exceed 255 characters')
})

module.exports = {
  logActionSchema
}
