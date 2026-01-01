const cuid = require('cuid')

async function logAudit(models, payload) {
  return models.AuditLog.create({
    id: cuid(),
    subject_type: payload.subject_type,
    subject_id: payload.subject_id,
    action: payload.action,
    secret_id: payload.secret_id || null,
    secret_version: payload.secret_version || null,
    ip_address: payload.ip_address,
    user_agent: payload.user_agent,
    status: payload.status,
    error_message: payload.error_message || null
  })
}

module.exports = logAudit
