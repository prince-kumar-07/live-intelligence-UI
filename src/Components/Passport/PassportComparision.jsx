import { useState, useRef, useEffect, useCallback } from "react";
import styles from "./PassportComparision.module.css";
import {
  COUNTRIES,
  TIER_CFG,
  STAT_CFG,
  REGION_CFG,
} from "../../Data/PassportData";

const API = "http://localhost:4000/api/v1/passport/compare";

const Flag = ({ iso2, className }) => (
  <img
    src={`https://flagcdn.com/w40/${iso2.toLowerCase()}.png`}
    alt={iso2}
    className={className}
    onError={(e) => {
      e.target.style.opacity = 0;
    }}
  />
);
const FlagSm = ({ iso2, className }) => (
  <img
    src={`https://flagcdn.com/w20/${iso2.toLowerCase()}.png`}
    alt={iso2}
    className={className}
    onError={(e) => {
      e.target.style.opacity = 0;
    }}
  />
);

function Dropdown({ options, value, onChange, placeholder, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const filtered = query.trim()
    ? options.filter(
        (o) =>
          o.name.toLowerCase().includes(query.toLowerCase()) ||
          o.iso2.toLowerCase().includes(query.toLowerCase()),
      )
    : options;

  /* close on outside click */
  useEffect(() => {
    const fn = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const select = (opt) => {
    onChange(opt);
    setOpen(false);
    setQuery("");
  };
  const clear = (e) => {
    e.stopPropagation();
    onChange(null);
    setQuery("");
  };
  const toggle = () => {
    if (disabled) return;
    setOpen((v) => {
      if (!v) setTimeout(() => inputRef.current?.focus(), 60);
      return !v;
    });
  };

  const tc = value ? TIER_CFG[value.tier] : null;

  return (
    <div
      ref={wrapRef}
      className={[
        styles.drop,
        open && styles.dropOpen,
        disabled && styles.dropDisabled,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* TRIGGER */}
      <div className={styles.dropTrigger} onClick={toggle}>
        {value ? (
          <div className={styles.dropSelected}>
            {/* FLAG */}
            <Flag iso2={value.iso2} className={styles.dropFlag} />

            {/* NAME + SUB */}
            <div className={styles.dropSelectedText}>
              <span className={styles.dropSelectedName}>{value.name}</span>
              <span className={styles.dropSelectedSub}>
                {value.iso2} · Rank #{value.rank}
              </span>
            </div>

            {/* TIER BADGE */}
            {tc && (
              <span
                className={styles.dropTierBadge}
                style={{
                  color: tc.color,
                  borderColor: `${tc.color}30`,
                  background: `${tc.color}0c`,
                }}
              >
                {value.tier}
              </span>
            )}

            {/* CLEAR */}
            <button className={styles.dropClear} onClick={clear} title="Clear">
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path
                  d="M1 1l6 6M7 1L1 7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        ) : (
          <span className={styles.dropPlaceholder}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 13 13"
              fill="none"
              className={styles.dropPlaceholderIcon}
            >
              <circle
                cx="6.5"
                cy="6.5"
                r="5"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <path
                d="M6.5 4.5v4M4.5 6.5h4"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            {placeholder}
          </span>
        )}

        {/* CHEVRON */}
        <svg
          className={[styles.dropChevron, open && styles.dropChevronUp]
            .filter(Boolean)
            .join(" ")}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d="M2 4l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* MENU */}
      {open && (
        <div className={styles.dropMenu}>
          {/* search */}
          <div className={styles.dropSearch}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 13 13"
              fill="none"
              className={styles.dropSearchIcon}
            >
              <circle
                cx="5.5"
                cy="5.5"
                r="4"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <path
                d="M9 9l2.5 2.5"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or code…"
              className={styles.dropSearchInput}
            />
            {query && (
              <button
                className={styles.dropSearchClear}
                onClick={() => setQuery("")}
              >
                ✕
              </button>
            )}
          </div>

          {/* list */}
          <div className={styles.dropList}>
            {filtered.length === 0 ? (
              <div className={styles.dropEmpty}>No results for "{query}"</div>
            ) : (
              filtered.map((opt) => {
                const otc = TIER_CFG[opt.tier];
                const isOn = value?.iso2 === opt.iso2;
                return (
                  <div
                    key={opt.iso2}
                    className={[styles.dropItem, isOn && styles.dropItemOn]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => select(opt)}
                  >
                    <Flag iso2={opt.iso2} className={styles.dropItemFlag} />
                    <div className={styles.dropItemText}>
                      <span className={styles.dropItemName}>{opt.name}</span>
                      <span className={styles.dropItemSub}>
                        {opt.iso2} · Rank #{opt.rank}
                      </span>
                    </div>
                    {otc && (
                      <span
                        className={styles.dropItemTier}
                        style={{ color: otc.color }}
                      >
                        {opt.tier}
                      </span>
                    )}
                    {isOn && <span className={styles.dropItemCheck}>✓</span>}
                  </div>
                );
              })
            )}
          </div>

          <div className={styles.dropFooter}>
            {filtered.length} countr{filtered.length === 1 ? "y" : "ies"}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   PASSPORT CARD
───────────────────────────────────────────── */
function PassportCard({ data, side }) {
  const tc = data.tier ? TIER_CFG[data.tier] : null;
  return (
    <div
      className={`${styles.card} ${styles[`card_${side}`]}`}
      style={{ "--accent": tc?.color ?? "#c9a96e" }}
    >
      <div className={styles.cardTop}>
        <Flag iso2={data.countryCode} className={styles.cardFlag} />
        <div className={styles.cardIdentity}>
          <span className={styles.cardCode}>{data.countryCode}</span>
          <h3 className={styles.cardName}>{data.countryName}</h3>
        </div>
        {tc && (
          <span
            className={styles.cardTierBadge}
            style={{
              color: tc.color,
              borderColor: `${tc.color}30`,
              background: `${tc.color}0c`,
            }}
          >
            {data.tier} · {tc.label}
          </span>
        )}
      </div>
      <div className={styles.cardRank} style={{ color: tc?.color }}>
        #{data.passportRank ?? "—"}
      </div>
      <div className={styles.cardRankLabel}>global rank</div>
      <div className={styles.cardScoreRow}>
        <div className={styles.cardScoreItem}>
          <span className={styles.cardScoreNum}>{data.visaFreeCount ?? 0}</span>
          <span className={styles.cardScoreLabel}>Visa Free</span>
        </div>
        <div className={styles.cardScoreDivider} />
        <div className={styles.cardScoreItem}>
          <span className={styles.cardScoreNum}>
            {data.strengthScore ?? "—"}
          </span>
          <span className={styles.cardScoreLabel}>Strength</span>
        </div>
        <div className={styles.cardScoreDivider} />
        <div className={styles.cardScoreItem}>
          <span
            className={styles.cardScoreNum}
            style={{
              color:
                data.rankTrend === "rising"
                  ? "#4ade80"
                  : data.rankTrend === "falling"
                    ? "#f87171"
                    : "#7a8fa6",
            }}
          >
            {data.rankTrend === "rising"
              ? "↑"
              : data.rankTrend === "falling"
                ? "↓"
                : "→"}
          </span>
          <span className={styles.cardScoreLabel}>Trend</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MIRRORED STAT ROW
───────────────────────────────────────────── */
function StatRow({ label, color, valA, valB, maxVal }) {
  const pA = maxVal ? (valA / maxVal) * 100 : 0;
  const pB = maxVal ? (valB / maxVal) * 100 : 0;
  const winA = valA > valB,
    winB = valB > valA;
  return (
    <div className={styles.statRow}>
      <div className={styles.statSide}>
        <span
          className={`${styles.statVal} ${winA ? styles.statWin : ""}`}
          style={winA ? { color } : {}}
        >
          {valA}
        </span>
        <div className={styles.statBarA}>
          <div
            className={styles.statFillA}
            style={{ width: `${pA}%`, background: color }}
          />
        </div>
      </div>
      <span className={styles.statLabel}>{label}</span>
      <div className={styles.statSide}>
        <div className={styles.statBarB}>
          <div
            className={styles.statFillB}
            style={{ width: `${pB}%`, background: color }}
          />
        </div>
        <span
          className={`${styles.statVal} ${winB ? styles.statWin : ""}`}
          style={winB ? { color } : {}}
        >
          {valB}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   REGION ROW
───────────────────────────────────────────── */
function RegionRow({ label, color, valA, valB }) {
  const max = Math.max(valA, valB, 1);
  const winA = valA > valB,
    winB = valB > valA;
  return (
    <div className={styles.regRow}>
      <span
        className={`${styles.regVal} ${winA ? styles.regWin : ""}`}
        style={winA ? { color } : {}}
      >
        {valA}
      </span>
      <div className={styles.regBars}>
        <div className={styles.regBarA}>
          <div
            className={styles.regFillA}
            style={{ width: `${(valA / max) * 100}%`, background: color }}
          />
        </div>
        <span className={styles.regLabel}>{label}</span>
        <div className={styles.regBarB}>
          <div
            className={styles.regFillB}
            style={{ width: `${(valB / max) * 100}%`, background: color }}
          />
        </div>
      </div>
      <span
        className={`${styles.regVal} ${winB ? styles.regWin : ""}`}
        style={winB ? { color } : {}}
      >
        {valB}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CHIP GROUP
───────────────────────────────────────────── */
function ChipGroup({ codes, color, label, count }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? codes : codes.slice(0, 40);
  return (
    <div className={styles.chipGroup}>
      <div className={styles.chipGroupHead}>
        <span
          className={styles.chipGroupLabel}
          style={{ borderLeftColor: color }}
        >
          {label}
        </span>
        <span className={styles.chipGroupCount} style={{ color }}>
          {count}
        </span>
      </div>
      <div className={styles.chipGrid}>
        {visible.map((iso2, i) => (
          <span
            key={iso2}
            className={styles.chip}
            style={{
              "--c": color,
              animationDelay: `${Math.min(i * 0.008, 0.5)}s`,
            }}
          >
            <FlagSm iso2={iso2} className={styles.chipFlag} />
            <span className={styles.chipCode}>{iso2}</span>
          </span>
        ))}
      </div>
      {codes.length > 40 && (
        <button
          className={styles.chipMore}
          style={{ color }}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less ↑" : `+ ${codes.length - 40} more`}
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════ */
export default function PassportComparision() {
  const [selA, setSelA] = useState(null);
  const [selB, setSelB] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const resultRef = useRef(null);

  /* mutual exclusion */
  const optionsA = COUNTRIES.filter((c) => c.iso2 !== selB?.iso2);
  const optionsB = COUNTRIES.filter((c) => c.iso2 !== selA?.iso2);

  /* API call using ISO2 codes */
  const compare = useCallback(async () => {
    if (!selA || !selB) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${API}/${selA.iso2}/${selB.iso2}`);
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.message || `HTTP ${res.status}`);
      setResult(json.data);
      setTimeout(
        () =>
          resultRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        140,
      );
    } catch (e) {
      setError(e.message || "Failed to reach API. Is the server running?");
    } finally {
      setLoading(false);
    }
  }, [selA, selB]);

  const reset = () => {
    setSelA(null);
    setSelB(null);
    setResult(null);
    setError("");
  };

  /* derived */
  const { a, b, diff } = result || {};
  const tcA = a?.tier ? TIER_CFG[a.tier] : null;
  const tcB = b?.tier ? TIER_CFG[b.tier] : null;
  const maxMap = {
    visaFreeCount: Math.max(a?.visaFreeCount ?? 0, b?.visaFreeCount ?? 0, 1),
    visaOnArrivalCount: Math.max(
      a?.visaOnArrivalCount ?? 0,
      b?.visaOnArrivalCount ?? 0,
      1,
    ),
    eVisaCount: Math.max(a?.eVisaCount ?? 0, b?.eVisaCount ?? 0, 1),
    visaRequiredCount: Math.max(
      a?.visaRequiredCount ?? 0,
      b?.visaRequiredCount ?? 0,
      1,
    ),
  };
  const winner = diff
    ? diff.rankDiff < 0
      ? "a"
      : diff.rankDiff > 0
        ? "b"
        : "tie"
    : null;

  /* ── RENDER ── */
  return (
    <div className={styles.page}>
      <div className={styles.noise} />

      {/* HERO */}
      <div className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            Henley Passport Index · 2025
          </span>
          <h1 className={styles.heroTitle}>
            Passport
            <br />
            <em>Comparison</em>
          </h1>
          <p className={styles.heroSub}>
            Select two passports to compare visa-free access, strength scores
            and destination overlap.
          </p>
        </div>
      </div>

      {/* SELECTOR */}
      <div className={styles.selectorWrap}>
        <div className={styles.selectorCard}>
          <div className={styles.selectorRow}>
            <div className={styles.dropWrap}>
              <span
                className={styles.dropEye}
                style={{
                  color: selA
                    ? (TIER_CFG[selA.tier]?.color ?? "var(--gold)")
                    : "var(--gold)",
                }}
              >
                Passport A
              </span>
              <Dropdown
                options={optionsA}
                value={selA}
                onChange={setSelA}
                placeholder="Select first country"
              />
            </div>

            <div className={styles.vsBlock}>
              <span className={styles.vsText}>VS</span>
              <div className={styles.vsLine} />
            </div>

            <div className={styles.dropWrap}>
              <span
                className={styles.dropEye}
                style={{
                  color: selB
                    ? (TIER_CFG[selB.tier]?.color ?? "var(--muted)")
                    : "var(--muted)",
                }}
              >
                Passport B
              </span>
              <Dropdown
                options={optionsB}
                value={selB}
                onChange={setSelB}
                placeholder={
                  selA ? "Select second country" : "Select Passport A first"
                }
                disabled={!selA}
              />
            </div>
          </div>

          {/* actions */}
          <div className={styles.actionRow}>
            <button
              className={styles.compareBtn}
              onClick={compare}
              disabled={!selA || !selB || loading}
            >
              {loading ? (
                <>
                  <span className={styles.btnSpinner} />
                  Comparing…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M1 7h12M9 3l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Compare Passports
                </>
              )}
            </button>
            {(selA || selB || result) && (
              <button className={styles.resetBtn} onClick={reset}>
                Clear all
              </button>
            )}
          </div>

          {/* selection preview */}
          {(selA || selB) && (
            <div className={styles.selPreview}>
              {selA && (
                <div
                  className={styles.selPreviewItem}
                  style={{ "--pc": TIER_CFG[selA.tier]?.color ?? "#c9a96e" }}
                >
                  <Flag iso2={selA.iso2} className={styles.selPreviewFlag} />
                  <span className={styles.selPreviewName}>{selA.name}</span>
                  <span className={styles.selPreviewRank}>#{selA.rank}</span>
                </div>
              )}
              {selA && selB && <span className={styles.selPreviewVs}>vs</span>}
              {selB && (
                <div
                  className={styles.selPreviewItem}
                  style={{ "--pc": TIER_CFG[selB.tier]?.color ?? "#60a5fa" }}
                >
                  <Flag iso2={selB.iso2} className={styles.selPreviewFlag} />
                  <span className={styles.selPreviewName}>{selB.name}</span>
                  <span className={styles.selPreviewRank}>#{selB.rank}</span>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className={styles.errorBox}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle
                  cx="7"
                  cy="7"
                  r="6"
                  stroke="#f87171"
                  strokeWidth="1.2"
                />
                <path
                  d="M7 4v3.5M7 9.5v.5"
                  stroke="#f87171"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* RESULTS */}
      {result && (
        <div className={styles.results} ref={resultRef}>
          {/* Winner */}
          {winner !== "tie" ? (
            <div
              className={styles.winnerBanner}
              style={{ "--wc": winner === "a" ? tcA?.color : tcB?.color }}
            >
              <span className={styles.winnerLabel}>Stronger Passport</span>
              <div className={styles.winnerNameRow}>
                <Flag
                  iso2={winner === "a" ? a.countryCode : b.countryCode}
                  className={styles.winnerFlag}
                />
                <span className={styles.winnerName}>
                  {winner === "a" ? a.countryName : b.countryName}
                </span>
              </div>
              <span className={styles.winnerDiff}>
                {Math.abs(diff.visaFreeDiff)} more visa-free destinations
              </span>
            </div>
          ) : (
            <div className={styles.winnerBanner} style={{ "--wc": "#7a8fa6" }}>
              <span className={styles.winnerLabel}>Result</span>
              <span className={styles.winnerName}>
                Both passports are equally ranked
              </span>
            </div>
          )}

          {/* Cards */}
          <div className={styles.headRow}>
            <PassportCard data={a} side="a" />
            <div className={styles.headDivider}>
              <div className={styles.headLine} />
              <span className={styles.headVs}>VS</span>
              <div className={styles.headLine} />
            </div>
            <PassportCard data={b} side="b" />
          </div>

          {/* Rule */}
          <div className={styles.rule}>
            <div className={styles.ruleLine} />
            <span className={styles.ruleText}>
              <span className={styles.ruleDot} />
              Access Comparison
            </span>
            <div className={styles.ruleLine} />
          </div>

          {/* Stat Bars */}
          <div className={styles.statsSection}>
            <div className={styles.statsHeadRow}>
              <span
                className={styles.statsCountryA}
                style={{ color: tcA?.color }}
              >
                <FlagSm iso2={a.countryCode} className={styles.statsFlag} />
                {a.countryName}
              </span>
              <span className={styles.statsCenter}>Destinations</span>
              <span
                className={styles.statsCountryB}
                style={{ color: tcB?.color }}
              >
                {b.countryName}
                <FlagSm iso2={b.countryCode} className={styles.statsFlag} />
              </span>
            </div>
            <div className={styles.statsList}>
              {STAT_CFG.map((s) => (
                <StatRow
                  key={s.key}
                  label={s.label}
                  color={s.color}
                  valA={a[s.key] ?? 0}
                  valB={b[s.key] ?? 0}
                  maxVal={maxMap[s.key]}
                />
              ))}
            </div>
          </div>

          {/* Rule */}
          <div className={styles.rule}>
            <div className={styles.ruleLine} />
            <span className={styles.ruleText}>
              <span className={styles.ruleDot} />
              Regional Breakdown
            </span>
            <div className={styles.ruleLine} />
          </div>

          {/* Region */}
          <div className={styles.regionSection}>
            <div className={styles.regionHeadRow}>
              <span
                className={styles.statsCountryA}
                style={{ color: tcA?.color }}
              >
                <FlagSm iso2={a.countryCode} className={styles.statsFlag} />
                {a.countryName}
              </span>
              <span className={styles.statsCenter}>Region</span>
              <span
                className={styles.statsCountryB}
                style={{ color: tcB?.color }}
              >
                {b.countryName}
                <FlagSm iso2={b.countryCode} className={styles.statsFlag} />
              </span>
            </div>
            {REGION_CFG.map((r) => (
              <RegionRow
                key={r.key}
                label={r.label}
                color={r.color}
                valA={a.accessByRegion?.[r.key] ?? 0}
                valB={b.accessByRegion?.[r.key] ?? 0}
              />
            ))}
          </div>

          {/* Rule */}
          <div className={styles.rule}>
            <div className={styles.ruleLine} />
            <span className={styles.ruleText}>
              <span className={styles.ruleDot} />
              Destination Overlap
            </span>
            <div className={styles.ruleLine} />
          </div>

          {/* Overlap */}
          <div className={styles.overlapStats}>
            <div className={styles.overlapStat}>
              <span className={styles.overlapNum} style={{ color: tcA?.color }}>
                {diff.onlyInA.length}
              </span>
              <span className={styles.overlapLabel}>Only {a.countryName}</span>
            </div>
            <div className={styles.overlapStat}>
              <span className={styles.overlapNum} style={{ color: "#4ade80" }}>
                {diff.sharedCount}
              </span>
              <span className={styles.overlapLabel}>Both access</span>
            </div>
            <div className={styles.overlapStat}>
              <span className={styles.overlapNum} style={{ color: tcB?.color }}>
                {diff.onlyInB.length}
              </span>
              <span className={styles.overlapLabel}>Only {b.countryName}</span>
            </div>
          </div>

          {/* Chips */}
          <div className={styles.chipSections}>
            {diff.onlyInA.length > 0 && (
              <ChipGroup
                codes={diff.onlyInA}
                color={tcA?.color ?? "#c9a96e"}
                label={`Exclusive to ${a.countryName}`}
                count={diff.onlyInA.length}
              />
            )}
            {diff.sharedCount > 0 && (
              <ChipGroup
                codes={diff.shared}
                color="#4ade80"
                label="Both can enter visa-free"
                count={diff.sharedCount}
              />
            )}
            {diff.onlyInB.length > 0 && (
              <ChipGroup
                codes={diff.onlyInB}
                color={tcB?.color ?? "#60a5fa"}
                label={`Exclusive to ${b.countryName}`}
                count={diff.onlyInB.length}
              />
            )}
          </div>

          <p className={styles.foot}>
            Henley &amp; Partners · {a.countryName} vs {b.countryName} ·{" "}
            {diff.sharedCount} shared ·{" "}
            {diff.onlyInA.length + diff.onlyInB.length} unique
          </p>
        </div>
      )}
    </div>
  );
}
