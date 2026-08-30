import { render, screen } from '@testing-library/react'
import App from '@/App'

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the three main tabs (zh default)', async () => {
    render(<App />)
    expect(await screen.findByText('今日')).toBeTruthy()
    expect(screen.getByText('饭局')).toBeTruthy()
    expect(screen.getByText('任务')).toBeTruthy()
    // empty app: Today shows the empty-state panel once stores are ready (settles init in act)
    await screen.findByText('还没有任何数据')
  })
})
