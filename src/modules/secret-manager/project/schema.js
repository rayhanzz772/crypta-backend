const { z } = require('zod')

// Validation for creating a project
const createProjectSchema = z.object({
  name: z
    .string({ required_error: 'Project name is required' })
    .min(3, 'Project name must be at least 3 characters')
    .max(100, 'Project name must not exceed 100 characters')
    .regex(
      /^[a-zA-Z0-9\s-_]+$/,
      'Project name can only contain letters, numbers, spaces, hyphens, and underscores'
    )
})

// Validation for project params
const projectParamsSchema = z.object({
  project_id: z
    .string({ required_error: 'Project ID is required' })
    .min(1, 'Project ID cannot be empty')
})

module.exports = {
  createProjectSchema,
  projectParamsSchema
}
