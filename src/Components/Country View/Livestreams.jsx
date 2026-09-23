import { useState, useEffect, useContext } from "react";
import styles from "./LiveStreams.module.css";
import { CountryContext } from "../../Context/countryContext";

// ── icons ─────────────────────────────────────────────────────────────────────
const IconGrid   = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/></svg>;
const IconSingle = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3"/></svg>;
const IconLink   = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V7M8 1h3m0 0v3m0-3L5 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;

// ── bracket corners (surveillance aesthetic) ──────────────────────────────────
function Brackets() {
  return (
    <>
      <span className={`${styles.bracket} ${styles.bracketTL}`} />
      <span className={`${styles.bracket} ${styles.bracketTR}`} />
      <span className={`${styles.bracket} ${styles.bracketBL}`} />
      <span className={`${styles.bracket} ${styles.bracketBR}`} />
    </>
  );
}

// ── signal strength bar ───────────────────────────────────────────────────────
function Signal({ bars = 4 }) {
  return (
    <span className={styles.signal}>
      {[1,2,3,4].map(b => (
        <span key={b} className={`${styles.bar} ${b <= bars ? styles.barOn : ""}`} />
      ))}
    </span>
  );
}

export default function LiveStreams({ countryName }) {
  const { liveFeed } = useContext(CountryContext);
  const streams = Array.isArray(liveFeed) ? liveFeed : (liveFeed?.streams ?? []);

  const [selected,  setSelected]  = useState(null);
  const [viewMode,  setViewMode]  = useState("single");   // "single" | "quad"
  const [time,      setTime]      = useState(new Date());

  useEffect(() => { setSelected(streams[0] ?? null); }, [liveFeed]);

  // live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const pad  = (n) => String(n).padStart(2, "0");
  const clock = `${pad(time.getUTCHours())}:${pad(time.getUTCMinutes())}:${pad(time.getUTCSeconds())} UTC`;

  // quad view uses first 4 streams
  const quadStreams = streams.slice(0, 4);

  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>

        {/* ── HEAD ──────────────────────────────────────────────────────────── */}
        <div className={styles.head}>
          <div className={styles.headLeft}>
            <span className={styles.eyebrow}>
              <span className={styles.liveDot} />
              Surveillance Network
            </span>
            <h2 className={styles.title}>Live Feeds — {countryName}</h2>
          </div>

          <div className={styles.headRight}>
            {/* HUD stats */}
            <div className={styles.hudStats}>
              <div className={styles.hudStat}>
                <span className={styles.hudLabel}>Feeds</span>
                <span className={styles.hudVal}>{streams.length}</span>
              </div>
              <div className={styles.hudDivider} />
              <div className={styles.hudStat}>
                <span className={styles.hudLabel}>Status</span>
                <span className={`${styles.hudVal} ${styles.hudGreen}`}>ONLINE</span>
              </div>
              <div className={styles.hudDivider} />
              <div className={styles.hudStat}>
                <span className={styles.hudLabel}>UTC</span>
                <span className={styles.hudVal}>{clock}</span>
              </div>
            </div>

            {/* view toggle */}
            <div className={styles.viewToggle}>
              <button
                className={`${styles.toggleBtn} ${viewMode === "single" ? styles.toggleActive : ""}`}
                onClick={() => setViewMode("single")}
                title="Single view"
              ><IconSingle /></button>
              <button
                className={`${styles.toggleBtn} ${viewMode === "quad" ? styles.toggleActive : ""}`}
                onClick={() => setViewMode("quad")}
                title="Quad view"
                disabled={streams.length < 2}
              ><IconGrid /></button>
            </div>
          </div>
        </div>

        {/* ── EMPTY ─────────────────────────────────────────────────────────── */}
        {streams.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect x="3" y="9" width="30" height="24" rx="3" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M33 18l12-7v26l-12-7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M14 21l6 3-6 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className={styles.emptyTitle}>No Live Feeds Available</span>
            <span className={styles.emptySub}>No active streams found for {countryName}</span>
          </div>
        )}

        {/* ── SINGLE VIEW ───────────────────────────────────────────────────── */}
        {streams.length > 0 && viewMode === "single" && (
          <div className={styles.singleLayout}>

            {/* main player */}
            <div className={styles.mainPlayer}>
              {selected && (
                <>
                  {/* scan line overlay */}
                  <div className={styles.scanLines} />

                  {/* corner brackets */}
                  <Brackets />

                  {/* top HUD bar */}
                  <div className={styles.playerHudTop}>
                    <span className={styles.recDot} />
                    <span className={styles.recLabel}>REC</span>
                    <span className={styles.hudSep}>·</span>
                    <span className={styles.playerChannel}>{selected.channel}</span>
                    <span className={styles.playerSpacer} />
                    <Signal bars={4} />
                    <span className={styles.playerClock}>{clock}</span>
                  </div>

                  {/* iframe */}
                  <div className={styles.playerScreen}>
                    <iframe
                      key={selected.videoId}
                      src={selected.embedUrl}
                      className={styles.iframe}
                      title={selected.title}
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>

                  {/* bottom HUD bar */}
                  <div className={styles.playerHudBot}>
                    <span className={styles.camId}>CAM-{String(streams.indexOf(selected) + 1).padStart(3,"0")}</span>
                    <span className={styles.playerTitle}>{selected.title}</span>
                    <span className={styles.playerSpacer} />
                    <a href={selected.watchUrl} target="_blank" rel="noreferrer" className={styles.ytLink}>
                      <IconLink /> YouTube
                    </a>
                  </div>
                </>
              )}
            </div>

            {/* filmstrip sidebar */}
            <div className={styles.filmstrip}>
              <div className={styles.filmstripHeader}>
                <span className={styles.filmstripLabel}>Active Channels</span>
                <span className={styles.filmstripCount}>{streams.length} online</span>
              </div>

              <div className={styles.filmstripList}>
                {streams.map((stream, i) => (
                  <button
                    key={stream.videoId}
                    className={`${styles.card} ${selected?.videoId === stream.videoId ? styles.cardActive : ""}`}
                    onClick={() => setSelected(stream)}
                    style={{ animationDelay: `${i * 0.04}s` }}
                  >
                    {/* thumbnail */}
                    <div className={styles.cardThumb}>
                      {stream.thumbnail
                        ? <img src={stream.thumbnail} alt="" className={styles.cardThumbImg} />
                        : <div className={styles.cardThumbFallback}><span className={styles.thumbDot} /></div>
                      }
                      <div className={styles.cardThumbOverlay}>
                        <span className={styles.cardLivePill}>● LIVE</span>
                      </div>
                      {selected?.videoId === stream.videoId && (
                        <div className={styles.cardPlaying}>
                          <span /><span /><span />
                        </div>
                      )}
                    </div>

                    {/* info */}
                    <div className={styles.cardInfo}>
                      <span className={styles.cardCamId}>CAM-{String(i+1).padStart(3,"0")}</span>
                      <span className={styles.cardTitle}>{stream.title}</span>
                      <div className={styles.cardBottom}>
                        <span className={styles.cardChannel}>{stream.channel}</span>
                        <Signal bars={3 + (i % 2)} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ── QUAD VIEW ─────────────────────────────────────────────────────── */}
        {streams.length > 0 && viewMode === "quad" && (
          <div className={styles.quadWrap}>
            <div className={styles.quadGrid}>
              {quadStreams.map((stream, i) => (
                <div
                  key={stream.videoId}
                  className={`${styles.quadCell} ${selected?.videoId === stream.videoId ? styles.quadCellActive : ""}`}
                  onClick={() => setSelected(stream)}
                >
                  <div className={styles.scanLines} />
                  <Brackets />

                  <div className={styles.quadHudTop}>
                    <span className={styles.recDot} />
                    <span className={styles.recLabel}>REC</span>
                    <span className={styles.playerSpacer} />
                    <span className={styles.camId}>CAM-{String(i+1).padStart(3,"0")}</span>
                  </div>

                  <iframe
                    key={stream.videoId}
                    src={stream.embedUrl}
                    className={styles.iframe}
                    title={stream.title}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    loading="lazy"
                  />

                  <div className={styles.quadHudBot}>
                    <span className={styles.quadTitle}>{stream.title}</span>
                    <Signal bars={3 + (i % 2)} />
                  </div>
                </div>
              ))}

              {/* fill empty cells if < 4 streams */}
              {Array.from({ length: Math.max(0, 4 - quadStreams.length) }).map((_, i) => (
                <div key={`empty-${i}`} className={`${styles.quadCell} ${styles.quadCellOff}`}>
                  <Brackets />
                  <span className={styles.offLabel}>NO SIGNAL</span>
                </div>
              ))}
            </div>

            {/* quad bottom bar */}
            <div className={styles.quadBar}>
              <span className={styles.quadBarLabel}>
                <span className={styles.liveDot} /> QUAD SURVEILLANCE MODE
              </span>
              <span className={styles.quadBarClock}>{clock}</span>
              <button className={styles.quadSingleBtn} onClick={() => setViewMode("single")}>
                Switch to Single View
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}