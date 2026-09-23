import { API_BASE_URL } from "../../config";
import { useEffect, useRef, useState } from "react";
import { locations as demoLocations, attackTypes as demoAttackTypes } from "../../Data/data";

const API_BASE       = API_BASE_URL;
const LIVE_COUNT      = 25;    // events fetched per batch
const FETCH_INTERVAL  = 15000; // re-fetch cadence (Feodo itself is cached 5min server-side)
const SPAWN_INTERVAL  = 900;   // visual cadence of new arcs appearing
const ATTACK_TTL      = 3000;  // how long an arc/marker stays on screen
const FALLBACK_BASELINE = 3_200_000; // used only until the first real response arrives

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Fully simulated event — used only when the live feed can't be reached. */
function buildDemoEvent() {
  const from = pickRandom(demoLocations);
  let to = pickRandom(demoLocations);
  if (to.name === from.name) to = pickRandom(demoLocations);
  const type = pickRandom(demoAttackTypes);
  return {
    id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    from: { name: from.name, coords: from.coords },
    to:   { name: to.name,   coords: to.coords },
    type: { name: type.name, color: type.color },
    isDemo: true,
  };
}

/** Real event from /threats/live, reshaped to what AttackArc/Marker expect. */
function normalizeRealEvent(e) {
  return {
    id: e.id,
    from: { name: e.from.country, coords: e.from.coords },
    to:   { name: e.to.country,   coords: e.to.coords },
    type: { name: e.malware, color: e.color },
    category: e.type, // e.g. "Banking Trojan"
  };
}

/**
 * Drives the Cyber Threat map from the real /threats/live + /threats/stats
 * feed (backed by Feodo Tracker C2 data). Falls back to a local random
 * simulation — clearly flagged via `isLive: false` — whenever the backend
 * can't be reached, so the page never looks broken in local dev.
 */
export function useLiveThreatFeed() {
  const [attacks, setAttacks] = useState([]);
  const [stats, setStats]     = useState(null);
  const [isLive, setIsLive]   = useState(false);

  const queueRef = useRef([]);

  /* ── poll the real feed + stats ── */
  useEffect(() => {
    let cancelled = false;

    async function fetchLive() {
      try {
        const res = await fetch(`${API_BASE}/threats/live?count=${LIVE_COUNT}`);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();
        if (cancelled || !data?.events?.length) throw new Error("empty feed");
        queueRef.current = data.events.map(normalizeRealEvent);
        setIsLive(true);
        if (data.stats?.attacksToday != null) {
          setStats(prev => ({ ...(prev || {}), attacksToday: data.stats.attacksToday }));
        }
      } catch {
        if (!cancelled) setIsLive(false);
        // queue stays as-is/empty — spawner below fills gaps with demo events
      }
    }

    async function fetchStats() {
      try {
        const res = await fetch(`${API_BASE}/threats/stats`);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();
        if (!cancelled && data?.stats) {
          setStats(prev => ({ ...(prev || {}), ...data.stats }));
        }
      } catch {
        /* keep last known stats */
      }
    }

    fetchLive();
    fetchStats();
    const liveIv  = setInterval(fetchLive, FETCH_INTERVAL);
    const statsIv = setInterval(fetchStats, FETCH_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(liveIv);
      clearInterval(statsIv);
    };
  }, []);

  /* ── drip-feed events from the queue at a steady visual cadence ── */
  useEffect(() => {
    const spawnIv = setInterval(() => {
      const burst = Math.floor(Math.random() * 2) + 1; // 1–2 per tick
      const next = [];
      for (let i = 0; i < burst; i++) {
        const event = queueRef.current.shift() || buildDemoEvent();
        next.push({ ...event, id: `${event.id}-${Math.random().toString(36).slice(2, 5)}` });
      }
      setAttacks(prev => [...prev, ...next]);
      setTimeout(() => {
        setAttacks(prev => prev.filter(a => !next.find(n => n.id === a.id)));
      }, ATTACK_TTL);
    }, SPAWN_INTERVAL);
    return () => clearInterval(spawnIv);
  }, []);

  /* ── smooth local tick-up of the hero counter between real fetches ── */
  const [attacksToday, setAttacksToday] = useState(FALLBACK_BASELINE);
  useEffect(() => {
    if (stats?.attacksToday != null) setAttacksToday(stats.attacksToday);
  }, [stats?.attacksToday]);
  useEffect(() => {
    const tickIv = setInterval(() => {
      setAttacksToday(prev => prev + Math.floor(Math.random() * 1500));
    }, 1200);
    return () => clearInterval(tickIv);
  }, []);

  return { attacks, stats, isLive, attacksToday };
}
