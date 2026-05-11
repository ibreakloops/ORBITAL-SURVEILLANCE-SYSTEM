import { useState, useEffect } from 'react'

const BASE = 'http://localhost:8000'

export function useOrbitPath(satId) {
  const [path, setPath]       = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!satId) { setPath([]); return }
    let cancelled = false
    setLoading(true)
    fetch(`${BASE}/satellite/${satId}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setPath(d.orbit ?? []) })
      .catch(() => { if (!cancelled) setPath([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [satId])

  return { path, loading }
}

export function usePasses(satId, lat, lon) {
  const [passes, setPasses]   = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!satId || lat == null || lon == null) return
    let cancelled = false
    setLoading(true)
    fetch(`${BASE}/passes?sat_id=${satId}&lat=${lat}&lon=${lon}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setPasses(d.passes ?? []) })
      .catch(() => { if (!cancelled) setPasses([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [satId, lat, lon])

  return { passes, loading }
}