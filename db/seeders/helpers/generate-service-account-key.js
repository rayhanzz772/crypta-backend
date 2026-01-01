const { generateKeyPair } = require('jose')

export async function generateServiceAccountKey() {
  const { publicKey, privateKey } = await generateKeyPair('RS256')

  return {
    publicKeyPem: await crypto.subtle.exportKey('spki', publicKey),
    privateKeyPem: await crypto.subtle.exportKey('pkcs8', privateKey)
  }
}
