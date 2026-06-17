/**
 * In-memory token blacklist for server-side JWT invalidation on logout.
 *
 * When a user logs out, their JWT is added here with a TTL equal to the
 * token's remaining lifetime. Once expired, the entry is automatically
 * removed, so memory usage stays bounded.
 *
 * NOTE: This is process-local — in multi-instance deployments, replace
 * with a shared store (Redis) for cross-process revocation.
 */

// Map<tokenString, expiryTimestamp (ms)>
const blacklist = new Map()

// Periodic cleanup of expired entries (every 5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

const cleanupTimer = setInterval(() => {
  const now = Date.now()
  for (const [token, expiry] of blacklist) {
    if (now >= expiry) {
      blacklist.delete(token)
    }
  }
}, CLEANUP_INTERVAL_MS)

// Allow Node.js to exit even if the timer is still running
if (cleanupTimer.unref) {
  cleanupTimer.unref()
}

/**
 * Add a token to the blacklist until it naturally expires.
 * @param {string} token - The JWT string
 * @param {number} expiresAtMs - Token expiry time in epoch ms (from decoded.exp * 1000)
 */
function blacklistToken(token, expiresAtMs) {
  const now = Date.now()
  if (expiresAtMs <= now) return // Already expired, no need to track

  blacklist.set(token, expiresAtMs)
}

/**
 * Check if a token has been blacklisted (logged out).
 * @param {string} token - The JWT string
 * @returns {boolean}
 */
function isTokenBlacklisted(token) {
  const expiry = blacklist.get(token)
  if (!expiry) return false

  // If expired, clean up and treat as not blacklisted
  if (Date.now() >= expiry) {
    blacklist.delete(token)
    return false
  }

  return true
}

/**
 * Get the current size of the blacklist (for monitoring/debugging).
 */
function blacklistSize() {
  return blacklist.size
}

module.exports = { blacklistToken, isTokenBlacklisted, blacklistSize }
