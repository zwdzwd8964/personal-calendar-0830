import { render, screen } from '@testing-library/react'
import AuthGate from './AuthGate'

describe('AuthGate', () => {
  it('passes children through untouched when supabase env is absent (local mode)', () => {
    render(
      <AuthGate>
        <div data-testid="app-content">内容</div>
      </AuthGate>,
    )
    expect(screen.getByTestId('app-content')).toBeTruthy()
  })
})
