const db = require('../../db/models')
const axios = require('axios')

const query = {
  failedAttempts: `
    SELECT COUNT(*) as count
    FROM login_history
    WHERE user_id = :userId
    AND status = 'failed'
    AND login_time >= NOW() - INTERVAL '1 DAY'
    AND login_time >= :recoveredAt
  `,
  deviceChange: `
    SELECT COUNT(DISTINCT device) as count
    FROM login_history
    WHERE user_id = :userId
    AND created_at >= NOW() - INTERVAL '1 hour'
    AND created_at >= :recoveredAt
  `,
  ipChange: `
    SELECT ip_address
    FROM login_history
    WHERE user_id = :userId
    AND login_time >= :recoveredAt
    ORDER BY login_time DESC
    LIMIT 2
  `,
  geoAnomaly: `
    SELECT COUNT(DISTINCT location) as count
    FROM login_history
    WHERE user_id = :userId
    AND created_at >= NOW() - INTERVAL '1 hour'
    AND created_at >= :recoveredAt
  `,
  accessCount10Min: `
    SELECT COUNT(*) as count
    FROM log_activity
    WHERE user_id = :userId
    AND created_at >= NOW() - INTERVAL '10 MINUTE'
    AND created_at >= :recoveredAt
  `,
  uniqueEndpoints: `
    SELECT COUNT(DISTINCT endpoint) as count
    FROM log_activity
    WHERE user_id = :userId
    AND created_at >= NOW() - INTERVAL '10 MINUTE'
    AND created_at >= :recoveredAt
  `
}

function isPrivateIP(ip) {
  return (
    ip === '::1' ||
    ip === '127.0.0.1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.')
  )
}

function getProxyCheckIpResult(responseData, ip) {
  if (!responseData || typeof responseData !== 'object') {
    return null
  }

  return responseData[ip] || responseData[String(ip)] || null
}

async function checkProxyCheck(ip) {
  const apiKey = process.env.PROXYCHECK_API_KEY

  if (!apiKey) {
    return 0
  }

  const response = await axios.get(
    `https://proxycheck.io/v3/${encodeURIComponent(ip)}?key=${encodeURIComponent(apiKey)}&ver=11-February-2026`,
    { timeout: 5000 }
  )

  const data = response.data || {}
  if (data.status && data.status !== 'ok' && data.status !== 'warning') {
    return 0
  }

  const ipResult = getProxyCheckIpResult(data, ip)
  if (!ipResult) {
    return 0
  }

  const detections = ipResult.detections || {}
  const anonymous = detections.anonymous === true
  const vpn = detections.vpn === true
  const proxy = detections.proxy === true
  const tor = detections.tor === true
  const riskScore = Number(ipResult.risk_score ?? ipResult.risk ?? 0)

  if (anonymous || vpn || proxy || tor) {
    return 1
  }

  return riskScore >= 50 ? 1 : 0
}

class Controller {
  static async getLoginHour(loginTime) {
    return new Date(loginTime).getHours()
  }

  static async getDayOfWeek(loginTime) {
    return new Date(loginTime).getDay()
  }

  static async getSessionDuration(userId) {
    const records = await db.LoginHistory.findAll({
      where: { user_id: userId, status: 'success' },
      order: [['login_time', 'DESC']],
      limit: 2
    })

    if (records.length < 2) return 0

    const prev = records[1] // sesi sebelumnya
    const end = prev.logout_time || prev.last_active_at || new Date()
    const diff = new Date(end) - new Date(prev.login_time)
    return Math.max(0, Math.floor(diff / 60000))
  }

  static async getFailedAttempts(userId, recoveredAt) {
    const result = await db.sequelize.query(query.failedAttempts, {
      replacements: { userId, recoveredAt: recoveredAt || new Date(0) },
      type: db.sequelize.QueryTypes.SELECT
    })
    return parseInt(result[0].count || 0, 10)
  }

  static async getDeviceChange(userId, recoveredAt) {
    const result = await db.sequelize.query(query.deviceChange, {
      replacements: { userId, recoveredAt: recoveredAt || new Date(0) },
      type: db.sequelize.QueryTypes.SELECT
    })
    return parseInt(result[0].count || 0, 10) > 1 ? 1 : 0
  }

  static async getIpChange(userId, recoveredAt) {
    const result = await db.sequelize.query(query.ipChange, {
      replacements: { userId, recoveredAt: recoveredAt || new Date(0) },
      type: db.sequelize.QueryTypes.SELECT
    })
    if (result.length < 2) return 0
    return result[0].ip_address !== result[1].ip_address ? 1 : 0
  }

  static async getGeoAnomaly(userId, recoveredAt) {
    const result = await db.sequelize.query(query.geoAnomaly, {
      replacements: { userId, recoveredAt: recoveredAt || new Date(0) },
      type: db.sequelize.QueryTypes.SELECT
    })
    return parseInt(result[0].count || 0, 10) > 1 ? 1 : 0
  }

  static async getAccessCount10Min(userId, recoveredAt) {
    const result = await db.sequelize.query(query.accessCount10Min, {
      replacements: { userId, recoveredAt: recoveredAt || new Date(0) },
      type: db.sequelize.QueryTypes.SELECT
    })
    return parseInt(result[0].count || 0, 10)
  }

  static async getUniqueEndpoints(userId, recoveredAt) {
    const result = await db.sequelize.query(query.uniqueEndpoints, {
      replacements: { userId, recoveredAt: recoveredAt || new Date(0) },
      type: db.sequelize.QueryTypes.SELECT
    })
    return parseInt(result[0].count || 0, 10)
  }

  static getClientIP(req) {
    const forwarded = req.headers['x-forwarded-for']
    const rawIp = forwarded
      ? String(forwarded).split(',')[0].trim()
      : req.socket.remoteAddress || req.ip

    // Normalize IPv4-mapped IPv6 format (::ffff:127.0.0.1)
    return String(rawIp || '').replace('::ffff:', '')
  }

  static async checkVPN(ip, userAgent = null) {
    if (isPrivateIP(ip)) {
      return 0
    }

    const API_KEY = process.env.IP_QUALITY_SCORE_API_KEY

    const params = new URLSearchParams({
      strictness: '1',
      allow_public_access_points: 'true'
    })

    if (userAgent) {
      params.set('user_agent', userAgent)
    }

    try {
      const response = await axios.get(
        `https://ipqualityscore.com/api/json/ip/${API_KEY}/${ip}?${params.toString()}`,
        { timeout: 5000 }
      )

      const data = response.data || {}
      const fraudScore = Number(data.fraud_score || 0)
      const connectionType = String(data.connection_type || '').toLowerCase()
      const vpnLikeSignal =
        data.vpn ||
        data.proxy ||
        data.tor ||
        data.active_vpn ||
        data.active_tor

      const abuseSignal =
        data.recent_abuse ||
        data.frequent_abuser ||
        data.high_risk_attacks ||
        data.bot_status

      const sharedOrDynamic = data.shared_connection || data.dynamic_connection
      const datacenterConnection = connectionType === 'data center'

      if (vpnLikeSignal) return 1
      if (fraudScore >= 90) return 1
      if (fraudScore >= 75 && (abuseSignal || datacenterConnection || sharedOrDynamic)) {
        return 1
      }

      const proxyCheckResult = await checkProxyCheck(ip)
      return proxyCheckResult
    } catch (error) {
      const proxyCheckResult = await checkProxyCheck(ip)
      return proxyCheckResult
    }
  }

  static async getLocation(ip) {
    const fallback = {
      country: 'Unknown',
      city: null,
      lat: null,
      lon: null
    }

    if (!ip || isPrivateIP(ip)) {
      return fallback
    }

    try {
      const response = await axios.get(`http://ip-api.com/json/${ip}`, {
        timeout: 2500
      })

      return {
        country: response.data.country || fallback.country,
        city: response.data.city || fallback.city,
        lat: response.data.lat ?? fallback.lat,
        lon: response.data.lon ?? fallback.lon
      }
    } catch (err) {
      // Secondary provider to reduce login failures when one provider is down.
      try {
        const response = await axios.get(`https://ipwho.is/${ip}`, {
          timeout: 2500
        })

        return {
          country: response.data.country || fallback.country,
          city: response.data.city || fallback.city,
          lat: response.data.latitude ?? fallback.lat,
          lon: response.data.longitude ?? fallback.lon
        }
      } catch {
        return fallback
      }
    }
  }
}

module.exports = Controller
