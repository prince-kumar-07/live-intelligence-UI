import { useEffect, useState } from "react"
import styles from "./Navbar.module.css"
import { useNavigate } from "react-router-dom"

function getInitialTheme() {
  try {
    const saved = localStorage.getItem("theme")
    if (saved === "light" || saved === "dark") return saved
  } catch (e) {}
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark"
}

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [theme, setTheme] = useState(getInitialTheme)
  const navigate = useNavigate()

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
    try {
      localStorage.setItem("theme", theme)
    } catch (e) {}
  }, [theme])

  function toggleTheme() {
    setTheme((t) => (t === "light" ? "dark" : "light"))
  }

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>

        {/* Logo */}
        <div onClick={() => navigate("/")} className={styles.logo}>
          <span className={styles.logoDot} />
          Global Event Intelligence
        </div>

        {/* Desktop Links */}
        <ul className={styles.links}>
          <li onClick={() => navigate("/")}>Home</li>
          <li onClick={() => navigate("/CyberThreat")}>Threat Map</li>
          <li onClick={() => navigate("/Passport/Home")}>Passport-Index</li>
          <li onClick={() => navigate("/world-map")}>Analytics</li>
          <li onClick={() => navigate("/admin")}>Admin</li>
        </ul>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={styles.themeBtn}
          aria-label="Toggle light/dark theme"
          title="Toggle light/dark theme"
        >
          <span className={styles.themeDot} />
          {theme === "light" ? "Light" : "Dark"}
        </button>

        {/* CTA */}
        <button onClick={() => navigate("/CyberThreat")} className={styles.liveBtn}>
          <span className={styles.liveDot} />
          Live Map
        </button>

        {/* Hamburger */}
        <div
          className={`${styles.hamburger} ${menuOpen ? styles.open : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span />
          <span />
          <span />
        </div>

      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className={styles.mobileMenu}>
          <p onClick={() => { navigate("/"); setMenuOpen(false) }}>Home</p>
          <p onClick={() => { navigate("/CyberThreat"); setMenuOpen(false) }}>Threat Map</p>
          <p onClick={() => navigate("/Passport/Home")}>Passport-Index</p>
          <p onClick={() => { navigate("/world-map"); setMenuOpen(false) }}>Analytics</p>
          <p onClick={() => { navigate("/admin"); setMenuOpen(false) }}>Admin</p>
          <p onClick={toggleTheme}>{theme === "light" ? "Switch to Dark" : "Switch to Light"}</p>
          <button
            className={styles.mobileBtn}
            onClick={() => { navigate("/CyberThreat"); setMenuOpen(false) }}
          >
            Live Map
          </button>
        </div>
      )}
    </nav>
  )
}

export default Navbar