const { z } = require('zod')

// Validation for creating IAM binding
const createBindingSchema = z.object({
  service_account_id: z
    .string({ required_error: 'Service account ID is required' })
    .min(1, 'Service account ID cannot be empty')
})

// Validation for IAM binding params
const bindingParamsSchema = z.object({
  binding_id: z
    .string({ required_error: 'Binding ID is required' })
    .min(1, 'Binding ID cannot be empty')
})

const secretParamsSchema = z.object({
  secret_id: z
    .string({ required_error: 'Secret ID is required' })
    .min(1, 'Secret ID cannot be empty')
})

// Validation for listing bindings query
const listBindingsQuerySchema = z.object({
  subject_id: z.string().optional(),
  resource_id: z.string().optional()
})

module.exports = {
  createBindingSchema,
  bindingParamsSchema,
  secretParamsSchema,
  listBindingsQuerySchema
}
