export interface AuthUser {
  sub: string
  name: string
  email: string
  picture: string
  credential: string
  exp: number
}

const AUTH_KEY = 'logdoom:auth'

function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const base64Url = jwt.split('.')[1]
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  const json = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join(''),
  )
  return JSON.parse(json)
}

function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof google !== 'undefined' && google.accounts?.id) {
      resolve()
      return
    }
    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(script)
  })
}

export function isExpired(user: AuthUser): boolean {
  return user.exp * 1000 - Date.now() < 60_000
}

export function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const user: AuthUser = JSON.parse(raw)
    if (isExpired(user)) {
      localStorage.removeItem(AUTH_KEY)
      return null
    }
    return user
  } catch {
    localStorage.removeItem(AUTH_KEY)
    return null
  }
}

export function signOut(user: AuthUser | null): void {
  void user
  localStorage.removeItem(AUTH_KEY)
  if (typeof google !== 'undefined' && google.accounts?.id) {
    google.accounts.id.disableAutoSelect()
  }
}

export function getCredential(user: AuthUser | null): string | null {
  if (!user || isExpired(user)) return null
  return user.credential
}

export function initGoogleAuth(
  onCredential: (user: AuthUser) => void,
  onReady?: () => void,
): void {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) return

  loadGisScript()
    .then(() => {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          const payload = decodeJwtPayload(response.credential)
          const user: AuthUser = {
            sub: payload.sub as string,
            name: payload.name as string,
            email: payload.email as string,
            picture: payload.picture as string,
            credential: response.credential,
            exp: payload.exp as number,
          }
          localStorage.setItem(AUTH_KEY, JSON.stringify(user))
          onCredential(user)
        },
        auto_select: true,
      })
      google.accounts.id.prompt()
      onReady?.()
    })
    .catch((err) => {
      console.warn('Google Sign-In unavailable:', err)
    })
}
