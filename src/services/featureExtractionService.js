const Detection = require('./detection')

async function buildFeatureVector(
  userId,
  loginTime,
  userIp,
  userAgent = null,
  recoveredAt = null
) {
  const login_hour = new Date(loginTime).getHours()

  const day_of_week = new Date(loginTime).getDay()

  const session_duration_min = 240

  const failed_attempts = await Detection.getFailedAttempts(userId, recoveredAt)

  const device_change = await Detection.getDeviceChange(userId, recoveredAt)

  const ip_change = await Detection.getIpChange(userId, recoveredAt)

  const geo_anomaly = await Detection.getGeoAnomaly(userId, recoveredAt)

  const access_count_10min = 60

  const unique_endpoints_visited = 100

  const vpn_used = await Detection.checkVPN(userIp, userAgent)

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
