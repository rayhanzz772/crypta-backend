const { z } = require('zod')

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email format'),
  master_password: z
    .string({ required_error: 'Master password is required' })
    .min(1, 'Master password cannot be empty')
})

const registerSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email format'),
  master_password: z
    .string({ required_error: 'Master password is required' })
    .min(8, 'Master password must be at least 8 characters')
    .max(128, 'Master password must not exceed 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Master password must contain at least one uppercase, one lowercase, and one number'
    )
})

const verifyRecoverySchema = z.object({
  email: z.string().email('Invalid email format'),
  recovery_key: z.string().min(1, 'Recovery key is required')
})

const resetPasswordSchema = z.object({
  new_password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password mixed complex required')
})

const migrateToMekSchema = z.object({
  master_password: z
    .string({ required_error: 'Master password is required' })
    .min(1, 'Master password cannot be empty')
})

module.exports = {
  loginSchema,
  registerSchema,
  verifyRecoverySchema,
  resetPasswordSchema,
  migrateToMekSchema
}
