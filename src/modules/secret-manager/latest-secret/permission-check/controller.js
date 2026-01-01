async function hasSecretAccess(models, service_account_id, secret_id) {
  const binding = await models.IamBinding.findOne({
    where: {
      subject_type: 'service_account',
      subject_id: service_account_id,
      resource_type: 'secret',
      resource_id: secret_id,
      role: 'secret.accessor'
    }
  })

  return !!binding
}

module.exports = { hasSecretAccess }
