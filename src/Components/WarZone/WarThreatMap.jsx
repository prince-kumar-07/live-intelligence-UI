import { useEffect, useState, useMemo } from "react";
import {
  ComposableMap, Geographies, Geography, Marker, useMapContext,
} from "react-simple-maps";
import styles from "./WarThreatMap.module.css";
import {
  countries, warEvents, predictedConflicts, intelAlerts,
  SEVERITY_COLOR, ALERT_COLOR, TREND_ICON,
} from "../../Data/warData";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

/* ─── TYPE CONFIG ─────────────────────────────────────────────────────────── */
const TYPE_CFG = {
  "missile strike": { color:"#e84545", speed:1.8, impact:"explosion", arc:"draw" },
  "drone attack":   { color:"#c9a96e", speed:2.4, impact:"pulse",     arc:"dash" },
  "naval drill":    { color:"#60a5fa", speed:3.0, impact:"pulse",     arc:"dash" },
  "airstrike":      { color:"#f59e0b", speed:1.5, impact:"explosion", arc:"draw" },
  "artillery":      { color:"#a78bfa", speed:2.0, impact:"crater",    arc:"draw" },
  default:          { color:"#c9a96e", speed:2.0, impact:"pulse",     arc:"draw" },
};
const cfg = t => TYPE_CFG[t?.toLowerCase()] ?? TYPE_CFG.default;

/* ─── BEZIER CTRL ─────────────────────────────────────────────────────────── */
function cp(f, t) {
  const mx=(f[0]+t[0])/2, my=(f[1]+t[1])/2;
  const dx=t[0]-f[0],     dy=t[1]-f[1];
  const d=Math.sqrt(dx*dx+dy*dy), lift=Math.min(d*0.42,110);
  return [mx+(-dy/d)*lift, my+(dx/d)*lift];
}

/* ─── IMPACT COMPONENTS ───────────────────────────────────────────────────── */
const Pulse = ({x,y,c}) => (
  <g transform={`translate(${x},${y})`}>
    <circle r={6}  fill="none" stroke={c} strokeWidth={1.5} className={styles.r1}/>
    <circle r={12} fill="none" stroke={c} strokeWidth={1}   className={styles.r2}/>
    <circle r={3}  fill={c}                                  className={styles.rd}/>
  </g>
);

const Explode = ({x,y,c}) => (
  <g transform={`translate(${x},${y})`}>
    <circle r={8} fill="none" stroke={c} strokeWidth={1.5} className={styles.sA}/>
    <circle r={8} fill="none" stroke={c} strokeWidth={1}   className={styles.sB}/>
    <circle r={6} fill={c}                                  className={styles.eC}/>
    {[0,45,90,135,180,225,270,315].map((deg,i)=>{
      const a=deg*Math.PI/180;
      return <line key={i} x1={0} y1={0} x2={Math.cos(a)*16} y2={Math.sin(a)*16}
        stroke={c} strokeWidth={1.2} className={styles.db}
        style={{animationDelay:`${i*0.05}s`}}/>;
    })}
  </g>
);

const Fire = ({x,y}) => (
  <g transform={`translate(${x},${y})`}>
    <circle r={10} fill="none" stroke="#ef4444" strokeWidth={1.5} className={styles.sA}/>
    {[...Array(6)].map((_,i)=>(
      <ellipse key={i} cx={(i-2.5)*4} cy={0} rx={3} ry={8}
        className={styles.fl} style={{animationDelay:`${i*0.1}s`}}/>
    ))}
    <circle r={5} className={styles.fO}/>
    <circle r={3} className={styles.fH}/>
  </g>
);

const Crater = ({x,y,c}) => (
  <g transform={`translate(${x},${y})`}>
    <ellipse rx={12} ry={5} fill="none" stroke={c} strokeWidth={1.2} className={styles.cO}/>
    <ellipse rx={7}  ry={3} fill="none" stroke={c} strokeWidth={1}   className={styles.cI}/>
    <circle  r={2}          fill={c}                                  className={styles.cC}/>
  </g>
);

const IMPACTS = { explosion:Explode, fire:Fire, crater:Crater, pulse:Pulse };

/* ─── ATTACK ARC ──────────────────────────────────────────────────────────── */
function AttackArc({ attack }) {
  const { projection } = useMapContext();
  const d = useMemo(()=>{
    const f=projection(attack.from.coords), t=projection(attack.to.coords);
    if(!f||!t) return null;
    const c2=cp(f,t);
    const path=`M${f[0]},${f[1]} Q${c2[0]},${c2[1]} ${t[0]},${t[1]}`;
    const dx=t[0]-f[0], dy=t[1]-f[1];
    return { f, t, path, dl:Math.round(Math.sqrt(dx*dx+dy*dy)*1.3) };
  },[attack,projection]);
  if(!d) return null;

  const {f,t,path,dl} = d;
  const id  = `warc-${attack.id}`;
  const c   = cfg(attack.type);
  const Imp = IMPACTS[c.impact]??Pulse;
  const dur = `${c.speed}s`;
  const isJet = attack.type?.toLowerCase()==="airstrike";

  return (
    <g>
      <defs><path id={id} d={path}/></defs>
      <path d={path} fill="none" stroke={c.color} strokeWidth={5} strokeOpacity={0.07} strokeLinecap="round"/>
      {c.arc==="dash"
        ? <path d={path} fill="none" stroke={c.color} strokeWidth={1.4} strokeOpacity={0.75}
            strokeDasharray="6 5" strokeLinecap="round"
            className={styles.arcDash} style={{filter:`drop-shadow(0 0 4px ${c.color})`}}/>
        : <path d={path} fill="none" stroke={c.color} strokeWidth={1.6} strokeOpacity={0.85}
            strokeDasharray={`${dl} ${dl}`} strokeLinecap="round"
            className={styles.arcDraw}
            style={{animationDuration:dur, filter:`drop-shadow(0 0 5px ${c.color})`, "--dl":dl}}/>
      }
      {isJet
        ? <path d="M0,-4 L6,0 L0,4 L-9,2 L-9,-2 Z" fill={c.color} opacity={0.95}
            style={{filter:`drop-shadow(0 0 6px ${c.color})`}}>
            <animateMotion dur={dur} repeatCount="indefinite" rotate="auto" calcMode="linear">
              <mpath href={`#${id}`}/>
            </animateMotion>
          </path>
        : <circle r={3} fill={c.color} style={{filter:`drop-shadow(0 0 5px ${c.color})`}}>
            <animateMotion dur={dur} repeatCount="indefinite" calcMode="linear">
              <mpath href={`#${id}`}/>
            </animateMotion>
          </circle>
      }
      <Imp x={t[0]} y={t[1]} c={c.color}/>
      <g transform={`translate(${f[0]},${f[1]})`}>
        <circle r={6} fill="none" stroke={c.color} strokeWidth={1.2} className={styles.lR}/>
        <circle r={2} fill={c.color} opacity={0.9}/>
      </g>
    </g>
  );
}

/* ─── PREDICTED ARC ───────────────────────────────────────────────────────── */
function PredArc({ conflict }) {
  const { projection } = useMapContext();
  const from = countries.find(c=>c.name===conflict.from);
  const to   = countries.find(c=>c.name===conflict.to);
  const path = useMemo(()=>{
    if(!from||!to) return null;
    const f=projection(from.coords), t=projection(to.coords);
    if(!f||!t) return null;
    const c2=cp(f,t);
    return `M${f[0]},${f[1]} Q${c2[0]},${c2[1]} ${t[0]},${t[1]}`;
  },[conflict,projection,from,to]);
  if(!path) return null;
  const col = conflict.probability>=65?"#e84545":conflict.probability>=40?"#f59e0b":"#60a5fa";
  return (
    <path d={path} fill="none" stroke={col} strokeWidth={1.1} strokeOpacity={0.35}
      strokeDasharray="3 7" strokeLinecap="round"
      className={styles.predArc} style={{filter:`drop-shadow(0 0 3px ${col})`}}/>
  );
}

/* ─── MAIN ────────────────────────────────────────────────────────────────── */
export default function WarThreatMap() {
  const [attacks,    setAttacks]    = useState([]);
  const [count,      setCount]      = useState(4738291);
  const [clock,      setClock]      = useState("");
  const [tab,        setTab]        = useState("active");
  const [openPred,   setOpenPred]   = useState(null);

  useEffect(()=>{
    setAttacks(warEvents.map(e=>({
      ...e,
      from:countries.find(c=>c.name===e.from),
      to:  countries.find(c=>c.name===e.to),
    })).filter(a=>a.from&&a.to));
  },[]);

  useEffect(()=>{
    const iv=setInterval(()=>setCount(p=>p+Math.floor(Math.random()*14)),1800);
    return ()=>clearInterval(iv);
  },[]);

  useEffect(()=>{
    const tick=()=>{
      const n=new Date();
      const p=x=>String(x).padStart(2,"0");
      setClock(`${p(n.getUTCHours())}:${p(n.getUTCMinutes())}:${p(n.getUTCSeconds())} UTC`);
    };
    tick();
    const iv=setInterval(tick,1000);
    return ()=>clearInterval(iv);
  },[]);

  const criticals = attacks.filter(a=>a.severity==="critical").length;
  const highRisk  = predictedConflicts.filter(p=>p.probability>=50).length;

  return (
    <div className={styles.page}>
      <div className={styles.noise}/>
      <div className={styles.bgGlow}/>
      <div className={styles.bgGrid}/>

      {/* ══ COMMAND BAR ══════════════════════════════════════════════════════ */}
      <div className={styles.cmdBar}>
        <div className={styles.cmdL}>
          <span className={styles.cmdDot}/>
          <span className={styles.cmdTitle}>WAR THREAT INTELLIGENCE</span>
          <span className={styles.cmdPipe}/>
          <span className={styles.cmdSub}>CLASSIFIED · EYES ONLY</span>
        </div>
        <div className={styles.cmdStats}>
          {[
            { v:criticals,                   l:"Critical",     c:"#e84545" },
            { v:highRisk,                     l:"High Risk",    c:"#f59e0b" },
            { v:intelAlerts.filter(a=>a.level==="CRITICAL").length, l:"Intel Alerts", c:"#e84545" },
            { v:count.toLocaleString(),       l:"Events Today", c:"#c9a96e" },
          ].map((s,i)=>(
            <div key={i} className={styles.cmdStat}>
              {i>0 && <span className={styles.cmdDiv}/>}
              <span className={styles.cmdV} style={{color:s.c}}>{s.v}</span>
              <span className={styles.cmdL2}>{s.l}</span>
            </div>
          ))}
        </div>
        <span className={styles.cmdClock}>{clock}</span>
      </div>

      {/* ══ HERO ═════════════════════════════════════════════════════════════ */}
      <header className={styles.hero}>
        <span className={styles.eyebrow}><span className={styles.liveDot}/>Live Global Intelligence</span>
        <h1 className={styles.heroTitle}>War Threat<br/>Command Center</h1>
        <p className={styles.heroSub}>
          Real-time conflict monitoring across {countries.length} strategic nations ·
          AI-driven predictive analysis
        </p>
        <div className={styles.heroFade}/>
      </header>

      {/* ══ DASHBOARD GRID ═══════════════════════════════════════════════════ */}
      <div className={styles.dash}>

        {/* ── LEFT PANEL ────────────────────────────────────────────────── */}
        <aside className={styles.panel}>

          {/* tabs */}
          <div className={styles.tabs}>
            {[
              { k:"active",    l:"Active Strikes", n:attacks.length,              hot:true  },
              { k:"predicted", l:"Predictions",    n:predictedConflicts.length,   hot:false },
              { k:"intel",     l:"Intel",          n:intelAlerts.length,          hot:false },
            ].map(t=>(
              <button key={t.k}
                className={`${styles.tabBtn} ${tab===t.k?styles.tabOn:""}`}
                onClick={()=>setTab(t.k)}>
                {t.l}
                <span className={`${styles.tabN} ${t.hot&&t.n>0?styles.tabNRed:""}`}>{t.n}</span>
              </button>
            ))}
          </div>

          <div className={styles.scroll}>

            {/* ·· ACTIVE STRIKES */}
            {tab==="active" && attacks.map((a,i)=>{
              const c=cfg(a.type);
              return (
                <div key={a.id} className={styles.sCard} style={{animationDelay:`${i*0.07}s`}}>
                  <div className={styles.sRow1}>
                    <span className={styles.sDot}
                      style={{background:SEVERITY_COLOR[a.severity],boxShadow:`0 0 7px ${SEVERITY_COLOR[a.severity]}`}}/>
                    <span className={styles.sType} style={{color:c.color,borderColor:`${c.color}30`}}>
                      {a.type}
                    </span>
                    <span className={styles.sSev} data-sev={a.severity}>{a.severity.toUpperCase()}</span>
                    <span className={styles.sTime}>{a.timestamp}</span>
                  </div>
                  <div className={styles.sRoute}>
                    <span className={styles.sCtry}>{a.from?.flag} {a.from?.name}</span>
                    <span className={styles.sArr}>→</span>
                    <span className={styles.sCtry}>{a.to?.flag} {a.to?.name}</span>
                  </div>
                  <p className={styles.sDesc}>{a.description}</p>
                  {a.casualties>0 && (
                    <div className={styles.sCas}>
                      <span className={styles.sCasDot}/>
                      {a.casualties} casualties reported
                    </div>
                  )}
                </div>
              );
            })}

            {/* ·· PREDICTIONS */}
            {tab==="predicted" && predictedConflicts.map((p,i)=>{
              const col = p.probability>=65?"#e84545":p.probability>=40?"#f59e0b":"#60a5fa";
              const open = openPred===p.id;
              return (
                <div key={p.id}
                  className={`${styles.pCard} ${open?styles.pOpen:""}`}
                  style={{animationDelay:`${i*0.07}s`}}
                  onClick={()=>setOpenPred(open?null:p.id)}>

                  <div className={styles.pRow1}>
                    <span className={styles.pProb} style={{color:col}}>
                      {p.probability}<span className={styles.pPct}>%</span>
                    </span>
                    <div className={styles.pNations}>
                      <span>{countries.find(c=>c.name===p.from)?.flag} {p.from}</span>
                      <span className={styles.pVs}>vs</span>
                      <span>{countries.find(c=>c.name===p.to)?.flag} {p.to}</span>
                    </div>
                    <span className={styles.pTrend} style={{color:col}}>{TREND_ICON[p.trend]}</span>
                  </div>

                  <div className={styles.pBarRow}>
                    <div className={styles.pTrack}>
                      <div className={styles.pFill}
                        style={{width:`${p.probability}%`,background:col,boxShadow:`0 0 8px ${col}50`}}/>
                    </div>
                    <span className={styles.pClass} style={{color:col}}>{p.classification}</span>
                  </div>

                  <div className={styles.pMeta}>
                    <span className={styles.pTime}>⏱ {p.timeline}</span>
                    <span className={styles.pUpd}>{p.lastUpdated}</span>
                  </div>

                  {open && (
                    <div className={styles.pDetail}>
                      <div className={styles.pInds}>
                        {Object.entries(p.indicators).map(([k,v])=>(
                          <div key={k} className={styles.pInd}>
                            <span className={styles.pIndLbl}>{k}</span>
                            <div className={styles.pIndTrack}>
                              <div className={styles.pIndFill}
                                style={{width:`${v}%`,background:col,boxShadow:`0 0 5px ${col}40`}}/>
                            </div>
                            <span className={styles.pIndVal} style={{color:col}}>{v}</span>
                          </div>
                        ))}
                      </div>
                      <div className={styles.pDrvTitle}>Intelligence Drivers</div>
                      {p.drivers.map((d,di)=>(
                        <div key={di} className={styles.pDrv}>
                          <span className={styles.pDrvDot} style={{background:col}}/>
                          <span>{d}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* ·· INTEL */}
            {tab==="intel" && intelAlerts.map((a,i)=>{
              const col=ALERT_COLOR[a.level];
              return (
                <div key={a.id} className={styles.aCard}
                  style={{animationDelay:`${i*0.07}s`,borderLeftColor:col}}>
                  <div className={styles.aRow1}>
                    <span className={styles.aLevel} style={{color:col,borderColor:`${col}40`}}>{a.level}</span>
                    <span className={styles.aTime}>{a.time}</span>
                  </div>
                  <p className={styles.aText}>{a.text}</p>
                </div>
              );
            })}

          </div>
        </aside>

        {/* ── MAP COLUMN ────────────────────────────────────────────────── */}
        <div className={styles.mapCol}>

          {/* legend */}
          <div className={styles.legend}>
            {[
              {l:"Missile",color:"#e84545"},
              {l:"Drone",  color:"#c9a96e"},
              {l:"Naval",  color:"#60a5fa"},
              {l:"Airstrike",color:"#f59e0b"},
              {l:"Artillery",color:"#a78bfa"},
              {l:"Predicted",color:null,dashed:true},
            ].map(item=>(
              <span key={item.l} className={styles.legPill}>
                {item.dashed
                  ? <span className={styles.legDash}/>
                  : <span className={styles.legDot} style={{background:item.color,boxShadow:`0 0 5px ${item.color}`}}/>
                }
                {item.l}
              </span>
            ))}
          </div>

          {/* map */}
          <div className={styles.mapFrame}>
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{scale:150, center:[20,20]}}
              className={styles.map}
            >
              <Geographies geography={GEO_URL}>
                {({geographies})=>geographies.map(geo=>(
                  <Geography key={geo.rsmKey} geography={geo}
                    fill="#0a1018" stroke="rgba(201,169,110,0.09)" strokeWidth={0.5}
                    style={{outline:"none"}}/>
                ))}
              </Geographies>

              {predictedConflicts.map(p=><PredArc key={p.id} conflict={p}/>)}
              {attacks.map(a=><AttackArc key={a.id} attack={a}/>)}

              {countries.map((loc,i)=>{
                const isTgt = attacks.some(a=>a.to?.name===loc.name);
                const isSrc = attacks.some(a=>a.from?.name===loc.name);
                const isPred = predictedConflicts.some(p=>p.to===loc.name||p.from===loc.name);
                if(!isTgt&&!isSrc&&!isPred) return null;
                const dotCol = isTgt?"#e84545":"#c9a96e";
                return (
                  <Marker key={i} coordinates={loc.coords}>
                    <circle r={22} fill={isTgt?"rgba(232,69,69,0.05)":"rgba(201,169,110,0.03)"}/>
                    <circle r={11} fill={isTgt?"rgba(232,69,69,0.14)":"rgba(201,169,110,0.07)"}/>
                    <circle r={3}  fill={dotCol} style={{filter:`drop-shadow(0 0 5px ${dotCol})`}}/>
                    {isTgt && <circle r={14} fill="none" stroke="#e84545" strokeWidth={1} className={styles.tgtPulse}/>}
                    {loc.nuclear && (
                      <text textAnchor="middle" y={-25} style={{
                        fill:"rgba(201,169,110,0.55)",fontSize:"7px",
                        fontFamily:"'JetBrains Mono',monospace"
                      }}>☢</text>
                    )}
                    <text textAnchor="middle" y={-15} style={{
                      fill:"rgba(201,169,110,0.80)",fontSize:"8px",
                      fontFamily:"'JetBrains Mono',monospace",
                      letterSpacing:"0.12em",textTransform:"uppercase"
                    }}>{loc.name}</text>
                  </Marker>
                );
              })}
            </ComposableMap>
          </div>

          {/* DEFCON bar */}
          <div className={styles.defcon}>
            {[
              {l:"DEFCON 1",sub:"Nuclear War",    c:"#e84545"},
              {l:"DEFCON 2",sub:"Critical",       c:"#f97316"},
              {l:"DEFCON 3",sub:"Elevated",       c:"#f59e0b"},
              {l:"DEFCON 4",sub:"Guarded",        c:"#60a5fa"},
              {l:"DEFCON 5",sub:"Normal",         c:"#4ade80"},
            ].map(d=>(
              <div key={d.l} className={styles.defItem}>
                <span className={styles.defBar} style={{background:d.c}}/>
                <div>
                  <span className={styles.defL}>{d.l}</span>
                  <span className={styles.defSub}>{d.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL — THREAT MATRIX ────────────────────────────── */}
        <aside className={styles.rPanel}>
          <div className={styles.rPTitle}>
            <span className={styles.rPDot}/>
            Nation Threat Matrix
          </div>

          <div className={styles.matrix}>
            {[...countries].sort((a,b)=>b.threatLevel-a.threatLevel).map((c,i)=>(
              <div key={c.name} className={styles.mRow} style={{animationDelay:`${i*0.05}s`}}>
                <span className={styles.mFlag}>{c.flag}</span>
                <div className={styles.mInfo}>
                  <div className={styles.mNameRow}>
                    <span className={styles.mName}>{c.name}</span>
                    {c.nuclear && <span className={styles.mNuc}>☢</span>}
                    <span className={styles.mAlly}>{c.alliance}</span>
                  </div>
                  <div className={styles.mBarRow}>
                    <div className={styles.mTrack}>
                      <div className={styles.mFill} style={{
                        width:`${c.military}%`,
                        background: c.threatLevel>=4?"#e84545":c.threatLevel>=3?"#f59e0b":"#4ade80"
                      }}/>
                    </div>
                    <span className={styles.mVal}>{c.military}</span>
                  </div>
                </div>
                <div className={styles.mThreat} data-t={c.threatLevel}>T{c.threatLevel}</div>
              </div>
            ))}
          </div>

          {/* nuclear summary */}
          <div className={styles.nucCard}>
            <div className={styles.nucTitle}><span className={styles.nucDot}/>Nuclear Powers</div>
            <div className={styles.nucGrid}>
              {countries.filter(c=>c.nuclear).map(c=>(
                <span key={c.name} className={styles.nucItem}>{c.flag} {c.name}</span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}