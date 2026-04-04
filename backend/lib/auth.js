import { createRemoteJWKSet, jwtVerify } from 'jose'

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/oauth2/v3/certs'),
)

export async function verifyToken(token) {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, GOOGLE_JWKS, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: process.env.GOOGLE_CLIENT_ID,
    })
    return { sub: payload.sub, email: payload.email }
  } catch {
    return null
  }
}

export async function authenticate(event) {
  const authHeader = event.headers?.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  return verifyToken(token)
}
