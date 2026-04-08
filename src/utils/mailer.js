const nodemailer = require('nodemailer')
const path = require('path')

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT),
  secure: process.env.MAIL_PORT === '587',
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
})

async function sendMail({ to, subject, html }) {
  const info = await transporter.sendMail({
    from: `"Crypta" <${process.env.MAIL_FROM_EMAIL}>`,
    to,
    subject,
    html,
    attachments: [
      {
        filename: 'logo.png',
        path: path.join(__dirname, '../../public/logo.png'),
        cid: 'logo'
      }
    ]
  })

  console.log(`[Mailer] Email sent to ${to} — MessageId: ${info.messageId}`)
  return info
}

module.exports = { sendMail }
