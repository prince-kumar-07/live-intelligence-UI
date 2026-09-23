import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { API_BASE_URL } from '../../config'
import styles from './ServerWakeup.module.css'

const SHOW_AFTER_MS = 2000 // only show the overlay if the server is slow to answer
const POLL_MS = 2500
const TOTAL_SECONDS = 60
const RECHECK_AFTER_MS = 10 * 60 * 1000 // Render sleeps after 15 min idle

const STEPS = [
  'Waking up the server',
  'Booting services',
  'Connecting to database',
  'Loading threat feeds',
  'Establishing secure channel',
]

async function ping() {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch(`${API_BASE_URL}/health`, { signal: ctrl.signal, cache: 'no-store' })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(t)
  }
}

export default function ServerWakeup() {
  const [visible, setVisible] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const runId = useRef(0)
  const lastOk = useRef(0)

  const check = useCallback(async () => {
    const id = ++runId.current
    const startedAt = Date.now()
    let shown = false
    let tick = null

    const showTimer = setTimeout(() => {
      if (runId.current !== id) return
      shown = true
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
      setVisible(true)
      tick = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 250)
    }, SHOW_AFTER_MS)

    while (runId.current === id) {
      if (await ping()) break
      await new Promise((r) => setTimeout(r, POLL_MS))
    }

    clearTimeout(showTimer)
    if (tick) clearInterval(tick)
    if (runId.current === id) {
      lastOk.current = Date.now()
      if (shown) setVisible(false)
    }
  }, [])

  useEffect(() => {
    lastOk.current = Date.now()
    check()
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastOk.current > RECHECK_AFTER_MS) {
        check()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      runId.current++
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [check])

  const remaining = Math.max(0, TOTAL_SECONDS - elapsed)
  const overtime = elapsed >= TOTAL_SECONDS
  const step = Math.min(STEPS.length - 1, Math.floor((elapsed / TOTAL_SECONDS) * STEPS.length))
  const C = 2 * Math.PI * 54
  const progress = Math.min(1, elapsed / TOTAL_SECONDS)

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={styles.overlay}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className={styles.card}>
            <div className={styles.radar}>
              <svg viewBox="0 0 120 120" className={styles.ring}>
                <circle cx="60" cy="60" r="54" className={styles.track} />
                <circle
                  cx="60" cy="60" r="54"
                  className={styles.bar}
                  strokeDasharray={C}
                  strokeDashoffset={C * (1 - progress)}
                />
              </svg>
              <div className={styles.rings} />
              <div className={styles.sweep} />
              <span className={styles.dot} style={{ top: '30%', left: '62%' }} />
              <span className={styles.dot} style={{ top: '64%', left: '32%', animationDelay: '0.9s' }} />
              <span className={styles.dot} style={{ top: '52%', left: '70%', animationDelay: '1.7s' }} />
              <div className={styles.time}>{overtime ? '…' : remaining}<small>{overtime ? '' : 's'}</small></div>
            </div>

            <h2 className={styles.title}>{overtime ? 'Taking longer than usual' : 'Starting the server'}</h2>
            <p className={styles.sub}>
              {overtime
                ? 'Still trying to reach the server. It will load automatically once it responds.'
                : 'Our server sleeps when idle. It usually takes up to a minute to wake up — hang tight.'}
            </p>

            {!overtime && (
              <ul className={styles.steps}>
                {STEPS.map((s, i) => (
                  <li key={s} className={i < step ? styles.done : i === step ? styles.active : ''}>
                    <span className={styles.tick}>{i < step ? '✓' : i === step ? '›' : '·'}</span>
                    {s}
                  </li>
                ))}
              </ul>
            )}

            {overtime && (
              <button className={styles.retry} onClick={check}>Retry now</button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
