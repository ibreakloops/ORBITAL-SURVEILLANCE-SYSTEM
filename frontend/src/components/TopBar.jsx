import { useState, useEffect } from 'react'
import styles from './TopBar.module.css'

export default function TopBar({ connected, count }) {
  const [utc, setUtc] = useState('')

  useEffect(() => {
    const tick = () => setUtc(new Date().toUTCString().slice(5, 25))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className={styles.bar}>
      <div className={styles.left}>
        <span className={styles.logo}>◈</span>
        <span className={styles.title}>SATTRACK</span>
        <span className={styles.sep}>|</span>
        <span className={styles.sub}>ORBITAL SURVEILLANCE SYSTEM</span>
      </div>
      <div className={styles.center}>
        <span className={styles.utc}>UTC {utc}</span>
      </div>
      <div className={styles.right}>
        <div className={`${styles.ws} ${connected ? styles.online : styles.offline}`}>
          <span className={styles.dot} />
          {connected ? `LIVE · ${count} SATS` : 'RECONNECTING'}
        </div>
        <span className={styles.sep}>|</span>
        <span className={styles.sub}>SRC: CELESTRAK · SGP4</span>
      </div>
    </header>
  )
}