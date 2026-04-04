import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AuthButton from './AuthButton'
import type { AuthUser } from '../auth'

const mockUser: AuthUser = {
  sub: '123',
  name: 'Test User',
  email: 'test@example.com',
  picture: 'https://example.com/photo.jpg',
  credential: 'fake.jwt.token',
  exp: Math.floor(Date.now() / 1000) + 3600,
}

describe('AuthButton', () => {
  it('shows sign-in placeholder when gisReady is false', () => {
    render(<AuthButton user={null} onSignOut={() => {}} gisReady={false} />)
    expect(screen.getByText('Sign in')).toBeInTheDocument()
  })

  it('renders button container div when gisReady is true', () => {
    // Mock the google global so renderButton doesn't throw
    const renderButton = vi.fn()
    globalThis.google = {
      accounts: { id: { renderButton } },
    } as unknown as typeof google
    const { container } = render(
      <AuthButton user={null} onSignOut={() => {}} gisReady={true} />,
    )
    expect(container.querySelector('div div div')).toBeInTheDocument()
    expect(renderButton).toHaveBeenCalledOnce()
    // @ts-expect-error cleanup global
    delete globalThis.google
  })

  it('shows avatar and sign-out when signed in', () => {
    render(<AuthButton user={mockUser} onSignOut={() => {}} gisReady={false} />)
    expect(screen.getByRole('presentation')).toHaveAttribute('src', mockUser.picture)
    expect(screen.getByText('Sign out')).toBeInTheDocument()
  })

  it('calls onSignOut on sign-out click', async () => {
    const onSignOut = vi.fn()
    render(<AuthButton user={mockUser} onSignOut={onSignOut} gisReady={false} />)
    await userEvent.click(screen.getByText('Sign out'))
    expect(onSignOut).toHaveBeenCalledOnce()
  })
})
