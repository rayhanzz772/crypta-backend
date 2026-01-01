const { z } = require('zod')

// Validation for creating a secret version
const createSecretVersionSchema = z.object({
  plaintext: z
    .string({ required_error: 'Secret plaintext value is required' })
    .min(1, 'Secret value cannot be empty')
    .max(8192, 'Secret value is too large (max 8KB)')
})

// Validation for secret version params
const secretVersionParamsSchema = z.object({
  version_id: z
    .string({ required_error: 'Version ID is required' })
    .min(1, 'Version ID cannot be empty')
})

const secretParamsSchema = z.object({
  secret_id: z
    .string({ required_error: 'Secret ID is required' })
    .min(1, 'Secret ID cannot be empty')
})

module.exports = {
  createSecretVersionSchema,
  secretVersionParamsSchema,
  secretParamsSchema
}
