/**
 * HTML email template for 6-digit verification code
 * @param {string} code - The 6-digit verification code
 * @returns {string} HTML string
 */
function verificationEmailTemplate(code) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Verify your email – Crypta</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f4f7; font-family: 'Segoe UI', Arial, sans-serif; }
    .wrapper { max-width: 520px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 36px 40px; text-align: center; }
    .header h1 { margin: 0; color: #a78bfa; font-size: 26px; font-weight: 700; letter-spacing: 1px; }
    .header p { margin: 4px 0 0; color: #94a3b8; font-size: 13px; }
    .body { padding: 36px 40px; }
    .body p { color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px; }
    .code-box { background: #f3f0ff; border: 2px dashed #a78bfa; border-radius: 10px; text-align: center; padding: 24px 16px; margin: 24px 0; }
    .code-box span { font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #7c3aed; font-family: monospace; }
    .note { background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 12px 16px; color: #92400e; font-size: 13px; margin: 20px 0 0; }
    .footer { background: #f9fafb; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer p { margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🔐 Crypta</h1>
      <p>Secure Password Manager</p>
    </div>
    <div class="body">
      <p>Hello,</p>
      <p>Thanks for registering! Use the verification code below to confirm your email address and activate your account.</p>
      <div class="code-box">
        <span>${code}</span>
      </div>
      <div class="note">
        ⏱ This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
      </div>
    </div>
    <div class="footer">
      <p>If you did not create a Crypta account, you can safely ignore this email.</p>
      <p>&copy; ${new Date().getFullYear()} Crypta. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

module.exports = { verificationEmailTemplate }
