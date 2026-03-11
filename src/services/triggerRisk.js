const {
  accountBlockedEmailTemplate,
  newLoginAlertEmailTemplate
} = require('../utils/emailTemplates')
const { sendMail } = require('../utils/mailer')
const db = require('../../db/models')
const { analyzeRisk } = require('./analysis')
const Detection = require('./detection')

async function handleRiskTrigger(riskLevel, sessionId, user) {
  switch (riskLevel?.toLowerCase()) {
    case 'low':
      break

    case 'medium':
    case 'high':
      const isHigh = riskLevel.toLowerCase() === 'high'

      if (isHigh) {
        await db.LoginHistory.update(
          { is_flagged: true, status: 'blocked' },
          { where: { id: sessionId } }
        )
        await user.update({ is_blocked: true })
      } else {
        await db.LoginHistory.update(
          { is_flagged: true },
          { where: { id: sessionId } }
        )
      }

      const sessionData = await db.LoginHistory.findByPk(sessionId)
      let randomNum = Math.floor(Math.random() * 100)
      let randomIP = '192.168.1.' + randomNum
      const dummyLocations = [
        'Singapore, Singapore',
        'Tokyo, Japan',
        'London, United Kingdom',
        'New York, USA',
        'Sydney, Australia',
        'Berlin, Germany',
        'Paris, France',
        'Toronto, Canada',
        'Dubai, UAE',
        'Moscow, Russia'
      ]
      let randomLocation =
        dummyLocations[Math.floor(Math.random() * dummyLocations.length)]

      // Generate AI Risk Analysis Insight
      let aiInsight = null
      try {
        aiInsight = await analyzeRisk({
          userEmail: user.email,
          ipAddress: randomIP, // sessionData.ip_address
          location: randomLocation, // sessionData.location
          lastIp: user.last_ip,
          lastLocation: user.last_location,
          device: sessionData.device,
          loginTime: sessionData.login_time,
          isVpn: true, // sessionData.vpn_used
          riskLevel: riskLevel
        })
      } catch (err) {
        console.error('[TriggerRisk] Failed to get AI Insight:', err.message)
      }

      if (isHigh) {
        // High Risk: Block account email
        sendMail({
          to: user.email,
          subject: 'Crypta Security Alert — Your account has been blocked',
          html: accountBlockedEmailTemplate(user.email)
        }).catch((err) =>
          console.error(
            '[Mailer] Failed to send block alert email:',
            err.message
          )
        )
      } else {
        // Medium Risk: New Login Alert with AI Insight
        sendMail({
          to: user.email,
          subject: 'Crypta Security Alert — Suspicious login detected',
          html: newLoginAlertEmailTemplate(user.email, {
            ip: randomIP,
            device: sessionData.device,
            location: sessionData.location,
            time: sessionData.login_time,
            aiInsight: aiInsight
          })
        }).catch((err) =>
          console.error(
            '[Mailer] Failed to send new login alert email:',
            err.message
          )
        )
      }
      break

    default:
      break
  }
}

module.exports = { handleRiskTrigger }
