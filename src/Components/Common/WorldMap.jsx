import { useState, useEffect, useContext } from "react"
import { CountryContext } from "../../Context/countryContext";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from "react-simple-maps";
import countries from "world-countries";
import styles from "./WorldMap.module.css";
import { useNavigate } from "react-router-dom";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

function WorldMap() {
  const { setCountry } = useContext(CountryContext);
  const navigate = useNavigate();

  function handleSearchClick(country) {
    setCountry(country);
    navigate(`/country/${country}`);
  }

  // ── typewriter ──────────────────────────────────────────────────────────────
  const texts = [
    "Discover What's Happening Across the Globe",
    "Monitor Global Intelligence in Real Time",
    "Track Cyber Threats Worldwide",
    "Visualize Global Events Instantly",
  ];
  const [displayText, setDisplayText] = useState("");
  const [textIndex, setTextIndex]     = useState(0);
  const [isDeleting, setIsDeleting]   = useState(false);

  useEffect(() => {
    const currentText = texts[textIndex];
    const speed = isDeleting ? 40 : 80;
    const timeout = setTimeout(() => {
      setDisplayText(prev =>
        isDeleting
          ? currentText.substring(0, prev.length - 1)
          : currentText.substring(0, prev.length + 1)
      );
      if (!isDeleting && displayText === currentText) {
        setTimeout(() => setIsDeleting(true), 1200);
      } else if (isDeleting && displayText === "") {
        setIsDeleting(false);
        setTextIndex(prev => (prev + 1) % texts.length);
      }
    }, speed);
    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, textIndex]);

  // ── map state ───────────────────────────────────────────────────────────────
  const [hoveredCountry,  setHoveredCountry]  = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [tooltip, setTooltip] = useState({ x: 0, y: 0, country: "" });
  const [mapPosition, setMapPosition] = useState({ coordinates: [0, 20], zoom: 1 });

  const getCountryData = (name) => {
    if (!name) return null;
    const n = name.toLowerCase();
    return countries.find(c =>
      c.name.common.toLowerCase() === n ||
      c.name.common.toLowerCase().includes(n) ||
      n.includes(c.name.common.toLowerCase())
    );
  };

  const handleCountryClick = (geo) => {
    const countryName = geo.properties.name;
    setSelectedCountry(countryName);
    const bounds = geo.bounds;
    if (bounds) {
      const centerX = (bounds[0][0] + bounds[1][0]) / 2;
      const centerY = (bounds[0][1] + bounds[1][1]) / 2;
      setMapPosition({ coordinates: [centerX, centerY], zoom: 3 });
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.noise} />

      {/* ── HERO ── */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroDotGrid} />

        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            Global Intelligence Platform
          </span>

          <h1 className={styles.heading}>
            {displayText}
            <span className={styles.cursor} />
          </h1>

          <p className={styles.heroSub}>
            Explore real-time data for every nation — click any country to dive deeper.
          </p>
        </div>

        <div className={styles.heroFade} />
      </section>

      {/* ── MAP SECTION ── */}
      <div className={styles.mapSection}>

        {/* controls */}
        <div className={styles.controls}>
          <div className={styles.selectWrap}>
            <svg className={styles.selectIcon} viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <select
              className={styles.select}
              value={selectedCountry}
              onChange={e => setSelectedCountry(e.target.value)}
            >
              <option value="">Select a country</option>
              {countries.map(country => (
                <option key={country.cca3} value={country.name.common}>
                  {country.name.common}
                </option>
              ))}
            </select>
          </div>

          <button
            className={styles.searchBtn}
            onClick={() => handleSearchClick(selectedCountry)}
          >
            View Intelligence
            <svg viewBox="0 0 14 14" fill="none" width="13" height="13">
              <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* map */}
        <div className={styles.mapWrapper}>
          <ComposableMap projectionConfig={{ scale: 160 }}>
            <ZoomableGroup
              center={mapPosition.coordinates}
              zoom={mapPosition.zoom}
            >
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map(geo => {
                    const countryName = geo.properties.name;
                    const isSelected  = selectedCountry === countryName;
                    const isHovered   = hoveredCountry  === countryName;

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onMouseMove={evt => {
                          setHoveredCountry(countryName);
                          setTooltip({ x: evt.clientX, y: evt.clientY, country: countryName });
                        }}
                        onMouseLeave={() => setHoveredCountry("")}
                        onClick={() => handleCountryClick(geo)}
                        style={{
                          default: {
                            fill: isSelected
                              ? "rgba(201,169,110,0.55)"
                              : isHovered
                                ? "rgba(201,169,110,0.30)"
                                : "#0d1520",
                            stroke: "rgba(201,169,110,0.15)",
                            strokeWidth: 0.5,
                            outline: "none",
                          },
                          hover: {
                            fill: "rgba(201,169,110,0.30)",
                            stroke: "rgba(201,169,110,0.35)",
                            strokeWidth: 0.6,
                            outline: "none",
                          },
                          pressed: {
                            fill: "rgba(201,169,110,0.60)",
                            outline: "none",
                          },
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>

          {/* tooltip */}
          {hoveredCountry && (() => {
            const country = getCountryData(tooltip.country);
            if (!country) return null;
            return (
              <div
                className={styles.tooltip}
                style={{ top: tooltip.y, left: tooltip.x }}
              >
                <img
                  src={`https://flagcdn.com/w40/${country.cca2.toLowerCase()}.png`}
                  alt={country.name.common}
                  className={styles.tooltipFlag}
                />
                <span className={styles.tooltipName}>{country.name.common}</span>
              </div>
            );
          })()}
        </div>

      </div>
    </div>
  );
}

export default WorldMap;