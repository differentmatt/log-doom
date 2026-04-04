import { useRef, useEffect } from 'react'
import type { AuthUser } from '../auth'

interface AuthButtonProps {
  user: AuthUser | null
  onSignOut: () => void
  gisReady: boolean
}

export default function AuthButton({ user, onSignOut, gisReady }: AuthButtonProps) {
  const btnRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (gisReady && !user && btnRef.current) {
      google.accounts.id.renderButton(btnRef.current, {
        type: 'icon',
        theme: 'filled_black',
        size: 'medium',
        shape: 'circle',
      })
    }
  }, [gisReady, user])

  if (user) {
    return (
      <div className="absolute left-0 flex items-center gap-1.5">
        <img
          src={user.picture}
          alt=""
          width={28}
          height={28}
          className="rounded-full"
          referrerPolicy="no-referrer"
        />
        <button
          onClick={onSignOut}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          Sign out
        </button>
      </div>
    )
  }

  if (!gisReady) {
    return (
      <div className="absolute left-0 flex items-center gap-1 text-zinc-500 h-8">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
        <span className="text-xs">Sign in</span>
      </div>
    )
  }

  return (
    <div className="absolute left-0 flex items-center h-8">
      <div ref={btnRef} />
    </div>
  )
}
