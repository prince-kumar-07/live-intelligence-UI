import { useEffect, useState } from "react";
import styles from "./Home.module.css";
import { useNavigate } from "react-router-dom";

const TITLES = [
  "Global Event\nIntelligence",
  "Real-Time Threat\nMonitoring",
  "Cyber & Crisis\nIntelligence",
  "Global Risk\nAnalytics Platform",
];

const STATS = [
  { value: "195",   label: "Countries Tracked" },
  { value: "24/7",  label: "Live Monitoring"   },
  { value: "12K+",  label: "Events Indexed"    },
  { value: "99.9%", label: "Uptime"            },
];

const TICKER_ITEMS = [
  "CYBER THREAT LEVEL — ELEVATED",
  "ACTIVE INCIDENTS — 14",
  "NEW EVENTS — LAST 6H: 38",
  "RANSOMWARE ALERTS — 3",
  "GLOBAL PEACE INDEX — UPDATED",
  "NATO ACTIVITY — MONITORING",
  "DARK WEB MENTIONS — SPIKE DETECTED",
];

function Home() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const iv = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(prev => (prev + 1) % TITLES.length);
        setVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.noise} />

      {/* ── HERO ── */}
      <section className={styles.hero}>
        <div className={styles.heroGlow1} />
        <div className={styles.heroGlow2} />
        <div className={styles.grid} />

        <div className={styles.heroInner}>

          {/* eyebrow */}
          <div className={styles.eyebrowRow}>
            <span className={styles.livePulse} />
            <span className={styles.eyebrow}>Live Intelligence Platform</span>
          </div>

          {/* rotating title */}
          <h1 className={`${styles.title} ${visible ? styles.titleIn : styles.titleOut}`}>
            {TITLES[index].split("\n").map((line, i) => (
              <span key={i} className={styles.titleLine}>{line}</span>
            ))}
          </h1>

          {/* subtitle */}
          <p className={styles.subtitle}>
            Visualize intelligence data with powerful dashboards
            and real-time global monitoring across 195 nations.
          </p>

          {/* buttons */}
          <div className={styles.buttons}>
            <button className={styles.primaryBtn} onClick={() => navigate("/world-map")}>
              Explore Dashboard
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button className={styles.secondaryBtn} onClick={() => navigate("/CyberThreat")}>
              View Live Events
            </button>
          </div>

        </div>
      </section>

      {/* ── TICKER ── */}
      <div className={styles.tickerWrap}>
        <span className={styles.tickerLabel}>LIVE</span>
        <div className={styles.tickerTrack}>
          <div className={styles.tickerContent}>
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <span key={i} className={styles.tickerItem}>
                {item}
                <span className={styles.tickerSep}>·</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── STATS ── */}
      <section className={styles.stats}>
        {STATS.map((s, i) => (
          <div key={i} className={styles.statItem}>
            <span className={styles.statValue}>{s.value}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </section>

      {/* ── FEATURE CARDS ── */}
      <section className={styles.features}>
        <div className={styles.featuresHead}>
          <span className={styles.featureEyebrow}>
            <span className={styles.dot} />
            Platform Capabilities
          </span>
          <h2 className={styles.featuresTitle}>Everything you need to<br />understand global risk</h2>
        </div>

        <div className={styles.cardsGrid}>
          <Card
            index="01"
            title="Threat Intelligence"
            desc="Real-time tracking of cyber incidents, ransomware, phishing, and state-sponsored attacks across all regions."
            onClick={() => navigate("/CyberThreat")}
          />
          <Card
            index="02"
            title="Country Profiles"
            desc="Deep-dive intelligence on 195 countries — government, economy, infrastructure, rankings, and more."
            onClick={() => navigate("/")}
          />
          <Card
            index="03"
            title="Live Event Feed"
            desc="Continuous ingestion of geopolitical events, crisis alerts, and conflict updates in real time."
            onClick={() => navigate("/world-map")}
          />
          <Card
            index="04"
            title="Global Analytics"
            desc="Interactive maps and dashboards that turn raw intelligence into actionable visual insights."
            onClick={() => navigate("/world-map")}
          />
        </div>
      </section>

    </div>
  );
}

function Card({ index, title, desc, onClick }) {
  return (
    <div className={styles.card} onClick={onClick}>
      <span className={styles.cardIndex}>
        <span className={styles.dot} />{index}
      </span>
      <h3 className={styles.cardTitle}>{title}</h3>
      <p className={styles.cardDesc}>{desc}</p>
      <span className={styles.cardArrow}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    </div>
  );
}

export default Home;