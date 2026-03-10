const Detection = require('./detection')

async function buildFeatureVector(userId, loginTime, userIp) {
  const login_hour = new Date(loginTime).getHours()

  const day_of_week = new Date(loginTime).getDay()

  const session_duration_min = await Detection.getSessionDuration(userId)

  const failed_attempts = await Detection.getFailedAttempts(userId)

  const device_change = await Detection.getDeviceChange(userId)

  const ip_change = await Detection.getIpChange(userId)

  const geo_anomaly = await Detection.getGeoAnomaly(userId)

  const access_count_10min = await Detection.getAccessCount10Min(userId)

  const unique_endpoints_visited = await Detection.getUniqueEndpoints(userId)

  const vpn_used = await Detection.checkVPN(userIp)

  return {
    login_hour,
    day_of_week,
    session_duration_min,
    failed_attempts,
    device_change,
    ip_change,
    geo_anomaly,
    access_count_10min,
    unique_endpoints_visited,
    vpn_used
  }
}

module.exports = {
  buildFeatureVector
}
