import { useState, useEffect } from 'react'
import { usePasses } from '../hooks/usePasses'
import styles from './DetailPanel.module.css'

const BASE = 'http://localhost:8000'

function fmtDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'UTC', timeZoneName: 'short',
    })
  } catch { return iso }
}

function orbitColor(type) {
  return { LEO: '#00ff9d', MEO: '#00d4ff', HEO: '#ffb300', GEO: '#ff6b6b' }[type] ?? '#888'
}

export default function DetailPanel({ satellite, onClose }) {
  // Default observer: San Diego — user can edit
  const [lat, setLat] = useState(32.72)
  const [lon, setLon] = useState(-117.15)
  const [latInput, setLatInput] = useState('32.72')
  const [lonInput, setLonInput] = useState('-117.15')
  const [elements, setElements] = useState(null)

  const { passes, loading } = usePasses(satellite?.id, lat, lon)

  useEffect(() => {
    if (!satellite?.id) return
    let cancelled = false
    fetch(`${BASE}/satellite/${satellite.id}`)
      .then(r => r.json())
      .then(d => { if (!cancelled && d.elements) setElements(d.elements) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [satellite?.id])

  function applyLocation() {
    const la = parseFloat(latInput)
    const lo = parseFloat(lonInput)
    if (!isNaN(la) && !isNaN(lo)) { setLat(la); setLon(lo) }
  }

  if (!satellite) return null

  const speedPct = Math.min((satellite.speed_kms / 8) * 100, 100)
  const orbitType = elements?.orbit_type ?? null

  return (
    <aside className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.nameRow}>
            <div className={styles.name}>{satellite.name}</div>
            {orbitType && (
              <span
                className={styles.orbitBadge}
                style={{ color: orbitColor(orbitType), borderColor: orbitColor(orbitType) }}
              >
                {orbitType}
              </span>
            )}
          </div>
          <div className={styles.norad}>NORAD ID: {satellite.id}</div>
        </div>
        <button className={styles.close} onClick={onClose} aria-label="Close">✕</button>
      </div>

      {/* Telemetry grid */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>LIVE TELEMETRY</div>
        <div className={styles.grid}>
          <div className={styles.cell}>
            <div className={styles.val}>{satellite.lat.toFixed(3)}°</div>
            <div className={styles.key}>LATITUDE</div>
          </div>
          <div className={styles.cell}>
            <div className={styles.val}>{satellite.lon.toFixed(3)}°</div>
            <div className={styles.key}>LONGITUDE</div>
          </div>
          <div className={styles.cell}>
            <div className={styles.val}>
              {satellite.alt_km.toLocaleString()}
              <span className={styles.unit}> km</span>
            </div>
            <div className={styles.key}>ALTITUDE</div>
          </div>
          <div className={styles.cell}>
            <div className={styles.val}>
              {satellite.speed_kms}
              <span className={styles.unit}> km/s</span>
            </div>
            <div className={styles.key}>VELOCITY</div>
          </div>
        </div>

        {/* Speed bar */}
        <div className={styles.barTrack}>
          <div className={styles.barFill} style={{ width: `${speedPct}%` }} />
        </div>
        <div className={styles.barLabels}>
          <span>0</span><span>ORBITAL VELOCITY</span><span>8 km/s</span>
        </div>
      </div>

      {/* Orbital Elements */}
      {elements && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>ORBITAL ELEMENTS</div>
          <div className={styles.elemGrid}>
            <div className={styles.cell}>
              <div className={styles.val}>{elements.incl_deg}°</div>
              <div className={styles.key}>INCLINATION</div>
            </div>
            <div className={styles.cell}>
              <div className={styles.val}>{elements.ecc.toFixed(5)}</div>
              <div className={styles.key}>ECCENTRICITY</div>
            </div>
            <div className={styles.cell}>
              <div className={styles.val}>
                {elements.period_min != null ? elements.period_min : '—'}
                <span className={styles.unit}> min</span>
              </div>
              <div className={styles.key}>PERIOD</div>
            </div>
            <div className={styles.cell}>
              <div className={styles.val}>{elements.raan_deg}°</div>
              <div className={styles.key}>RAAN</div>
            </div>
          </div>
          {/* Inclination bar */}
          <div className={styles.inclWrap}>
            <div className={styles.inclBar}>
              <div
                className={styles.inclFill}
                style={{ width: `${Math.min((elements.incl_deg / 180) * 100, 100)}%` }}
              />
            </div>
            <div className={styles.barLabels}>
              <span>0°</span><span>INCLINATION</span><span>180°</span>
            </div>
          </div>
          {elements.epoch_age_days != null && (
            <div className={styles.epochRow}>
              <span className={styles.epochKey}>TLE AGE</span>
              <span
                className={styles.epochVal}
                style={{ color: elements.epoch_age_days > 14 ? 'var(--red)' : elements.epoch_age_days > 7 ? 'var(--amber)' : 'var(--green)' }}
              >
                {elements.epoch_age_days}d
              </span>
              <span className={styles.epochDate}>{elements.epoch ? elements.epoch.slice(0, 16).replace('T', ' ') + ' UTC' : ''}</span>
            </div>
          )}
        </div>
      )}

      {/* Pass predictions */}
      <div className={styles.section} style={{ flex: 1, overflowY: 'auto' }}>
        <div className={styles.sectionLabel}>UPCOMING PASSES</div>

        <div className={styles.locRow}>
          <input
            className={styles.locInput}
            placeholder="Lat"
            value={latInput}
            onChange={e => setLatInput(e.target.value)}
          />
          <input
            className={styles.locInput}
            placeholder="Lon"
            value={lonInput}
            onChange={e => setLonInput(e.target.value)}
          />
          <button className={styles.locBtn} onClick={applyLocation}>SET</button>
        </div>

        {loading && <div className={styles.loading}>Computing…</div>}

        {!loading && passes.length === 0 && (
          <div className={styles.noPasses}>
            No passes in next 24h<br />
            <span>Try a different location</span>
          </div>
        )}

        {passes.map((p, i) => (
          <div key={i} className={styles.passCard}>
            <div className={styles.passNum}>PASS {i + 1}</div>
            <div className={styles.passRow}>
              <span className={styles.passKey}>RISE</span>
              <span className={styles.passVal}>{fmtDate(p.rise)}</span>
            </div>
            {p.peak && (
              <div className={styles.passRow}>
                <span className={styles.passKey}>PEAK</span>
                <span className={styles.passVal}>{fmtDate(p.peak)} · {p.peak_el}° el</span>
              </div>
            )}
            <div className={styles.passRow}>
              <span className={styles.passKey}>SET</span>
              <span className={styles.passVal}>{fmtDate(p.set)}</span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}