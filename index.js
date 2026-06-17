const express = require('express')
const cors = require('cors')
const http = require('http')
const session = require('express-session')
const cookieParser = require('cookie-parser')
require('dotenv').config()

const privateRoute = require('./src/routes/private-routes.js')
const clientRoutes = require('./src/routes/client-route.js')
const authRoutes = require('./src/modules/auth')
const { checkMlServiceReady } = require('./src/services/apiPredict')
const csrfProtection = require('./src/utils/csrf')

const app = express()

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',

  // ✅ production
  'https://crypta.rayhancreative.web.id',
  'https://www.crypta.rayhancreative.web.id',
  'https://crypta-frontend.vercel.app'
]

const corsOptions = {
  origin: function (origin, callback) {
    console.log('CORS Origin:', origin)
    if (!origin) return callback(null, true)

    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    }

    try {
      const originUrl = new URL(origin)
      const hostname = originUrl.hostname

      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.endsWith('.rayhancreative.web.id')
      ) {
        return callback(null, true)
      }
    } catch (error) {
      // Fall through to the rejection below.
    }

    return callback(
      new Error(
        'The CORS policy for this site does not allow access from the specified Origin.'
      ),
      false
    )
  },
  credentials: true,
  optionsSuccessStatus: 204
}

app.use(
  cors(corsOptions)
)

app.options(/.*/, cors(corsOptions))

app.use(express.json())
app.use(cookieParser())

// Session for Two-Step Recovery
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'crypta-session-secret-change-me',
    resave: false,
    saveUninitialized: false,
    name: 'crypta_sid', // custom name to avoid generic connect.sid
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 3600000 // 1 hour for recovery window
    }
  })
)
app.use('/public', express.static('public'))
app.use('/auth', authRoutes)
app.use('/api', csrfProtection, privateRoute)
app.use('/client', csrfProtection, clientRoutes)

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    data: null
  })
})

const port = process.env.PORT || 5000
const server = http.createServer(app)

server.listen(port, () => {
  console.log(`⚡ Server running on PORT: ${port}`)
  checkMlServiceReady()
})

module.exports = app
