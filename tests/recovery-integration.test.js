const request = require('supertest')
const app = require('../index')
const db = require('../db/models')
const bcrypt = require('bcrypt')
const {
  generateMEK,
  generateSalt,
  deriveKEK,
  wrapMEK
} = require('../src/utils/mek')
const { generateRecoveryKey } = require('../src/utils/recovery-key')

describe('Recovery Flow Integration', () => {
  let agent
  let userEmail = 'recovery@example.com'
  let recoveryKey
  let mekPlaintext

  beforeAll(async () => {
    agent = request.agent(app)

    // Setup a user with MEK
    const password = 'OldPassword123!'
    const passwordHash = await bcrypt.hash(password, 12)
    mekPlaintext = generateMEK()
    const salt = generateSalt()
    const kek = await deriveKEK(password, salt)
    const wrappedPw = wrapMEK(mekPlaintext, kek)
    const RK = generateRecoveryKey()
    recoveryKey = RK.formatted
    const wrappedRc = wrapMEK(mekPlaintext, RK.raw)

    await db.User.destroy({ where: { email: userEmail } })
    await db.User.create({
      email: userEmail,
      master_hash: passwordHash,
      kek_salt: salt,
      encrypted_mek_by_password: wrappedPw.encrypted,
      mek_pw_iv: wrappedPw.iv,
      mek_pw_tag: wrappedPw.tag,
      encrypted_mek_by_recovery: wrappedRc.encrypted,
      mek_rc_iv: wrappedRc.iv,
      mek_rc_tag: wrappedRc.tag,
      mek_version: 1
    })
  })

  afterAll(async () => {
    await db.User.destroy({ where: { email: userEmail } })
  })

  test('Step 1: Should verify recovery key and store in session', async () => {
    const res = await agent.post('/auth/verify-recovery-key').send({
      email: userEmail,
      recovery_key: recoveryKey
    })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.message).toContain('verified')
    // MEK should NOT be in the body
    expect(res.body.mek).toBeUndefined()
  })

  test('Step 2: Should reset password using session MEK', async () => {
    const res = await agent.post('/auth/reset-password').send({
      new_password: 'NewSecurePassword123!'
    })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.message).toContain('reset successfully')

    // Verify DB update
    const user = await db.User.findOne({ where: { email: userEmail } })
    const isValid = await bcrypt.compare(
      'NewSecurePassword123!',
      user.master_hash
    )
    expect(isValid).toBe(true)

    // Verify MEK is still the same (check wrap/unwrap with new password)
    const newKek = await deriveKEK('NewSecurePassword123!', user.kek_salt)
    const unwrapped = require('../src/utils/mek').unwrapMEK(
      user.encrypted_mek_by_password,
      newKek,
      user.mek_pw_iv,
      user.mek_pw_tag
    )
    expect(unwrapped.equals(mekPlaintext)).toBe(true)
  })

  test('Step 2: Should fail if session is missing/expired', async () => {
    const newAgent = request.agent(app)
    const res = await newAgent.post('/auth/reset-password').send({
      new_password: 'AnotherPassword123!'
    })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.message).toContain('expired')
  })
})
