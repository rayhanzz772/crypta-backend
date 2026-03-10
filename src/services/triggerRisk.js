const { accountBlockedEmailTemplate } = require('../utils/emailTemplates')
const { sendMail } = require('../utils/mailer')
const db = require('../../db/models')

async function handleRiskTrigger(riskLevel, sessionId, user) {
  switch (riskLevel?.toLowerCase()) {
    case 'low':
      console.log(
        `[RISK:LOW] User ${user.email} logged in with low anomaly risk. No action taken.`
      )
      break

    case 'medium':
      console.warn(
        `[RISK:MEDIUM] Suspicious login detected for ${user.email}. Flagging session.`
      )
      await db.LoginHistory.update(
        { is_flagged: true },
        { where: { id: sessionId } }
      )
      break

    case 'high':
      console.error(
        `[RISK:HIGH] High-risk login detected for ${user.email}. Blocking account.`
      )
      await db.LoginHistory.update(
        { is_flagged: true, status: 'blocked' },
        { where: { id: sessionId } }
      )
      await user.update({ is_blocked: true })
      sendMail({
        to: user.email,
        subject: '⛔ Crypta Security Alert — Your account has been blocked',
        html: accountBlockedEmailTemplate(user.email)
      }).catch((err) =>
        console.error('[Mailer] Failed to send block alert email:', err.message)
      )
      break

    default:
      console.log(`[RISK:UNKNOWN] Unrecognized risk level: ${riskLevel}`)
  }
}

module.exports = { handleRiskTrigger }
