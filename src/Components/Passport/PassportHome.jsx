import { useState, useEffect, useContext, useCallback, useRef } from "react";
import { CountryContext } from "../../Context/countryContext";
import {
  ComposableMap, Geographies, Geography, ZoomableGroup,
} from "react-simple-maps";
import countries from "world-countries";
import styles from "./PassportHome.module.css";
import { useNavigate } from "react-router-dom";
import {PASSPORT_SCORES} from "../../Data/PassportData"

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";


// Sorted leaderboard (used in multiple places)
const RANKED = Object.entries(PASSPORT_SCORES)
  .sort((a,b) => b[1]-a[1])
  .map(([name,score],i)=>({ name, score, rank:i+1 }));

const AVG_SCORE = Math.round(RANKED.reduce((s,r)=>s+r.score,0)/RANKED.length);
const MAX_SCORE = 193;

const getTier = (score) => {
  if (!score) return null;
  if (score>=190) return "S";
  if (score>=185) return "A";
  if (score>=179) return "B";
  if (score>=140) return "C";
  if (score>=70)  return "D";
  return "E";
};

const TIER_CFG = {
  S:    { fill:"rgba(201,169,110,0.72)", hover:"rgba(201,169,110,0.92)", color:"#c9a96e", label:"Elite",       range:"190+" },
  A:    { fill:"rgba(74,222,128,0.48)",  hover:"rgba(74,222,128,0.72)",  color:"#4ade80", label:"Powerful",    range:"185–189" },
  B:    { fill:"rgba(96,165,250,0.48)",  hover:"rgba(96,165,250,0.72)",  color:"#60a5fa", label:"Strong",      range:"179–184" },
  C:    { fill:"rgba(245,158,11,0.42)",  hover:"rgba(245,158,11,0.68)",  color:"#f59e0b", label:"Moderate",    range:"140–178" },
  D:    { fill:"rgba(248,113,113,0.40)", hover:"rgba(248,113,113,0.64)", color:"#f87171", label:"Restricted",  range:"70–139" },
  E:    { fill:"rgba(148,163,184,0.30)", hover:"rgba(148,163,184,0.56)", color:"#94a3b8", label:"Very Limited", range:"<70" },
  null: { fill:"#0c1320",               hover:"rgba(201,169,110,0.14)", color:"#2e3d4e", label:"No data",     range:"—" },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const getCountryData = (name) => {
  if (!name) return null;
  const n = name.toLowerCase();
  return countries.find(c =>
    c.name.common.toLowerCase()===n ||
    c.name.official?.toLowerCase()===n ||
    c.name.common.toLowerCase().includes(n) ||
    n.includes(c.name.common.toLowerCase())
  );
};

const getPercentile = (score) => {
  const below = RANKED.filter(r=>r.score<score).length;
  return Math.round((below/RANKED.length)*100);
};

// ─── TICKER DATA ──────────────────────────────────────────────────────────────
const TICKER_ITEMS = RANKED.slice(0,20);

// ─── ANIMATED COUNTER ─────────────────────────────────────────────────────────
function useCountUp(target, duration=1200) {
  const [val, setVal] = useState(0);
  useEffect(()=>{
    let start=0, startTime=null;
    const step = (ts)=>{
      if(!startTime) startTime=ts;
      const p = Math.min((ts-startTime)/duration,1);
      const ease = 1-Math.pow(1-p,3);
      setVal(Math.round(ease*target));
      if(p<1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  },[target,duration]);
  return val;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function PassportHome() {
  const { setCountry, getPassportData, getCountry} = useContext(CountryContext);
  const navigate = useNavigate();

  // ── typewriter ────────────────────────────────────────────────────────────
  const texts = [
    "How Powerful Is Your Passport?",
    "Explore Global Visa-Free Access",
    "Compare Passport Freedom Worldwide",
    "Rank Every Nation's Travel Power",
  ];
  const [displayText, setDisplayText] = useState("");
  const [textIndex,   setTextIndex]   = useState(0);
  const [isDeleting,  setIsDeleting]  = useState(false);

  useEffect(()=>{
    const cur = texts[textIndex];
    const t = setTimeout(()=>{
      setDisplayText(prev=>isDeleting?cur.substring(0,prev.length-1):cur.substring(0,prev.length+1));
      if(!isDeleting&&displayText===cur) setTimeout(()=>setIsDeleting(true),1200);
      else if(isDeleting&&displayText===""){setIsDeleting(false);setTextIndex(p=>(p+1)%texts.length);}
    }, isDeleting?40:80);
    return ()=>clearTimeout(t);
  },[displayText,isDeleting,textIndex]);

 

  // ── state ─────────────────────────────────────────────────────────────────
  const [hoveredCountry,  setHoveredCountry]  = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [tooltip,         setTooltip]         = useState({x:0,y:0,country:""});
  const [mapPosition,     setMapPosition]     = useState({coordinates:[0,20],zoom:1});
  const [selectedPanel,   setSelectedPanel]   = useState(null);
  const [passportMode,    setPassportMode]    = useState(true);
  const [compareMode,     setCompareMode]     = useState(false);
  const [compareTarget,   setCompareTarget]   = useState(null);
  const [statsVisible,    setStatsVisible]    = useState(false);
  const statsRef = useRef(null);

  const cntCountries = useCountUp(statsVisible ? RANKED.length : 0);
  const cntMax       = useCountUp(statsVisible ? MAX_SCORE : 0);
  const cntAvg       = useCountUp(statsVisible ? AVG_SCORE : 0);
  const cntMin       = useCountUp(statsVisible ? 27 : 0);

  useEffect(()=>{
    const obs = new IntersectionObserver(([e])=>{ if(e.isIntersecting) setStatsVisible(true); },{threshold:0.3});
    if(statsRef.current) obs.observe(statsRef.current);
    return ()=>obs.disconnect();
  },[]);

  // ── handlers ──────────────────────────────────────────────────────────────
  const buildPanel = useCallback((name) => {
    const score  = PASSPORT_SCORES[name] ?? null;
    const tier   = getTier(score);
    const data   = getCountryData(name);
    const rank   = score ? RANKED.findIndex(r=>r.name===name)+1 : null;
    const pct    = score ? getPercentile(score) : null;
    const nearby = score
      ? RANKED.filter(r=>Math.abs(r.score-score)<=5&&r.name!==name).slice(0,4)
      : [];
    return { name, score, tier, rank, pct, nearby, iso2:data?.cca2?.toLowerCase(), iso3:data?.cca3 };
  },[]);

  const handleCountryClick = useCallback((geo)=>{
    const name=geo.properties.name;
    if(compareMode && selectedPanel){
      setCompareTarget(buildPanel(name));
      return;
    }
    setSelectedCountry(name);
    setSelectedPanel(buildPanel(name));
    if(geo.bounds){
      const cx=(geo.bounds[0][0]+geo.bounds[1][0])/2;
      const cy=(geo.bounds[0][1]+geo.bounds[1][1])/2;
      setMapPosition({coordinates:[cx,cy],zoom:3});
    }
  },[compareMode, selectedPanel, buildPanel]);

  const handleSelectChange = (e)=>{
    const name=e.target.value;
    setSelectedCountry(name);
    if(!name){setSelectedPanel(null);setCompareTarget(null);return;}
    setSelectedPanel(buildPanel(name));
    setCompareTarget(null);
  };

  const handleNavigate = ()=>{ if(!selectedCountry) return; setCountry(selectedCountry); getCountry(selectedCountry); navigate(`/passport/${selectedCountry}`); };

  const closePanel = ()=>{ setSelectedPanel(null); setCompareTarget(null); setSelectedCountry(""); setCompareMode(false); };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.noise}/>
      <div className={styles.ambientGlow}/>

      {/* ══ LIVE TICKER ══════════════════════════════════════════════════════ */}
      <div className={styles.ticker}>
        <div className={styles.tickerLabel}>
          <span className={styles.tickerDot}/>
          PASSPORT POWER INDEX 2025
        </div>
        <div className={styles.tickerTrack}>
          <div className={styles.tickerInner}>
            {[...TICKER_ITEMS,...TICKER_ITEMS].map((item,i)=>{
              const tier=getTier(item.score);
              const cData=getCountryData(item.name);
              return (
                <span key={i} className={styles.tickerItem}>
                  {cData && <img src={`https://flagcdn.com/w20/${cData.cca2.toLowerCase()}.png`} alt="" className={styles.tickerFlag}/>}
                  <span className={styles.tickerName}>{item.name}</span>
                  <span className={styles.tickerScore} style={{color:TIER_CFG[tier].color}}>{item.score}</span>
                  <span className={styles.tickerSep}>·</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══ HERO ═════════════════════════════════════════════════════════════ */}
      <section className={styles.hero}>
        <div className={styles.heroGlow}/>
        <div className={styles.heroDotGrid}/>

        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowDot}/>
            Henley Passport Index · 2025
          </span>
          <h1 className={styles.heading}>
            {displayText}<span className={styles.cursor}/>
          </h1>
          <p className={styles.heroSub}>
            193 destinations. One score. Discover where your passport ranks
            among <strong>{RANKED.length}</strong> nations — click any country on the map.
          </p>

          {/* quick stat badges */}
          <div className={styles.heroBadges}>
            {[
              { val: `#1 Japan`, label: "Top Passport" },
              { val: `${RANKED.length}`, label: "Nations Ranked" },
              { val: `${AVG_SCORE}`, label: "Global Average" },
              { val: "2025", label: "Henley Index" },
            ].map((b,i) => (
              <div key={i} className={styles.heroBadge}>
                <span className={styles.heroBadgeVal}>{b.val}</span>
                <span className={styles.heroBadgeLabel}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.heroFade}/>
      </section>

      {/* ══ MAP SECTION ══════════════════════════════════════════════════════ */}
      <div className={styles.mapSection}>

        {/* ── GLOBAL STATS STRIP ── */}
        <div className={styles.statsStrip} ref={statsRef}>
          {[
            { val:cntCountries, label:"Countries Ranked",  sub:"Henley 2025",      col:"#c9a96e" },
            { val:cntMax,       label:"Maximum Score",     sub:"Japan · Singapore", col:"#c9a96e" },
            { val:cntAvg,       label:"Global Average",    sub:"All ranked nations",col:"#60a5fa" },
            { val:cntMin,       label:"Minimum Score",     sub:"Afghanistan",       col:"#f87171" },
          ].map((s,i)=>(
            <div key={i} className={styles.statCard}>
              <span className={styles.statVal} style={{color:s.col}}>{s.val}</span>
              <span className={styles.statLabel}>{s.label}</span>
              <span className={styles.statSub}>{s.sub}</span>
            </div>
          ))}
        </div>

        {/* ── TOP 5 LEADERBOARD ── */}
        <div className={styles.leaderboard}>
          <div className={styles.lbHeader}>
            <span className={styles.lbTitle}>
              <span className={styles.lbDot}/>
              Top Passports
            </span>
            <span className={styles.lbSub}>Henley Index 2025</span>
          </div>
          <div className={styles.lbItems}>
            {RANKED.slice(0,5).map((item,i)=>{
              const cData=getCountryData(item.name);
              const medal=["🥇","🥈","🥉","④","⑤"][i];
              return (
                <div key={item.name} className={styles.lbItem}
                  onClick={()=>{setSelectedCountry(item.name);setSelectedPanel(buildPanel(item.name));}}>
                  <span className={styles.lbMedal}>{medal}</span>
                  {cData && <img src={`https://flagcdn.com/w40/${cData.cca2.toLowerCase()}.png`} alt="" className={styles.lbFlag}/>}
                  <span className={styles.lbName}>{item.name}</span>
                  <div className={styles.lbBarWrap}>
                    <div className={styles.lbBarTrack}>
                      <div className={styles.lbBarFill} style={{width:`${(item.score/MAX_SCORE)*100}%`,background:"#c9a96e"}}/>
                    </div>
                  </div>
                  <span className={styles.lbScore}>{item.score}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CONTROLS ── */}
        <div className={styles.controls}>
          <div className={styles.selectWrap}>
            <svg className={styles.selectIcon} viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <select className={styles.select} value={selectedCountry} onChange={handleSelectChange}>
              <option value="">Select a country</option>
              {countries.map(c=>(
                <option key={c.cca3} value={c.name.common}>{c.name.common}</option>
              ))}
            </select>
          </div>

          <button className={`${styles.modeBtn} ${passportMode?styles.modeBtnOn:""}`}
            onClick={()=>setPassportMode(p=>!p)}>
            <span className={styles.modeDot} style={{background:passportMode?"#c9a96e":"#2e3d4e"}}/>
            Passport Index
          </button>

          {selectedPanel && (
            <button className={`${styles.modeBtn} ${compareMode?styles.modeBtnOn:""}`}
              onClick={()=>{setCompareMode(p=>!p);if(compareMode)setCompareTarget(null);}}>
              <span className={styles.modeDot} style={{background:compareMode?"#60a5fa":"#2e3d4e"}}/>
              {compareMode?"Click a Country…":"Compare"}
            </button>
          )}

          <button className={styles.searchBtn} onClick={handleNavigate} disabled={!selectedCountry}>
            View Intelligence
            <svg viewBox="0 0 14 14" fill="none" width="13" height="13">
              <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* ── MAP + PANEL LAYOUT ── */}
        <div className={`${styles.mapLayout} ${selectedPanel?styles.mapLayoutExpanded:""}`}>

          {/* MAP */}
          <div className={styles.mapWrapper}>
            <ComposableMap projectionConfig={{scale:160}}>
              <ZoomableGroup center={mapPosition.coordinates} zoom={mapPosition.zoom}>
                <Geographies geography={geoUrl}>
                  {({geographies})=>geographies.map(geo=>{
                    const name     = geo.properties.name;
                    const isSel    = selectedCountry===name;
                    const isHov    = hoveredCountry===name;
                    const isCmp    = compareTarget?.name===name;
                    const score    = PASSPORT_SCORES[name]??null;
                    const tier     = getTier(score);
                    const cfg      = TIER_CFG[tier];

                    let fill;
                    if(passportMode){
                      fill = isSel  ? "#ffffff"
                           : isCmp  ? "#60a5fa"
                           : isHov  ? cfg.hover
                           : cfg.fill;
                    } else {
                      fill = isSel ? "rgba(201,169,110,0.55)"
                           : isHov ? "rgba(201,169,110,0.30)"
                           : "#0d1520";
                    }

                    return (
                      <Geography key={geo.rsmKey} geography={geo}
                        onMouseMove={evt=>{setHoveredCountry(name);setTooltip({x:evt.clientX,y:evt.clientY,country:name});}}
                        onMouseLeave={()=>setHoveredCountry("")}
                        onClick={()=>handleCountryClick(geo)}
                        style={{
                          default:{fill, stroke:passportMode?"rgba(6,9,15,0.40)":"rgba(201,169,110,0.15)", strokeWidth:0.4, outline:"none", transition:"fill 0.15s ease"},
                          hover:{fill:cfg.hover, outline:"none"},
                          pressed:{fill:"#ffffff", outline:"none"},
                        }}
                      />
                    );
                  })}
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>

            {/* vignette */}
            <div className={styles.mapVignette}/>

            {/* compare mode overlay */}
            {compareMode && !compareTarget && (
              <div className={styles.compareOverlay}>
                <span className={styles.compareHint}>Click any country to compare</span>
              </div>
            )}

            {/* TOOLTIP */}
            {hoveredCountry && (()=>{
              const cData = getCountryData(tooltip.country);
              const score = PASSPORT_SCORES[tooltip.country]??null;
              const tier  = getTier(score);
              const cfg   = TIER_CFG[tier];
              if(!cData) return null;
              return (
                <div className={styles.tooltip} style={{top:tooltip.y,left:tooltip.x}}>
                  <img src={`https://flagcdn.com/w40/${cData.cca2.toLowerCase()}.png`} alt="" className={styles.tooltipFlag}/>
                  <div className={styles.tooltipBody}>
                    <span className={styles.tooltipName}>{cData.name.common}</span>
                    {passportMode && score ? (
                      <div className={styles.tooltipPassport}>
                        <span className={styles.tooltipScore} style={{color:cfg.color}}>{score}</span>
                        <span className={styles.tooltipDest}>destinations</span>
                        <span className={styles.tooltipTier}
                          style={{color:cfg.color,borderColor:`${cfg.color}40`,background:`${cfg.color}12`}}>
                          Tier {tier}
                        </span>
                      </div>
                    ) : passportMode ? (
                      <span className={styles.tooltipNoData}>No data</span>
                    ) : null}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* SIDE PANEL */}
          {selectedPanel && (
            <div className={styles.sidePanel} key={selectedPanel.name}>
              <div className={styles.sidePanelInner}>
                <button className={styles.panelClose} onClick={closePanel}>✕</button>

                {/* flag hero */}
                <div className={styles.panelHero}>
                  {selectedPanel.iso2 && (
                    <div className={styles.panelFlagWrap}>
                      <img src={`https://flagcdn.com/w80/${selectedPanel.iso2}.png`} alt={selectedPanel.name} className={styles.panelFlag}/>
                      <div className={styles.panelFlagGlow} style={{background:selectedPanel.score?TIER_CFG[selectedPanel.tier].color:"#344557"}}/>
                    </div>
                  )}
                  <div>
                    <h3 className={styles.panelName}>{selectedPanel.name}</h3>
                    {selectedPanel.rank && (
                      <span className={styles.panelRankBadge}>
                        Global Rank #{selectedPanel.rank}
                      </span>
                    )}
                  </div>
                </div>

                {selectedPanel.score ? (
                  <>
                    {/* score card */}
                    <div className={styles.scoreCard}>
                      <div className={styles.scoreLeft}>
                        <span className={styles.scoreNum}
                          style={{color:TIER_CFG[selectedPanel.tier].color}}>
                          {selectedPanel.score}
                        </span>
                        <span className={styles.scoreUnit}>visa-free</span>
                      </div>
                      <div className={styles.scoreRight}>
                        <span className={styles.tierBig}
                          style={{color:TIER_CFG[selectedPanel.tier].color,borderColor:`${TIER_CFG[selectedPanel.tier].color}40`,background:`${TIER_CFG[selectedPanel.tier].color}10`}}>
                          Tier {selectedPanel.tier}
                        </span>
                        <span className={styles.tierDesc}>{TIER_CFG[selectedPanel.tier].label}</span>
                        <span className={styles.tierRange}>{TIER_CFG[selectedPanel.tier].range}</span>
                      </div>
                    </div>

                    {/* power bar */}
                    <div className={styles.powerBar}>
                      <div className={styles.powerBarLabels}>
                        <span className={styles.powerBarTitle}>Passport Power</span>
                        <span className={styles.powerBarPct}
                          style={{color:TIER_CFG[selectedPanel.tier].color}}>
                          {Math.round((selectedPanel.score/MAX_SCORE)*100)}%
                        </span>
                      </div>
                      <div className={styles.powerBarTrack}>
                        {/* global average marker */}
                        <div className={styles.powerBarAvgMark}
                          style={{left:`${(AVG_SCORE/MAX_SCORE)*100}%`}}/>
                        <div className={styles.powerBarFill}
                          style={{
                            width:`${(selectedPanel.score/MAX_SCORE)*100}%`,
                            background:TIER_CFG[selectedPanel.tier].color,
                            boxShadow:`0 0 14px ${TIER_CFG[selectedPanel.tier].color}50`,
                          }}/>
                      </div>
                      <div className={styles.powerBarTicks}>
                        <span>0</span><span>50</span><span>100</span><span>150</span><span>193</span>
                      </div>
                      <div className={styles.powerBarAvgLabel} style={{left:`${(AVG_SCORE/MAX_SCORE)*100}%`}}>
                        avg {AVG_SCORE}
                      </div>
                    </div>

                    {/* percentile + mini stats */}
                    <div className={styles.miniStats}>
                      <div className={styles.miniStat}>
                        <span className={styles.miniStatVal} style={{color:TIER_CFG[selectedPanel.tier].color}}>
                          Top {100-selectedPanel.pct}%
                        </span>
                        <span className={styles.miniStatLabel}>Globally</span>
                      </div>
                      <div className={styles.miniStatDiv}/>
                      <div className={styles.miniStat}>
                        <span className={styles.miniStatVal}>
                          {selectedPanel.score > AVG_SCORE
                            ? `+${selectedPanel.score-AVG_SCORE}`
                            : selectedPanel.score-AVG_SCORE}
                        </span>
                        <span className={styles.miniStatLabel}>vs. avg</span>
                      </div>
                      <div className={styles.miniStatDiv}/>
                      <div className={styles.miniStat}>
                        <span className={styles.miniStatVal}>{MAX_SCORE-selectedPanel.score}</span>
                        <span className={styles.miniStatLabel}>from max</span>
                      </div>
                    </div>

                    {/* nearby countries */}
                    {selectedPanel.nearby.length>0 && (
                      <div className={styles.nearby}>
                        <span className={styles.nearbyTitle}>Similar Passport Power</span>
                        <div className={styles.nearbyList}>
                          {selectedPanel.nearby.map(r=>{
                            const cd=getCountryData(r.name);
                            const t=getTier(r.score);
                            return (
                              <div key={r.name} className={styles.nearbyItem}
                                onClick={()=>{setSelectedCountry(r.name);setSelectedPanel(buildPanel(r.name));setCompareTarget(null);}}>
                                {cd && <img src={`https://flagcdn.com/w20/${cd.cca2.toLowerCase()}.png`} alt="" className={styles.nearbyFlag}/>}
                                <span className={styles.nearbyName}>{r.name}</span>
                                <span className={styles.nearbyScore} style={{color:TIER_CFG[t].color}}>{r.score}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* compare result */}
                    {compareTarget && (
                      <div className={styles.compareCard}>
                        <div className={styles.cmpHeader}>
                          <span className={styles.cmpTitle}>Comparison</span>
                          <button className={styles.cmpClear} onClick={()=>setCompareTarget(null)}>✕</button>
                        </div>
                        <div className={styles.cmpRow}>
                          {[selectedPanel, compareTarget].map((p,idx)=>{
                            const cd=getCountryData(p.name);
                            return (
                              <div key={idx} className={styles.cmpCountry}>
                                {cd && <img src={`https://flagcdn.com/w40/${cd.cca2.toLowerCase()}.png`} alt="" className={styles.cmpFlag}/>}
                                <span className={styles.cmpName}>{p.name}</span>
                                <span className={styles.cmpScore}
                                  style={{color:p.score?TIER_CFG[getTier(p.score)].color:"#344557"}}>
                                  {p.score ?? "N/A"}
                                </span>
                                {p.score && compareTarget.score && idx===0 && (
                                  <span className={styles.cmpDiff}
                                    style={{color:selectedPanel.score>=compareTarget.score?"#4ade80":"#f87171"}}>
                                    {selectedPanel.score>=compareTarget.score?"+":""}{selectedPanel.score-(compareTarget.score??0)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {/* dual bar */}
                        <div className={styles.cmpBars}>
                          {[selectedPanel,compareTarget].map((p,idx)=>{
                            const t=getTier(p.score);
                            return (
                              <div key={idx} className={styles.cmpBarRow}>
                                <div className={styles.cmpBarTrack}>
                                  <div className={styles.cmpBarFill}
                                    style={{width:`${((p.score??0)/MAX_SCORE)*100}%`,background:TIER_CFG[t??'null'].color}}/>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className={styles.noData}>
                    <span className={styles.noDataIcon}>⊘</span>
                    <span>No passport data available</span>
                  </div>
                )}

                <button className={styles.panelCta} onClick={handleNavigate}>
                  Full Intelligence Report
                  <svg viewBox="0 0 14 14" fill="none" width="12" height="12">
                    <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── LEGEND ── */}
        {passportMode && (
          <div className={styles.legend}>
            <div className={styles.legendLeft}>
              <span className={styles.legendTitle}>
                <span className={styles.legendDot}/>
                Passport Power Index
              </span>
              <div className={styles.legendItems}>
                {Object.entries(TIER_CFG).filter(([k])=>k!=="null").map(([tier,cfg])=>{
                  const count=RANKED.filter(r=>getTier(r.score)===tier).length;
                  return (
                    <div key={tier} className={styles.legendItem}>
                      <span className={styles.legendSwatch}
                        style={{background:cfg.fill,border:`1px solid ${cfg.color}`,boxShadow:`0 0 7px ${cfg.color}30`}}/>
                      <span className={styles.legendTierLetter} style={{color:cfg.color}}>{tier}</span>
                      <span className={styles.legendDesc}>{cfg.label}</span>
                      <span className={styles.legendRange}>{cfg.range}</span>
                      <span className={styles.legendCount} style={{color:cfg.color,borderColor:`${cfg.color}30`,background:`${cfg.color}10`}}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className={styles.legendRight}>
              <div className={styles.scaleLabel}>Passport Strength Scale</div>
              <div className={styles.scaleBar}/>
              <div className={styles.scaleMarks}>
                <span>0</span><span>Low</span><span>Mid</span><span>High</span><span>193</span>
              </div>
              <div className={styles.scaleAvg} style={{left:`${(AVG_SCORE/MAX_SCORE)*100}%`}}>
                <div className={styles.scaleAvgLine}/>
                <span className={styles.scaleAvgLabel}>avg {AVG_SCORE}</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}