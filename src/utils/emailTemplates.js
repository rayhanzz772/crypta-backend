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

/**
 * HTML email template for account blocked due to high-risk activity
 * @param {string} email - The user's email address
 * @returns {string} HTML string
 */
function accountBlockedEmailTemplate(email) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Account Blocked – Crypta</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f4f7; font-family: 'Segoe UI', Arial, sans-serif; }
    .wrapper { max-width: 520px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%); padding: 36px 40px; text-align: center; }
    .header h1 { margin: 0; color: #fca5a5; font-size: 26px; font-weight: 700; letter-spacing: 1px; }
    .header p { margin: 4px 0 0; color: #fecaca; font-size: 13px; }
    .body { padding: 36px 40px; }
    .body p { color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px; }
    .alert-box { background: #fef2f2; border: 2px solid #f87171; border-radius: 10px; padding: 20px 24px; margin: 24px 0; }
    .alert-box p { margin: 0; color: #b91c1c; font-size: 15px; font-weight: 600; }
    .steps { background: #f8fafc; border-radius: 8px; padding: 20px 24px; margin: 20px 0; }
    .steps p { margin: 0 0 8px; color: #1e293b; font-size: 14px; font-weight: 600; }
    .steps ol { margin: 8px 0 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.8; }
    .note { background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 12px 16px; color: #92400e; font-size: 13px; margin: 20px 0 0; }
    .footer { background: #f9fafb; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer p { margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Crypta</h1>
      <p>Security Alert</p>
    </div>
    <div class="body">
      <p>Hello,</p>
      <p>We detected <strong>suspicious login activity</strong> on your Crypta account (<strong>${email}</strong>). As a precaution, your account has been <strong>temporarily blocked</strong>.</p>
      <div class="alert-box">
        <p>⛔ Your account has been blocked.</p>
      </div>
      <div class="steps">
        <p>To regain access, follow these steps:</p>
        <ol>
          <li>Go to the Crypta login page</li>
          <li>Click <strong>"Forgot Password / Recovery Key"</strong></li>
          <li>Enter your email and your <strong>recovery key</strong></li>
          <li>Set a new master password</li>
        </ol>
      </div>
      <div class="note">
        ⚠️ If you did not attempt to log in, your credentials may be compromised. Reset your password immediately.
      </div>
    </div>
    <div class="footer">
      <p>This is an automated security alert from Crypta.</p>
      <p>&copy; ${new Date().getFullYear()} Crypta. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

module.exports = { verificationEmailTemplate, accountBlockedEmailTemplate }
