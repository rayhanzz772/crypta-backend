const nodemailer = require('nodemailer')
const path = require('path')

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT || '587'),
  secure: process.env.MAIL_PORT === '465',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
})

/**
 * Send an email
 * @param {{ to: string, subject: string, html: string }} options
 */
async function sendMail({ to, subject, html }) {
  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || '"Crypta" <noreply@crypta.app>',
    to,
    subject,
    html,
    attachments: [
      {
        filename: 'logo.png',
        path: path.join(__dirname, '../../public/logo.png'),
        cid: 'logo' // this is referenced in the HTML src="cid:logo"
      }
    ]
  })

  console.log(`[Mailer] Email sent to ${to} — MessageId: ${info.messageId}`)
  return info
}

module.exports = { sendMail }
