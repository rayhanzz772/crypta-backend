const axios = require('axios')

async function predictAnomaly(features) {
  const response = await axios.post(`${process.env.API_ML}/predict`, features)

  return response.data
}

module.exports = {
  predictAnomaly
}
