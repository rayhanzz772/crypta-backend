const { Groq } = require('groq-sdk')

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

async function analyzeRisk(contextData) {
  const {
    userEmail,
    ipAddress,
    location,
    device,
    riskLevel,
    loginTime,
    isVpn,
    lastIp,
    lastLocation
  } = contextData

  const prompt = `
  You are an expert cybersecurity analyst. Analyze the risk of the latest login compared to the previous login data:
  
  [Current Login]
  - Email: ${userEmail || 'Unknown'}
  - IP: ${ipAddress || 'Unknown'}
  - Location: ${location || 'Unknown'}
  - Device: ${device || 'Unknown'}
  - Time: ${loginTime || 'Unknown'}
  - VPN: ${isVpn ? 'Detected' : 'Not Detected'}
  
  [Previous Login]
  - Previous IP: ${lastIp || 'Unknown'}
  - Previous Location: ${lastLocation || 'Unknown'}
  
  - Current Risk Level: ${riskLevel || 'Low'}

  Tasks:
  1. Risk Analysis: Provide MAX 3-4 sentences explaining why this login is classified as "${riskLevel}" risk. Focus on location/IP differences if notable.
  2. Recommendations: Provide 2 short mitigation points (max 20 words each).
  
  IMPORTANT FORMAT: 
  Write the response using basic HTML tags only (<b> for bold, <br> for new line, <ul><li> for bullet points).
  STRICTLY FORBIDDEN to use markdown like ** or # or any other markdown characters.
  `

  let aiInsight = 'Failed to retrieve AI analysis.'

  try {
    const response = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert cybersecurity analyst. Provide concise, clear risk insights in English.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 800
    })

    const textBlock = response.choices[0]?.message?.content
    if (textBlock) {
      aiInsight = textBlock
    }
  } catch (error) {
    console.error('[Groq RAG API Error]:', error.message)
    return 'Terjadi kesalahan saat menghubungkan ke Groq AI Analysis Pipeline.'
  }

  aiInsight = aiInsight.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim()
  aiInsight = aiInsight.replace(/^thought\n[\s\S]*?\n/i, '').trim()

  return aiInsight
}

module.exports = { analyzeRisk }
