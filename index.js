const express = require('express')
const cors = require('cors')
const http = require('http')
const session = require('express-session')
require('dotenv').config()

const privateRoute = require('./src/routes/private-routes.js')
const clientRoutes = require('./src/routes/client-route.js')
const authRoutes = require('./src/modules/auth')

const app = express()

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173', // common vite port
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173'
]

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true)
      if (allowedOrigins.indexOf(origin) === -1) {
        var msg =
          'The CORS policy for this site does not ' +
          'allow access from the specified Origin.'
        return callback(new Error(msg), false)
      }
      return callback(null, true)
    },
    credentials: true
  })
)

app.use(express.json())

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

app.use('/auth', authRoutes)
app.use('/api', privateRoute)
app.use('/client', clientRoutes)

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
})

module.exports = app
