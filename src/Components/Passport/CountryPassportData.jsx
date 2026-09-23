import { useState, useEffect, useMemo, useContext, useRef } from "react";
import { useParams } from "react-router-dom";
import ReactCountryFlag from "react-country-flag";
import { geoMercator, geoPath } from "d3-geo";
import styles from "./CountryPassportData.module.css";
import { CountryContext }  from "../../Context/countryContext";
// import { PassportContext } from "../../Context/passportContext";
import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";
// import { useParams } from "react-router-dom";

countries.registerLocale(en);

function getCountryName(code){
  return countries.getName(code, "en") || code;
}

/* ─────────────────────────────────────────────
   GEO MAP (hero — unchanged)
───────────────────────────────────────────── */
const MAP_W = 420, MAP_H = 320, PAD = 16;
// fitExtent alone letterboxes shapes whose bbox aspect doesn't match the
// frame's (India's is nearly square vs. the 420:320 landscape frame),
// leaving big empty margins on one axis. Only correct *mild* mismatches
// like that — a country as elongated as Chile or Russia is correctly
// letterboxed (that's its real shape), and forcing it to "cover" the
// frame would crop off real landmass, not empty margin.
const MAP_ZOOM_THRESHOLD = 1.6;

const formatNumber = (n) => {
  if (n == null || n === "") return "—";
  if (typeof n !== "number") return n;
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(n);
};

const GEO_URLS = [
  "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson",
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson",
];
const GEO_CACHE = new Map();

/* India: the two general-purpose sources above draw the international/
   Line-of-Control boundary, omitting Aksai Chin and part of J&K. We use
   the Survey-of-India-aligned boundary from DataMeet instead (see
   IndiaMapAttribution below for the required CC-BY-SA/ODbL credit). */
const INDIA_GEO_URL = "/geo/india-soi.geojson";
export const INDIA_GEO_SOURCE_LABEL = "Survey of India (via DataMeet)";
export const INDIA_GEO_SOURCE_URL = "https://github.com/datameet/maps";

function isIndia(iso3, name) {
  return iso3 === "IND" || name?.toLowerCase() === "india";
}

async function getFeatures(url) {
  if (!GEO_CACHE.has(url)) {
    const p = fetch(url).then(r => r.json()).then(j => j.features || []).catch(() => []);
    GEO_CACHE.set(url, p);
  }
  return GEO_CACHE.get(url);
}
function findFeature(features, iso3, name) {
  const lname = name?.toLowerCase();
  return features.find(f => {
    const p = f.properties;
    return (
      p.ISO_A3 === iso3 ||
      p.iso_a3 === iso3 ||
      p["ISO3166-1-Alpha-3"] === iso3 ||
      p.ADMIN?.toLowerCase() === lname ||
      p.name?.toLowerCase() === lname
    );
  });
}
async function resolveFeature(iso3, name) {
  if (isIndia(iso3, name)) {
    const feats = await getFeatures(INDIA_GEO_URL);
    if (feats.length) return feats[0];
    // fall through to the general sources only if the bundled file fails to load
  }
  for (const url of GEO_URLS) {
    const feats = await getFeatures(url);
    const f = findFeature(feats, iso3, name);
    if (f) return f;
  }
  return null;
}

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const TIER_CFG = {
  S: { color: "#c9a96e", label: "Elite",         range: "190+"     },
  A: { color: "#4ade80", label: "Powerful",      range: "185–189"  },
  B: { color: "#60a5fa", label: "Strong",        range: "179–184"  },
  C: { color: "#f59e0b", label: "Moderate",      range: "140–178"  },
  D: { color: "#f87171", label: "Restricted",    range: "70–139"   },
  E: { color: "#94a3b8", label: "Very Limited",  range: "< 70"     },
};

const ACCESS_CFG = [
  { key: "visaFree",       label: "Visa Free",        color: "#c9a96e" },
  { key: "visaOnArrival",  label: "Visa on Arrival",  color: "#4ade80" },
  { key: "eVisa",          label: "eVisa",            color: "#60a5fa" },
  { key: "visaRequired",   label: "Visa Required",    color: "#f87171" },
];

const REGION_ORDER = [
  { key: "europe",     label: "Europe",      color: "#60a5fa" },
  { key: "asia",       label: "Asia",        color: "#c9a96e" },
  { key: "americas",   label: "Americas",    color: "#4ade80" },
  { key: "africa",     label: "Africa",      color: "#f59e0b" },
  { key: "oceania",    label: "Oceania",     color: "#a78bfa" },
  { key: "middleEast", label: "Middle East", color: "#f87171" },
];

/* ─────────────────────────────────────────────
   HOOKS
───────────────────────────────────────────── */
function useCountUp(target, active, dur = 1000) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!active || !target) return;
    let s = null;
    const tick = ts => {
      if (!s) s = ts;
      const p = Math.min((ts - s) / dur, 1);
      setV(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, active]);
  return v;
}

function useInView(ref, ready) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    // `ready` re-fires this effect once the target node actually mounts —
    // sections here render only after async passport data arrives, so on
    // first mount `ref.current` is still null and a one-shot `[ref]` effect
    // would observe nothing forever.
    if (seen || !ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setSeen(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, ready, seen]);
  return seen;
}

/* ─────────────────────────────────────────────
   SPARKLINE (SVG rank history)
───────────────────────────────────────────── */
function Sparkline({ history }) {
  if (!history?.length) return null;
  const W = 220, H = 52, PAD_X = 4, PAD_Y = 6;

  const ranks = history.map(h => h.rank);
  const minR  = Math.min(...ranks);
  const maxR  = Math.max(...ranks);
  const range = maxR - minR || 1;

  // lower rank = better = higher on chart (invert)
  const x = (i) => PAD_X + (i / Math.max(history.length - 1, 1)) * (W - PAD_X * 2);
  const y = (r)  => PAD_Y + ((r - minR) / range) * (H - PAD_Y * 2);

  const pts = history.map((h, i) => `${x(i)},${y(h.rank)}`).join(" ");
  const last = history[history.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.sparkSvg}>
      <polyline
        points={pts}
        fill="none"
        stroke="var(--gold)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.7"
      />
      {history.map((h, i) => (
        <circle
          key={i}
          cx={x(i)} cy={y(h.rank)}
          r="2.5"
          fill="var(--bg)"
          stroke="var(--gold)"
          strokeWidth="1.2"
          opacity="0.8"
        />
      ))}
      <circle
        cx={x(history.length - 1)} cy={y(last.rank)}
        r="4"
        fill="var(--gold)"
        opacity="0.9"
      />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   STRENGTH ARC (SVG gauge)
───────────────────────────────────────────── */
function StrengthArc({ score = 0, color = "#c9a96e" }) {
  const R = 38, CX = 48, CY = 52;
  const startAngle = 210, sweepAngle = 120;
  const pct   = Math.min(score / 100, 1);
  const total = (sweepAngle / 360) * 2 * Math.PI * R;
  const filled = pct * total;

  const toRad = deg => (deg * Math.PI) / 180;
  const polar = (angle) => ({
    x: CX + R * Math.cos(toRad(angle)),
    y: CY + R * Math.sin(toRad(angle)),
  });

  const s = polar(startAngle);
  const e = polar(startAngle + sweepAngle);
  const arcPath = `M ${s.x} ${s.y} A ${R} ${R} 0 0 1 ${e.x} ${e.y}`;

  // filled arc
  const fe = polar(startAngle + sweepAngle * pct);
  const filledPath = `M ${s.x} ${s.y} A ${R} ${R} 0 ${sweepAngle * pct > 180 ? 1 : 0} 1 ${fe.x} ${fe.y}`;

  return (
    <svg viewBox="0 0 96 82" className={styles.arcSvg}>
      <path d={arcPath}  fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" strokeLinecap="round" />
      <path d={filledPath} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" opacity="0.9" />
      <text x={CX} y={CY - 2} textAnchor="middle" className={styles.arcScore} style={{ fill: color }}>
        {score}
      </text>
      <text x={CX} y={CY + 24} textAnchor="middle" className={styles.arcLabel}>
        /100
      </text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════ */
export default function CountryPassportData() {
  const { country }              = useParams();
  const { country: countryData, passport, getPassportData } = useContext(CountryContext);
 
  // const { passport }             = useContext(PassportContext);   // shaped API response

  /* geo map state */
  const [feature, setFeature] = useState(null);
  const [geoStatus, setGeoStatus] = useState("loading");

  /* UI state */
  const [activeTab, setActiveTab] = useState("visaFree");

  /* section refs for IntersectionObserver */
  const rankRef   = useRef(null);
  const statsRef  = useRef(null);
  const regionRef = useRef(null);
  const histRef   = useRef(null);

  const ready = !!passport;
  const rankVisible   = useInView(rankRef, ready);
  const statsVisible  = useInView(statsRef, ready);
  const regionVisible = useInView(regionRef, ready);

  /* derived */
  const identity     = passport?.identity     || {};
  const ranking      = passport?.ranking      || {};
  const access       = passport?.access       || {};
  const intelligence = passport?.intelligence || {};
  const docInfo       = passport?.document     || {};
  const restrictions = passport?.restrictions || {};
  const meta         = passport?.meta         || {};

  const summary  = access.summary  || {};
  const byRegion = access.byRegion || {};

  const tier    = ranking.tier;
  const tierCfg = tier ? TIER_CFG[tier] : null;

  const total = summary.totalDestinations || 0;

  /* geo */
  const geoName = identity.countryName || country || "Japan";
  const iso3    = identity.iso3        || (country || "Japan").slice(0, 3).toUpperCase();
  const iso2    = identity.countryCode || countryData?.countryCode || (country || "JP").slice(0, 2).toUpperCase();

  useEffect(() => {
    let cancelled = false;
    setGeoStatus("loading"); setFeature(null);
    resolveFeature(iso3, geoName)
      .then(f => { if (!cancelled) { setFeature(f); setGeoStatus(f ? "ready" : "notfound"); } })
      .catch(() => setGeoStatus("error"));
    return () => { cancelled = true; };
  }, [iso3, geoName]);

  useEffect(() => {
   getPassportData(country)
  
  },[country])

  const pathD = useMemo(() => {
    if (!feature) return null;
    const proj = geoMercator().fitExtent([[PAD, PAD], [MAP_W - PAD, MAP_H - PAD]], feature);
    const path = geoPath(proj);

    const [[x0, y0], [x1, y1]] = path.bounds(feature);
    const availW = MAP_W - PAD * 2, availH = MAP_H - PAD * 2;
    const margin = Math.max(availW / (x1 - x0 || 1), availH / (y1 - y0 || 1));
    const zoom = isIndia(iso3, geoName) ? 1 : (margin <= MAP_ZOOM_THRESHOLD ? margin : 1);

    if (zoom > 1) {
      const cx = MAP_W / 2, cy = MAP_H / 2;
      const [tx, ty] = proj.translate();
      const s = proj.scale();
      proj.scale(s * zoom).translate([cx - (cx - tx) * zoom, cy - (cy - ty) * zoom]);
    }
    return path(feature);
  }, [feature]);

  /* count-ups */
  const cVF  = useCountUp(summary.visaFreeCount,       statsVisible);
  const cVOA = useCountUp(summary.visaOnArrivalCount,  statsVisible);
  const cEV  = useCountUp(summary.eVisaCount,          statsVisible);
  const cVR  = useCountUp(summary.visaRequiredCount,   statsVisible);
  const cMap = { visaFree: cVF, visaOnArrival: cVOA, eVisa: cEV, visaRequired: cVR };

  /* active access list */
  const activeCfg = ACCESS_CFG.find(a => a.key === activeTab);
  const activeCodes = (() => {
    if (activeTab === "visaFree") {
      return (access.visaFree || []).map(e => typeof e === "object" ? e : { code: e, maxStay: null, note: "" });
    }
    return (access[activeTab] || []).map(c => ({ code: c, maxStay: null, note: "" }));
  })();

  /* region max for bar scaling */
  const regionMax = Math.max(...REGION_ORDER.map(r => byRegion[r.key] || 0), 1);

  /* trend icon */
  const trendIcon  = ranking.rankTrend === "rising" ? "↑" : ranking.rankTrend === "falling" ? "↓" : "→";
  const trendColor = ranking.rankTrend === "rising" ? "#4ade80" : ranking.rankTrend === "falling" ? "#f87171" : "#7a8fa6";

  /* last updated */
  // const updatedStr = meta.lastUpdated
  // ? (() => {
  //     const d = new Date(meta.lastUpdated);

  //     const ist = new Intl.DateTimeFormat("en-GB", {
  //       dateStyle: "medium",
  //       timeStyle: "short",
  //       timeZone: "Asia/Kolkata"
  //     }).format(d);

  //     const utc = new Intl.DateTimeFormat("en-GB", {
  //       dateStyle: "medium",
  //       timeStyle: "short",
  //       timeZone: "UTC"
  //     }).format(d);

  //     return `${ist} IST • ${utc} UTC`;
  //   })()
  // : "";

  const lastUpdatedUTC = meta.lastUpdated
  ? new Date(meta.lastUpdated).toUTCString()
  : "Data not available";

const lastUpdatedIST = meta.lastUpdated
  ? new Date(meta.lastUpdated).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata"
    })
  : "Data not available";

  /* ══════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════ */
  return (
    <div className={styles.page}>
      <div className={styles.noise} />

      {/* ════════════ HERO — UNTOUCHED ════════════ */}
      <div className={styles.heroWrap}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>

          <div className={styles.heroLeft}>
            <span className={styles.eyebrow}>Country Overview</span>
            <div className={styles.flagRow}>
              <ReactCountryFlag countryCode={iso2} svg className={styles.flag} />
            </div>
            <h1 className={styles.heroTitle}>{geoName}</h1>
            {countryData && (
              <div className={styles.metaList}>
                {countryData.capital    && <div className={styles.metaItem}><span className={styles.metaLabel}>Capital</span><span className={styles.metaValue}>{countryData.capital}</span></div>}
                {countryData.region     && <div className={styles.metaItem}><span className={styles.metaLabel}>Region</span><span className={styles.metaValue}>{countryData.region}</span></div>}
                {countryData.population && <div className={styles.metaItem}><span className={styles.metaLabel}>Population</span><span className={styles.metaValue}>{formatNumber(countryData.population)}</span></div>}
                {countryData.currency   && <div className={styles.metaItem}><span className={styles.metaLabel}>Currency</span><span className={styles.metaValue}>{countryData.currency}</span></div>}
              </div>
            )}
          </div>

          <div className={styles.heroRight}>
            <div className={styles.mapCol}>
              <div className={styles.mapFrame}>
                {geoStatus === "loading" && <div className={styles.mapStatus}><div className={styles.mapSpinner} /><span className={styles.mapStatusText}>Loading map</span></div>}
                {geoStatus === "notfound" && <div className={styles.mapStatus}><span className={styles.mapStatusText}>Map unavailable</span></div>}
                {geoStatus === "error"   && <div className={styles.mapStatus}><span className={styles.mapStatusText}>Failed to load</span></div>}
                {geoStatus === "ready" && pathD && (
                  <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className={styles.mapSvg}>
                    <path d={pathD} className={styles.mapPath} />
                  </svg>
                )}
              </div>
              {geoStatus === "ready" && isIndia(iso3, geoName) && (
                <a
                  className={styles.mapCredit}
                  href={INDIA_GEO_SOURCE_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  Boundary: {INDIA_GEO_SOURCE_LABEL}
                </a>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ════════════ PASSPORT SECTION ════════════ */}
      {passport && (
        <div className={styles.pp}>

          {/* ── RULE ── */}
          <div className={styles.rule}>
            <div className={styles.ruleLine} />
            <span className={styles.ruleLabel}><span className={styles.ruleDot} />Passport Intelligence</span>
            <div className={styles.ruleLine} />
          </div>

          {/* ════ 1 · RANK & STRENGTH ════ */}
          <div className={styles.rankBlock} ref={rankRef}>

            <div className={styles.rankLeft}>
              <p className={styles.chapterEye}>Global Rank</p>
              <div className={styles.rankNum} style={{ color: tierCfg?.color }}>
                #{ranking.passportRank ?? "—"}
              </div>
              <div className={styles.rankMeta}>
                {tierCfg && (
                  <span className={styles.tierPill} style={{ color: tierCfg.color, borderColor: `${tierCfg.color}30`, background: `${tierCfg.color}0c` }}>
                    Tier {tier} · {tierCfg.label}
                  </span>
                )}
                <span className={styles.trendBadge} style={{ color: trendColor }}>
                  {trendIcon}
                  {ranking.rankChange != null && ranking.rankChange !== 0 && (
                    <span> {Math.abs(ranking.rankChange)} {ranking.rankTrend}</span>
                  )}
                </span>
              </div>
              {tierCfg && (
                <p className={styles.tierRange}>{tierCfg.range} visa-free destinations</p>
              )}
            </div>

            <div className={styles.rankCenter}>
              <p className={styles.chapterEye}>Strength Score</p>
              <StrengthArc score={ranking.strengthScore ?? 0} color={tierCfg?.color ?? "#c9a96e"} />
              <p className={styles.strengthCaption}>composite index</p>
            </div>

            <div className={styles.rankRight}>
              <p className={styles.chapterEye}>Rank History</p>
              {intelligence.rankHistory?.length > 1 ? (
                <>
                  <Sparkline history={intelligence.rankHistory} />
                  <div className={styles.sparkLegend}>
                    {intelligence.rankHistory.slice(-3).map((h, i) => (
                      <span key={i} className={styles.sparkPoint}>
                        <span className={styles.sparkYear}>{h.year} {h.quarter}</span>
                        <span className={styles.sparkRank}>#{h.rank}</span>
                      </span>
                    ))}
                  </div>
                </>
              ) : intelligence.rankHistory?.length === 1 ? (
                <div className={styles.sparkSingle}>
                  <span className={styles.sparkSingleRank}>#{intelligence.rankHistory[0].rank}</span>
                  <span className={styles.sparkSingleMeta}>
                    {intelligence.rankHistory[0].year} {intelligence.rankHistory[0].quarter} — tracking started
                  </span>
                </div>
              ) : (
                <p className={styles.noData}>No history yet</p>
              )}
            </div>

          </div>

          {/* ════ 2 · ACCESS STATS ════ */}
          <div className={styles.statsBlock} ref={statsRef}>
            {ACCESS_CFG.map(a => {
              const count = summary[`${a.key}Count`] ?? 0;
              const pct   = total ? Math.round((count / total) * 100) : 0;
              const isOn  = activeTab === a.key;
              return (
                <div
                  key={a.key}
                  className={`${styles.statCol} ${isOn ? styles.statColOn : ""}`}
                  onClick={() => setActiveTab(a.key)}
                  style={isOn ? { "--accent": a.color } : {}}
                >
                  <span className={styles.statCount} style={{ color: isOn ? a.color : undefined }}>
                    {cMap[a.key]}
                  </span>
                  <span className={styles.statLabel}>{a.label}</span>
                  <span className={styles.statPct} style={{ color: a.color }}>{pct}%</span>
                  <div className={styles.statBar}>
                    <div className={styles.statBarFill}
                      style={{ width: statsVisible ? `${pct}%` : "0%", background: a.color }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ════ 3 · REGIONAL BREAKDOWN ════ */}
          <div className={styles.regionBlock} ref={regionRef}>
            <p className={styles.chapterEye}>Access by Region</p>
            <div className={styles.regionGrid}>
              {REGION_ORDER.map((r, i) => {
                const count = byRegion[r.key] ?? 0;
                const pct   = (count / regionMax) * 100;
                return (
                  <div key={r.key} className={styles.regionRow} style={{ animationDelay: `${i * 0.05}s` }}>
                    <span className={styles.regionLabel}>{r.label}</span>
                    <div className={styles.regionBar}>
                      <div
                        className={styles.regionFill}
                        style={{ width: regionVisible ? `${pct}%` : "0%", background: r.color }}
                      />
                    </div>
                    <span className={styles.regionCount} style={{ color: r.color }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ════ 4 · DESTINATION LIST ════ */}
          <div className={styles.accessBlock}>

            <div className={styles.tabStrip}>
              {ACCESS_CFG.map(a => (
                <button
                  key={a.key}
                  className={`${styles.tab} ${activeTab === a.key ? styles.tabOn : ""}`}
                  style={activeTab === a.key ? { color: a.color, borderColor: `${a.color}35`, background: `${a.color}0c` } : {}}
                  onClick={() => setActiveTab(a.key)}
                >
                  {a.label}
                  <span className={styles.tabCount}
                    style={activeTab === a.key ? { color: a.color, borderColor: `${a.color}30`, background: `${a.color}15` } : {}}>
                    {summary[`${a.key}Count`] ?? 0}
                  </span>
                </button>
              ))}
            </div>

            <div className={styles.chipPanel}>
              {activeCodes.length > 0 ? (
                <div className={styles.chips}>
                  {activeCodes.map((entry, i) => (
                    <span
                      key={`${activeTab}-${entry.code}-${i}`}
                      className={styles.chip}
                      style={{ "--c": activeCfg?.color, animationDelay: `${Math.min(i * 0.009, 0.55)}s` }}
                      title={entry.maxStay ? `${entry.note || `Up to ${entry.maxStay} days`}` : undefined}
                    >
                      <img
                        src={`https://flagcdn.com/w20/${(entry.code || "").toLowerCase()}.png`}
                        alt={entry.code}
                        className={styles.chipFlag}
                        onError={e => { e.target.style.display = "none"; }}
                      />
                      <span className={styles.chipName}>
  {getCountryName(entry.code)}
</span>
                      {entry.maxStay && (
                        <span className={styles.chipStay}>{entry.maxStay}d</span>
                      )}
                    </span>
                  ))}
                </div>
              ) : (
                <div className={styles.emptySlot}>No data available</div>
              )}
            </div>

          </div>

          {/* ════ 5 · INTELLIGENCE STRIP ════ */}
          {(intelligence.visaFreeGrowth !== 0 || intelligence.visaFreeChange?.length > 0 || intelligence.visaLost?.length > 0) && (
            <div className={styles.intelBlock}>
              <p className={styles.chapterEye}>Travel Intelligence</p>
              <div className={styles.intelGrid}>

                {intelligence.visaFreeGrowth !== undefined && (
                  <div className={styles.intelCard}>
                    <span className={styles.intelNum}
                      style={{ color: intelligence.visaFreeGrowth >= 0 ? "#4ade80" : "#f87171" }}>
                      {intelligence.visaFreeGrowth >= 0 ? "+" : ""}{intelligence.visaFreeGrowth}
                    </span>
                    <span className={styles.intelLabel}>destinations this year</span>
                  </div>
                )}

                {intelligence.visaFreeChange?.length > 0 && (
                  <div className={styles.intelCard}>
                    <span className={styles.intelNum} style={{ color: "#4ade80" }}>
                      {intelligence.visaFreeChange.length}
                    </span>
                    <span className={styles.intelLabel}>newly gained</span>
                    <div className={styles.intelChips}>
                      {intelligence.visaFreeChange.slice(0, 8).map(c => (
                        <span key={c} className={styles.intelChip} style={{ "--ic": "#4ade80" }}>
                          <img src={`https://flagcdn.com/w20/${c.toLowerCase()}.png`} alt={c} className={styles.chipFlag} />
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {intelligence.visaLost?.length > 0 && (
                  <div className={styles.intelCard}>
                    <span className={styles.intelNum} style={{ color: "#f87171" }}>
                      {intelligence.visaLost.length}
                    </span>
                    <span className={styles.intelLabel}>recently lost</span>
                    <div className={styles.intelChips}>
                      {intelligence.visaLost.slice(0, 8).map(c => (
                        <span key={c} className={styles.intelChip} style={{ "--ic": "#f87171" }}>
                          <img src={`https://flagcdn.com/w20/${c.toLowerCase()}.png`} alt={c} className={styles.chipFlag} />
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* ════ 6 · DOCUMENT & RESTRICTIONS ════ */}
          <div className={styles.docRestRow}>

            {/* Document */}
            <div className={styles.docBlock}>
              <p className={styles.chapterEye}>Passport Document</p>
              <div className={styles.docList}>
                <div className={styles.docRow}>
                  <span className={styles.docKey}>Validity</span>
                  <span className={styles.docVal}>{docInfo.passportValidity ?? "—"} years</span>
                </div>
                <div className={styles.docRow}>
                  <span className={styles.docKey}>Cost</span>
                  <span className={styles.docVal}>
                    {docInfo.passportCostUSD != null ? `$${docInfo.passportCostUSD} USD` : "—"}
                  </span>
                </div>
                <div className={styles.docRow}>
                  <span className={styles.docKey}>Processing</span>
                  <span className={styles.docVal}>
                    {docInfo.processingDays != null ? `~${docInfo.processingDays} days` : "—"}
                  </span>
                </div>
                <div className={styles.docRow}>
                  <span className={styles.docKey}>Biometric Chip</span>
                  <span className={styles.docBool}
                    style={{ color: docInfo.biometricChip ? "#4ade80" : "#f87171" }}>
                    {docInfo.biometricChip ? "Yes" : "No"}
                  </span>
                </div>
                <div className={styles.docRow}>
                  <span className={styles.docKey}>Machine Readable</span>
                  <span className={styles.docBool}
                    style={{ color: docInfo.machineReadable ? "#4ade80" : "#f87171" }}>
                    {docInfo.machineReadable ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </div>

            {/* Restrictions */}
            <div className={styles.restBlock}>
              <p className={styles.chapterEye}>Restrictions</p>
              <div className={styles.docList}>

                <div className={styles.docRow}>
                  <span className={styles.docKey}>Dual Citizenship</span>
                  <span className={styles.docBool}
                    style={{ color: restrictions.dualCitizenshipAllowed ? "#4ade80" : "#f87171" }}>
                    {restrictions.dualCitizenshipAllowed == null
                      ? "—"
                      : restrictions.dualCitizenshipAllowed ? "Allowed" : "Restricted"}
                  </span>
                </div>

                {restrictions.sanctionedBy?.length > 0 && (
                  <div className={styles.restPillRow}>
                    <span className={styles.docKey}>Sanctioned By</span>
                    <div className={styles.pillGroup}>
                      {restrictions.sanctionedBy.map(c => (
                        <span key={c} className={styles.restPill} style={{ "--rc": "#f87171" }}>
                          <img src={`https://flagcdn.com/w20/${c.toLowerCase()}.png`} alt={c} className={styles.chipFlag} />
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {restrictions.bannedFrom?.length > 0 && (
                  <div className={styles.restPillRow}>
                    <span className={styles.docKey}>Banned From</span>
                    <div className={styles.pillGroup}>
                      {restrictions.bannedFrom.map(c => (
                        <span key={c} className={styles.restPill} style={{ "--rc": "#f87171" }}>
                          <img src={`https://flagcdn.com/w20/${c.toLowerCase()}.png`} alt={c} className={styles.chipFlag} />
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {!restrictions.sanctionedBy?.length && !restrictions.bannedFrom?.length && (
                  <div className={styles.docRow}>
                    <span className={styles.docKey}>Political Bans</span>
                    <span className={styles.docBool} style={{ color: "#4ade80" }}>None on record</span>
                  </div>
                )}

              </div>
            </div>

          </div>

          <div className={styles.updateInfo}>

  <div className={styles.updateRow}>
    <span className={styles.updateLabel}>
      LAST UPDATED (UTC)
    </span>

    <span className={styles.updateValue}>
      {lastUpdatedUTC}
    </span>
  </div>

  <div className={styles.updateRow}>
    <span className={styles.updateLabel}>
      LAST UPDATED (IST)
    </span>

    <span className={styles.updateValue}>
      {lastUpdatedIST}
    </span>
  </div>

</div>

          {/* ── FOOTER ── */}
          <div className={styles.ppFoot}>
            <span>Henley &amp; Partners Passport Index</span>
            {/* <span className={styles.footDot} />
            <span>Updated {updatedStr}</span> */}
            {meta.dataSource && (
              <>
                <span className={styles.footDot} />
                <span style={{ textTransform: "none" }}>source: {meta.dataSource.replace(/_/g, " ")}</span>
              </>
            )}
          </div>

        </div>
      )}

      {/* no data state */}
      {!passport && (
        <div className={styles.skeleton}>
          {[200, 120, 160, 120].map((h, i) => (
            <div key={i} className={styles.skeletonBar} style={{ height: h }} />
          ))}
        </div>
      )}

    </div>
  );
}