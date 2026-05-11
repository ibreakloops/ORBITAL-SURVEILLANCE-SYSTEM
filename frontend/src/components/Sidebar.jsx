import { useState, useMemo } from 'react'
import styles from './Sidebar.module.css'

const CATS = {
  ALL:      () => true,
  ISS:      s => s.name.includes('ISS') || s.name.includes('ZARYA'),
  STARLINK: s => s.name.includes('STARLINK'),
  WEATHER:  s => ['NOAA','GOES','METEO'].some(k => s.name.includes(k)),
  GPS:      s => s.name.includes('GPS') || s.name.includes('NAVSTAR'),
  OTHER:    s => !['STARLINK','ISS','ZARYA','NOAA','GOES','GPS','NAVSTAR'].some(k => s.name.includes(k)),
}

function altInfo(km) {
  if (km < 500)   return { label: 'LEO', color: '#00ff9d' }
  if (km < 2000)  return { label: 'MEO', color: '#00d4ff' }
  if (km < 35786) return { label: 'HEO', color: '#ffb300' }
  return              { label: 'GEO', color: '#ff6b6b' }
}

export default function Sidebar({ satellites, selected, onSelect }) {
  const [q, setQ]     = useState('')
  const [cat, setCat] = useState('ALL')

  const list = useMemo(() => {
    const fn = CATS[cat]
    return satellites
      .filter(fn)
      .filter(s => s.name.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 100)
  }, [satellites, q, cat])

  return (
    <aside className={styles.sidebar}>
      {/* Search */}
      <div className={styles.searchWrap}>
        <span className={styles.searchIcon}>⌕</span>
        <input
          className={styles.input}
          placeholder="Search satellites..."
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        {q && (
          <button className={styles.clear} onClick={() => setQ('')}>×</button>
        )}
      </div>

      {/* Category pills */}
      <div className={styles.cats}>
        {Object.keys(CATS).map(c => (
          <button
            key={c}
            className={`${styles.cat} ${cat === c ? styles.catOn : ''}`}
            onClick={() => setCat(c)}
          >{c}</button>
        ))}
      </div>

      {/* Stat row */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statN}>{satellites.length}</div>
          <div className={styles.statL}>TRACKED</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statN}>{list.length}</div>
          <div className={styles.statL}>SHOWN</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statN}>2s</div>
          <div className={styles.statL}>UPDATE</div>
        </div>
      </div>

      {/* List */}
      <ul className={styles.list}>
        {list.length === 0 && (
          <li className={styles.empty}>No results</li>
        )}
        {list.map(sat => {
          const info = altInfo(sat.alt_km)
          const active = selected?.id === sat.id
          return (
            <li
              key={sat.id}
              className={`${styles.item} ${active ? styles.itemOn : ''}`}
              onClick={() => onSelect(active ? null : sat)}
            >
              <span className={styles.dot} style={{ background: info.color }} />
              <div className={styles.itemBody}>
                <div className={styles.itemName}>{sat.name}</div>
                <div className={styles.itemSub}>
                  {Math.abs(sat.lat).toFixed(1)}°{sat.lat >= 0 ? 'N' : 'S'} &nbsp;
                  {Math.abs(sat.lon).toFixed(1)}°{sat.lon >= 0 ? 'E' : 'W'}
                </div>
              </div>
              <div className={styles.itemRight}>
                <span className={styles.badge} style={{ color: info.color, borderColor: info.color }}>
                  {info.label}
                </span>
                <span className={styles.alt}>{sat.alt_km} km</span>
              </div>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}