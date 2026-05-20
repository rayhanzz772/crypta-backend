const { z } = require('zod')

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email format'),
  master_hash: z
    .string({ required_error: 'Master hash is required' })
    .min(1, 'Master hash cannot be empty')
})

const registerSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email format'),
  master_hash: z
    .string({ required_error: 'Master hash is required' })
    .min(1, 'Master hash cannot be empty'),
  kek_salt: z.string().min(1, 'KEK salt is required'),
  encrypted_mek_by_password: z.string().min(1, 'Encrypted MEK by password is required'),
  mek_pw_iv: z.string().min(1, 'MEK password IV is required'),
  mek_pw_tag: z.string().min(1, 'MEK password tag is required'),
  encrypted_mek_by_recovery: z.string().min(1, 'Encrypted MEK by recovery is required'),
  mek_rc_iv: z.string().min(1, 'MEK recovery IV is required'),
  mek_rc_tag: z.string().min(1, 'MEK recovery tag is required')
})

const verifyRecoverySchema = z.object({
  email: z.string().email('Invalid email format')
})

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
  new_master_hash: z.string().min(1, 'New master hash is required'),
  new_kek_salt: z.string().min(1, 'New KEK salt is required'),
  encrypted_mek_by_password: z.string().min(1, 'Encrypted MEK by password is required'),
  mek_pw_iv: z.string().min(1, 'MEK password IV is required'),
  mek_pw_tag: z.string().min(1, 'MEK password tag is required')
})

const migrateToMekSchema = z.object({
  master_hash: z.string().min(1, 'Master hash is required'),
  kek_salt: z.string().min(1, 'KEK salt is required'),
  encrypted_mek_by_password: z.string().min(1, 'Encrypted MEK by password is required'),
  mek_pw_iv: z.string().min(1, 'MEK password IV is required'),
  mek_pw_tag: z.string().min(1, 'MEK password tag is required'),
  encrypted_mek_by_recovery: z.string().min(1, 'Encrypted MEK by recovery is required'),
  mek_rc_iv: z.string().min(1, 'MEK recovery IV is required'),
  mek_rc_tag: z.string().min(1, 'MEK recovery tag is required')
})

const verifyEmailSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email format'),
  code: z
    .string({ required_error: 'Verification code is required' })
    .length(6, 'Verification code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Verification code must be numeric')
})

const resendVerificationSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email format')
})

module.exports = {
  loginSchema,
  registerSchema,
  verifyRecoverySchema,
  resetPasswordSchema,
  migrateToMekSchema,
  verifyEmailSchema,
  resendVerificationSchema
}
