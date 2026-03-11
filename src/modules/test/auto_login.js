const axios = require('axios')

async function autoLogin() {
  const loginUrl = 'http://localhost:5000/auth/login'
  const email = 'testing@gmail.com'
  const password = 'Jxx871kr59'

  // Number of times to attempt login
  const attempts = 15 // 25 for HIGH, 15 for MEDIUM, <10 for LOW

  console.log(`Starting ${attempts} login attempts for ${email}...`)

  for (let i = 0; i < attempts; i++) {
    try {
      const response = await axios.post(
        loginUrl,
        {
          email: email,
          master_password: password
        },
        {
          // Simulate different user agents to increase perceived risk
          headers: {
            'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.${Math.floor(Math.random() * 1000)} Safari/537.36`
          }
        }
      )

      console.log(`Attempt ${i + 1}: Success - Status: ${response.status}`)
      // Add a minimal delay between requests
      await new Promise((resolve) => setTimeout(resolve, 1))
    } catch (error) {
      if (error.response) {
        console.log(
          `Attempt ${i + 1}: Failed - Status: ${error.response.status} - ${error.response.data.message}`
        )
      } else {
        console.log(`Attempt ${i + 1}: Error - ${error.message}`)
      }
    }
  }
}

autoLogin()
