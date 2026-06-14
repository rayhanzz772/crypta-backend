const axios = require('axios')

function getMlHealthUrl() {
  const baseUrl = process.env.API_ML
  const healthPath = process.env.API_ML_HEALTH_PATH || '/health'

  if (!baseUrl) {
    return null
  }

  const normalizedPath = healthPath.startsWith('/')
    ? healthPath
    : `/${healthPath}`

  return `${baseUrl}${normalizedPath}`
}

async function checkMlServiceReady() {
  const healthUrl = getMlHealthUrl()

  if (!healthUrl) {
    console.warn('[ML Service] Skipped health check: API_ML not set')
    return false
  }

  try {
    await axios.get(healthUrl, { timeout: 3000 })
    console.log('[ML Service] Ready')
    return true
  } catch (error) {
    console.error('[ML Service] Down:', error.message)
    return false
  }
}

async function predictAnomaly(features) {
  try {
    const response = await axios.post(`${process.env.API_ML}/predict`, features)
    console.log('[ML Service] Ready')

    return response.data
  } catch (error) {
    console.error('[ML Service] Down:', error.message)
    throw error
  }
}

module.exports = {
  predictAnomaly,
  checkMlServiceReady
}
