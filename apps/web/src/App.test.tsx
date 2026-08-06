import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('renders the platform foundation', () => {
    sessionStorage.clear()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'ok', service: 'SMI-V API', version: '0.1.0' }),
      }),
    )
    render(<App />)
    expect(screen.getByRole('heading', { name: /ข้อมูลที่พร้อม/i })).toBeInTheDocument()
    expect(screen.getByText(/SMI-V Intelligence Platform/i)).toBeInTheDocument()
  })
})
