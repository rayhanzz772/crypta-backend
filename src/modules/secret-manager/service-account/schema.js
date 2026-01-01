const { z } = require('zod')

// Validation for creating a service account
const createServiceAccountSchema = z.object({
  name: z
    .string({ required_error: 'Service account name is required' })
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name must not exceed 50 characters')
    .regex(
      /^[a-z0-9-]+$/,
      'Name must contain only lowercase letters, numbers, and hyphens'
    )
})

// Validation for service account params
const serviceAccountParamsSchema = z.object({
  service_account_id: z
    .string({ required_error: 'Service account ID is required' })
    .min(1, 'Service account ID cannot be empty')
})

const projectParamsSchema = z.object({
  project_id: z
    .string({ required_error: 'Project ID is required' })
    .min(1, 'Project ID cannot be empty')
})

module.exports = {
  createServiceAccountSchema,
  serviceAccountParamsSchema,
  projectParamsSchema
}
