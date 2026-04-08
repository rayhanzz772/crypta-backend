const Detection = require('./detection')

async function buildFeatureVector(
  userId,
  loginTime,
  userIp,
  recoveredAt = null
) {
  const login_hour = new Date(loginTime).getHours()

  const day_of_week = new Date(loginTime).getDay()

  const session_duration_min = await Detection.getSessionDuration(userId)

  const failed_attempts = await Detection.getFailedAttempts(userId, recoveredAt)

  const device_change = await Detection.getDeviceChange(userId, recoveredAt)

  const ip_change = await Detection.getIpChange(userId, recoveredAt)

  const geo_anomaly = await Detection.getGeoAnomaly(userId, recoveredAt)

  const access_count_10min = await Detection.getAccessCount10Min(
    userId,
    recoveredAt
  )

  const unique_endpoints_visited = await Detection.getUniqueEndpoints(
    userId,
    recoveredAt
  )

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
