import { useState, useEffect, useCallback } from 'react'
import { useSatelliteStream } from './hooks/useSatelliteStream'
import { useOrbitPath } from './hooks/usePasses'
import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar'
import Globe from './components/Globe'
import DetailPanel from './components/DetailPanel'
import styles from './App.module.css'

export default function App() {
  const { satellites, connected, count } = useSatelliteStream()
  const [selected, setSelected] = useState(null)

  // Always show the latest live data for the selected satellite
  const liveSelected = selected
    ? (satellites.find(s => s.id === selected.id) ?? selected)
    : null

  const { path: orbitPath } = useOrbitPath(liveSelected?.id ?? null)

  const handleSelect = useCallback((sat) => setSelected(sat), [])

  return (
    <div className={styles.app}>
      <TopBar connected={connected} count={count} />
      <div className={styles.body}>
        <Sidebar
          satellites={satellites}
          selected={liveSelected}
          onSelect={handleSelect}
          connected={connected}
          count={count}
        />
        <main className={styles.main}>
          <Globe
            satellites={satellites}
            selected={liveSelected}
            onSelect={handleSelect}
            orbitPath={orbitPath}
          />
        </main>
        {liveSelected && (
          <DetailPanel
            satellite={liveSelected}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  )
}