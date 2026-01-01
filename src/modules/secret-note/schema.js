const { z } = require('zod')

// Validation for creating secret note
const createSecretNoteSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .min(1, 'Title cannot be empty')
    .max(255, 'Title must not exceed 255 characters'),
  note: z
    .string({ required_error: 'Note content is required' })
    .min(1, 'Note cannot be empty')
    .max(10000, 'Note must not exceed 10000 characters'),
  master_password: z
    .string({ required_error: 'Master password is required for encryption' })
    .min(1, 'Master password cannot be empty'),
  category_id: z.string().optional().nullable(),
  tags: z
    .array(z.string().min(1).max(50))
    .max(20, 'Cannot add more than 20 tags')
    .optional()
    .default([])
})

// Validation for updating secret note
const updateSecretNoteSchema = z.object({
  title: z
    .string()
    .min(1, 'Title cannot be empty')
    .max(255, 'Title must not exceed 255 characters')
    .optional(),
  note: z
    .string()
    .min(1, 'Note cannot be empty')
    .max(10000, 'Note must not exceed 10000 characters')
    .optional(),
  master_password: z
    .string()
    .min(1, 'Master password cannot be empty')
    .optional(),
  category_id: z.string().optional().nullable(),
  tags: z
    .array(z.string().min(1).max(50))
    .max(20, 'Cannot add more than 20 tags')
    .optional()
})

// Validation for decrypt
const decryptSecretNoteSchema = z.object({
  master_password: z
    .string({ required_error: 'Master password is required for decryption' })
    .min(1, 'Master password cannot be empty')
})

// Validation for ID param
const idParamSchema = z.object({
  id: z
    .string({ required_error: 'ID is required' })
    .min(1, 'ID cannot be empty')
})

// Validation for get secret notes query
const getSecretNotesQuerySchema = z.object({
  per_page: z.coerce.number().min(1).max(100).optional().default(10),
  page: z.coerce.number().min(1).optional().default(1),
  q: z.string().max(100).optional(),
  category: z.string().max(100).optional()
})

// Validation for toggle favorite
const toggleFavoriteSchema = z.object({
  target_id: z
    .string({ required_error: 'Target ID is required' })
    .min(1, 'Target ID cannot be empty'),
  type: z
    .enum(['password', 'note'], {
      required_error: 'Type is required',
      invalid_type_error: 'Type must be either "password" or "note"'
    })
    .optional()
    .default('note')
})

module.exports = {
  createSecretNoteSchema,
  updateSecretNoteSchema,
  decryptSecretNoteSchema,
  idParamSchema,
  getSecretNotesQuerySchema,
  toggleFavoriteSchema
}
