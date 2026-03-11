const {
  accountBlockedEmailTemplate,
  newLoginAlertEmailTemplate
} = require('../utils/emailTemplates')
const { sendMail } = require('../utils/mailer')
const db = require('../../db/models')

async function handleRiskTrigger(riskLevel, sessionId, user) {
  switch (riskLevel?.toLowerCase()) {
    case 'low':
      break

    case 'medium':
      await db.LoginHistory.update(
        { is_flagged: true },
        { where: { id: sessionId }, returning: true, plain: true }
      )

      const sessionData = await db.LoginHistory.findByPk(sessionId)

      sendMail({
        to: user.email,
        subject: 'Crypta Security Alert — Suspicious login detected',
        html: newLoginAlertEmailTemplate(user.email, {
          ip: sessionData.ip_address,
          device: sessionData.device,
          location: sessionData.location,
          time: sessionData.login_time
        })
      }).catch((err) =>
        console.error(
          '[Mailer] Failed to send new login alert email:',
          err.message
        )
      )

      break

    case 'high':
      await db.LoginHistory.update(
        { is_flagged: true, status: 'blocked' },
        { where: { id: sessionId } }
      )
      await user.update({ is_blocked: true })
      sendMail({
        to: user.email,
        subject: 'Crypta Security Alert — Your account has been blocked',
        html: accountBlockedEmailTemplate(user.email)
      }).catch((err) =>
        console.error('[Mailer] Failed to send block alert email:', err.message)
      )
      break

    default:
      break
  }
}

module.exports = { handleRiskTrigger }
