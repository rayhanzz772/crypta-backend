const { z } = require('zod')

// Validation for creating vault password
const createVaultPasswordSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(1, 'Name cannot be empty')
    .max(255, 'Name must not exceed 255 characters'),
  username: z
    .string()
    .max(255, 'Username must not exceed 255 characters')
    .optional(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password cannot be empty')
    .max(1024, 'Password must not exceed 1024 characters'),
  note: z.string().max(5000, 'Note must not exceed 5000 characters').optional(),
  master_password: z
    .string({ required_error: 'Master password is required for encryption' })
    .min(1, 'Master password cannot be empty'),
  category_id: z.string().optional().nullable()
})

// Validation for updating vault password
const updateVaultPasswordSchema = z.object({
  name: z
    .string()
    .min(1, 'Name cannot be empty')
    .max(255, 'Name must not exceed 255 characters')
    .optional(),
  username: z
    .string()
    .max(255, 'Username must not exceed 255 characters')
    .optional(),
  password: z
    .string()
    .min(1, 'Password cannot be empty')
    .max(1024, 'Password must not exceed 1024 characters')
    .optional(),
  note: z.string().max(5000, 'Note must not exceed 5000 characters').optional(),
  master_password: z
    .string()
    .min(1, 'Master password cannot be empty')
    .optional(),
  category: z.string().optional()
})

// Validation for decrypt
const decryptVaultPasswordSchema = z.object({
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

// Validation for get vault passwords query
const getVaultPasswordsQuerySchema = z.object({
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
    .default('password')
})

// Validation for log action
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
  createVaultPasswordSchema,
  updateVaultPasswordSchema,
  decryptVaultPasswordSchema,
  idParamSchema,
  getVaultPasswordsQuerySchema,
  toggleFavoriteSchema,
  logActionSchema
}
