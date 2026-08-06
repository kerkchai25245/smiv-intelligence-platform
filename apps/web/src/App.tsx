import { useEffect, useState } from 'react'

type Health = { status: string; service: string; version: string }

export function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'
    fetch(`${baseUrl}/v1/health`)
      .then((response) => {
        if (!response.ok) throw new Error('API unavailable')
        return response.json() as Promise<Health>
      })
      .then(setHealth)
      .catch(() => setOffline(true))
  }, [])

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">SMI-V Intelligence Platform</p>
        <h1>Operational intelligence, ready to grow.</h1>
        <p className="summary">
          The Phase 1 foundation is online. Data ingestion, analytics, and dashboard modules can now be added on a stable platform.
        </p>
        <div className={`status ${offline ? 'status--offline' : ''}`} role="status">
          <span aria-hidden="true" />
          {health ? `${health.service} v${health.version} connected` : offline ? 'API unavailable' : 'Checking platform health…'}
        </div>
      </section>
      <section className="grid" aria-label="Platform foundations">
        {[
          ['Web', 'React + TypeScript'],
          ['API', 'FastAPI + PostgreSQL'],
          ['Operations', 'Docker + Nginx'],
        ].map(([title, detail]) => (
          <article key={title}><h2>{title}</h2><p>{detail}</p></article>
        ))}
      </section>
    </main>
  )
}

