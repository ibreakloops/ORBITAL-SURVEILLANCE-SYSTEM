import { useEffect, useRef, useState } from 'react'

const WS_URL = `ws://${window.location.host}/ws?limit=300`

export function useSatelliteStream() {
  const [satellites, setSatellites] = useState([])
  const [connected, setConnected]   = useState(false)
  const [count, setCount]           = useState(0)
  const wsRef     = useRef(null)
  const timerRef  = useRef(null)
  const mounted   = useRef(true)

  useEffect(() => {
    mounted.current = true

    function connect() {
      if (!mounted.current) return
      try {
        const ws = new WebSocket(WS_URL)
        wsRef.current = ws

        ws.onopen  = () => { if (mounted.current) setConnected(true) }

        ws.onclose = () => {
          if (!mounted.current) return
          setConnected(false)
          timerRef.current = setTimeout(connect, 3000)
        }

        ws.onerror = () => {
          ws.close()
        }

        ws.onmessage = (e) => {
          if (!mounted.current) return
          try {
            const msg = JSON.parse(e.data)
            if (msg.type === 'positions') {
              setSatellites(msg.data)
              setCount(msg.count)
            }
          } catch (_) {}
        }
      } catch (_) {
        timerRef.current = setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      mounted.current = false
      clearTimeout(timerRef.current)
      wsRef.current?.close()
    }
  }, [])

  return { satellites, connected, count }
}