const { z } = require('zod')

// Validation for creating a tag
const createTagSchema = z.object({
  name: z
    .string({ required_error: 'Tag name is required' })
    .min(1, 'Tag name cannot be empty')
    .max(50, 'Tag name must not exceed 50 characters')
    .transform((val) => val.trim())
})

// Validation for bulk create tags
const bulkCreateTagsSchema = z.object({
  tags: z
    .array(
      z
        .string()
        .min(1, 'Tag name cannot be empty')
        .max(50, 'Tag name must not exceed 50 characters')
    )
    .min(1, 'Tags array must not be empty')
    .max(100, 'Cannot create more than 100 tags at once')
})

// Validation for updating a tag
const updateTagSchema = z.object({
  name: z
    .string({ required_error: 'Tag name is required' })
    .min(1, 'Tag name cannot be empty')
    .max(50, 'Tag name must not exceed 50 characters')
    .transform((val) => val.trim())
})

// Validation for bulk update tags
const bulkUpdateTagsSchema = z.object({
  tags: z
    .array(
      z.object({
        id: z.string({ required_error: 'Tag ID is required' }).min(1),
        name: z
          .string({ required_error: 'Tag name is required' })
          .min(1, 'Tag name cannot be empty')
          .max(50, 'Tag name must not exceed 50 characters')
      })
    )
    .min(1, 'Tags array must not be empty')
    .max(100, 'Cannot update more than 100 tags at once')
})

// Validation for bulk delete tags
const bulkDeleteTagsSchema = z.object({
  ids: z
    .array(z.string().min(1, 'Tag ID cannot be empty'))
    .min(1, 'IDs array must not be empty')
    .max(100, 'Cannot delete more than 100 tags at once')
})

// Validation for ID param
const idParamSchema = z.object({
  id: z
    .string({ required_error: 'ID is required' })
    .min(1, 'ID cannot be empty')
})

// Validation for get tags query
const getTagsQuerySchema = z.object({
  search: z.string().max(100).optional().default(''),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0)
})

module.exports = {
  createTagSchema,
  bulkCreateTagsSchema,
  updateTagSchema,
  bulkUpdateTagsSchema,
  bulkDeleteTagsSchema,
  idParamSchema,
  getTagsQuerySchema
}
