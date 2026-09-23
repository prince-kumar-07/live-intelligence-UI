import styles from "./ThreatMap.module.css";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";
import AttackArc from "./AtackArcs";
import { locations } from "../../Data/data";
import { useLiveThreatFeed } from "./useLiveThreatFeed";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export default function ThreatMap() {
  const { attacks, stats, isLive, attacksToday } = useLiveThreatFeed();

  const activeNodes = new Set(attacks.flatMap(a => [a.from.name, a.to.name])).size;

  const lastUpdatedLabel = stats?.lastUpdated
    ? new Date(stats.lastUpdated).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <div className={styles.page}>
      <div className={styles.noise} />
      <div className={styles.glow} />
      <div className={styles.grid} />

      {/* ── HERO HEADER ── */}
      <header className={styles.header}>
        <span className={styles.eyebrow}>
          <span className={styles.liveDot} />
          Live Intelligence Feed
        </span>

        <h1 className={styles.title}>Live Cyber<br />Threat Map</h1>

        <div className={styles.counterRow}>
          <span className={styles.counterValue}>
            {attacksToday.toLocaleString()}
          </span>
          <span className={styles.counterLabel}>attacks recorded today (estimated)</span>
        </div>

        {/* gradient fade into map */}
        <div className={styles.headerFade} />
      </header>

      {/* ── HUD BAR ── */}
      <div className={styles.hud}>
        <div className={styles.hudLeft}>
          <span className={styles.hudDot} />
          <span className={styles.hudLabel}>Global Threat Monitor</span>
          <span className={isLive ? styles.statusLive : styles.statusDemo}>
            {isLive ? "Live" : "Demo Mode"}
          </span>
        </div>
        <div className={styles.hudRight}>
          <div className={styles.hudStat}>
            <span className={styles.hudStatLabel}>Live Attacks</span>
            <span className={styles.hudStatValue}>{attacks.length}</span>
          </div>
          <div className={styles.hudDivider} />
          <div className={styles.hudStat}>
            <span className={styles.hudStatLabel}>Nodes Active</span>
            <span className={styles.hudStatValue}>{activeNodes}</span>
          </div>
          <div className={styles.hudDivider} />
          <div className={styles.hudStat}>
            <span className={styles.hudStatLabel}>C2 Online</span>
            <span className={styles.hudStatValue}>{stats?.c2Online ?? "—"}</span>
          </div>
        </div>
      </div>

      {/* ── MAP ── */}
      <div className={styles.mapWrapper}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 160, center: [0, 20] }}
          className={styles.map}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map(geo => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#0a1018"
                  stroke="rgba(201,169,110,0.10)"
                  strokeWidth={0.5}
                />
              ))
            }
          </Geographies>

          {attacks.map(attack => (
            <AttackArc key={attack.id} attack={attack} />
          ))}

          {locations.map((loc, i) => {
            const active   = attacks.some(a => a.from.name === loc.name || a.to.name === loc.name);
            if (!active) return null;
            const isTarget = attacks.some(a => a.to.name === loc.name);

            return (
              <Marker key={i} coordinates={loc.coords}>
                <circle r={14} fill={isTarget ? "rgba(201,169,110,0.07)" : "rgba(201,169,110,0.04)"} />
                <circle r={7}  fill={isTarget ? "rgba(201,169,110,0.20)" : "rgba(201,169,110,0.10)"} />
                <circle r={2.5} fill={isTarget ? "#c9a96e" : "#eef2f7"} />
                <text
                  textAnchor="middle"
                  y={-18}
                  style={{
                    fill: "rgba(201,169,110,0.75)",
                    fontSize: "9px",
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  {loc.name}
                </text>
              </Marker>
            );
          })}
        </ComposableMap>
      </div>

      {/* ── LEGEND ── */}
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: "#c9a96e" }} />
          Target Node
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} style={{ background: "#eef2f7" }} />
          Source Node
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendLine} />
          Attack Vector
        </span>
      </div>

      {/* ── THREAT INTELLIGENCE ── */}
      <section className={styles.intel}>
        <div className={styles.intelHead}>
          <span className={styles.intelEyebrow}>
            <span className={isLive ? styles.liveDot : styles.demoDot} />
            {isLive ? "Live Threat Intelligence" : "Demo Mode — Live Feed Unavailable"}
          </span>
          <h2 className={styles.intelTitle}>Real-Time Indicators</h2>
        </div>

        <div className={styles.intelGrid}>

          <div className={styles.intelCard}>
            <p className={styles.intelCardLabel}>C2 Infrastructure</p>
            <div className={styles.c2Row}>
              <div className={styles.c2Item}>
                <span className={styles.c2Num}>{stats?.c2Online ?? "—"}</span>
                <span className={styles.c2Sub}>online now</span>
              </div>
              <div className={styles.c2Item}>
                <span className={styles.c2Num}>{stats?.c2Tracked ?? "—"}</span>
                <span className={styles.c2Sub}>tracked total</span>
              </div>
            </div>
            <p className={styles.intelCardNote}>Feodo Tracker (abuse.ch) — live botnet C2 registry</p>
          </div>

          <div className={styles.intelCard}>
            <p className={styles.intelCardLabel}>Top Malware Families</p>
            <div className={styles.malwareList}>
              {(stats?.topMalware ?? []).slice(0, 5).map(m => (
                <div key={m.family} className={styles.malwareItem}>
                  <span className={styles.malwareDot} style={{ background: m.color }} />
                  <span className={styles.malwareName}>{m.family}</span>
                  <span className={styles.malwareType}>{m.type}</span>
                  <span className={styles.malwareCount}>{m.count}</span>
                </div>
              ))}
              {!stats?.topMalware?.length && <p className={styles.intelNoData}>No data yet</p>}
            </div>
          </div>

          <div className={styles.intelCard}>
            <p className={styles.intelCardLabel}>Top C2-Hosting Countries</p>
            <div className={styles.countryList}>
              {(stats?.topC2Countries ?? []).slice(0, 5).map(c => (
                <div key={c.code} className={styles.countryItem}>
                  <span className={styles.countryName}>{c.name}</span>
                  <span className={styles.countryCount}>{c.count}</span>
                </div>
              ))}
              {!stats?.topC2Countries?.length && <p className={styles.intelNoData}>No data yet</p>}
            </div>
          </div>

        </div>

        <p className={styles.intelFoot}>
          Source: Feodo Tracker (abuse.ch), updated {lastUpdatedLabel} · Attack origins modeled from
          industry threat reports (Verizon DBIR, IBM X-Force, CrowdStrike) — not per-event telemetry
        </p>
      </section>

    </div>
  );
}
