import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Routes, Route, useLocation } from 'react-router-dom'
import CyberThreat from './Components/Cyber Threat/CyberThreat'
import Navbar from './Components/Common/Navbar'
import CursorGlow from './Components/Common/CursorGlow'
import Home from './Components/Home/Home'
import WorldMap from './Components/Common/WorldMap'
import CountryView from './Components/Country View/CountryView'
import WarThreatMap from './Components/WarZone/WarThreatMap'
import PassportHome from './Components/Passport/PassportHome'
import CountryPassportData from './Components/Passport/CountryPassportData'
import PassportComparision from './Components/Passport/PassportComparision'
import AdminLogin from './Components/Admin/AdminLogin'
import AdminDashboard from './Components/Admin/AdminDashboard'

function AnimatedRoutes() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        className="route-fade"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      >
        <Routes location={location}>
          <Route path='' element={<Home />} />
          <Route path='/CyberThreat' element={<CyberThreat />} />
          <Route path='/world-map' element={<WorldMap />} />
          <Route path='/country/:country' element={<CountryView />} />
          <Route path='/warzone' element={<WarThreatMap />} />
          <Route path='/Passport/Home' element={<PassportHome />} />
          <Route path='/Passport/:country' element={<CountryPassportData />} />
          <Route path='/Passport/compare' element={<PassportComparision />} />
          <Route path='/admin/login' element={<AdminLogin />} />
          <Route path='/admin' element={<AdminDashboard />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

function App() {
  return (
    <div>
      <CursorGlow />
      <Navbar />
      <AnimatedRoutes />
    </div>
  )
}

export default App
