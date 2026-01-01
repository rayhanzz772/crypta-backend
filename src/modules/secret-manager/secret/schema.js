const { z } = require('zod')

// Validation for creating a new secret
const createSecretSchema = z.object({
  name: z
    .string({ required_error: 'Secret name is required' })
    .min(3, 'Secret name must be at least 3 characters')
    .max(60, 'Secret name must not exceed 60 characters')
    .regex(
      /^[A-Z][A-Z0-9_]*$/,
      'Secret name must be UPPERCASE with underscores (e.g., DB_PASSWORD, API_KEY)'
    )
})

// Validation for secret params (secret_id, project_id)
const secretParamsSchema = z.object({
  secret_id: z
    .string({ required_error: 'Secret ID is required' })
    .min(1, 'Secret ID cannot be empty')
})

const projectParamsSchema = z.object({
  project_id: z
    .string({ required_error: 'Project ID is required' })
    .min(1, 'Project ID cannot be empty')
})

module.exports = {
  createSecretSchema,
  secretParamsSchema,
  projectParamsSchema
}
