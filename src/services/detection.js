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

class Controller {
  static async getLoginHour(loginTime) {
    return new Date(loginTime).getHours()
  }

  static async getDayOfWeek(loginTime) {
    return new Date(loginTime).getDay()
  }

  static async getSessionDuration(userId) {
    const result = await db.LoginHistory.findOne({
      where: { user_id: userId },
      order: [['login_time', 'DESC']]
    })
    if (!result) return 0
    const end = result.logout_time || result.last_active_at || new Date()
    const diff = new Date(end) - new Date(result.login_time)
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
    return req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip
  }

  static async checkVPN(ip) {
    if (isPrivateIP(ip)) {
      return 0
    }

    const API_KEY = process.env.IP_QUALITY_SCORE_API_KEY

    const response = await axios.get(
      `https://ipqualityscore.com/api/json/ip/${API_KEY}/${ip}`
    )

    return response.data.vpn ? 1 : 0
  }

  static async getLocation(ip) {
    const response = await axios.get(`http://ip-api.com/json/${ip}`)

    return {
      country: response.data.country,
      city: response.data.city,
      lat: response.data.lat,
      lon: response.data.lon
    }
  }
}

module.exports = Controller
