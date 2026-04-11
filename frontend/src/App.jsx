import '@google/model-viewer'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import WeatherTracker from './components/WeatherTracker.jsx'
import StarBackground from './components/StarBackground'
import './App.css'
import Navbar from './components/Navbar'
import Aurora from './components/Aurora'
import Login from './pages/Login'
import Register from './pages/Register'
import CelestialWeather from './components/CelestialWeather'
import SkyRecommendation from './components/SkyRecommendation'

function MainApp() {
  const [hourlyWeather, setHourlyWeather]     = useState(null)
  const [heroEvent, setHeroEvent]             = useState(null)
  const [gpsLocation, setGpsLocation]         = useState(null)
  const [locationDenied, setLocationDenied]   = useState(false)
  const [locationBlocked, setLocationBlocked] = useState(false)
  const [loginModal, setLoginModal]           = useState(false)
  const [registerModal, setRegisterModal]     = useState(false)
  const [pendingScroll, setPendingScroll]     = useState(false)

  const forecastRef       = useRef(null)
  const celestialRef      = useRef(null)
  const recommendationRef = useRef(null)

  function scrollToRecommendationCenter() {
    const el = recommendationRef.current
    if (!el) return
    const rect   = el.getBoundingClientRect()
    const middle = window.scrollY + rect.top + rect.height / 2 - window.innerHeight / 2
    window.scrollTo({ top: middle, behavior: 'smooth' })
  }

  // Callback ref — fires the instant the recommendation section enters the DOM
  const setRecommendationRef = useCallback((node) => {
    recommendationRef.current = node
    if (node && pendingScroll) {
      setPendingScroll(false)
      setTimeout(() => {
        const rect   = node.getBoundingClientRect()
        const middle = window.scrollY + rect.top + rect.height / 2 - window.innerHeight / 2
        window.scrollTo({ top: middle, behavior: 'smooth' })
      }, 80)
    }
  }, [pendingScroll])

  // If section was already mounted when pendingScroll becomes true, scroll immediately
  useEffect(() => {
    if (pendingScroll && recommendationRef.current) {
      setPendingScroll(false)
      setTimeout(scrollToRecommendationCenter, 80)
    }
  }, [pendingScroll])

  // Ask for GPS — returns a Promise that resolves once GPS replies
  function askLocation() {
    return new Promise(async (resolve) => {
      if (!navigator.geolocation) { resolve(null); return }

      try {
        const status = await navigator.permissions.query({ name: 'geolocation' })
        if (status.state === 'denied') {
          setLocationBlocked(true)
          setLocationDenied(false)
          resolve(null)
          return
        }
        setLocationBlocked(false)
      } catch { /* Permissions API not supported */ }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setGpsLocation(loc)           // triggers both WeatherTracker + CelestialWeather
          setLocationDenied(false)
          setLocationBlocked(false)
          resolve(loc)
        },
        () => {
          setLocationDenied(true)
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 12000 }
      )
    })
  }

  // "View your sky" — ask GPS, then wait for both sections to finish loading
  async function handleViewSkyClick() {
    const loc = await askLocation()
    if (loc) setPendingScroll(true)   // start waiting to scroll once both sections load
  }

  return (
    <>
      <StarBackground />

      <Navbar
        onForecastClick={()       => forecastRef.current?.scrollIntoView({ behavior: 'smooth' })}
        onCelestialClick={()      => celestialRef.current?.scrollIntoView({ behavior: 'smooth' })}
        onRecommendationClick={()  => scrollToRecommendationCenter()}
        onLoginClick={()          => setLoginModal(true)}
        onRegisterClick={()       => setRegisterModal(true)}
      />

      {loginModal && (
        <Login isModal onClose={() => setLoginModal(false)} />
      )}
      {registerModal && (
        <Register isModal onClose={() => setRegisterModal(false)} />
      )}

      <div className="titlePanel">
        <Aurora
          colorStops={['#67e8f9', '#c084fc', '#38bdf8']}
          amplitude={1.1}
          blend={0.6}
          speed={0.4}
        />
        <div className="floatingTitle">
          <h1>Should you look up<br />the sky today?</h1>
          <p>Celestial phenomena calendar using space weather</p>
        </div>
        <h1 className="titlePanel-ghost">Should you look up<br />the sky today?</h1>
        <p className="titlePanel-ghost">Celestial phenomena calendar using space weather</p>
        <div className="galaxy-button">
          <button className="space-button" onClick={handleViewSkyClick}>
            <span className="backdrop" />
            <span className="galaxy" />
            <label className="text">View your sky</label>
          </button>

          {locationBlocked && (
            <div className="location-denied-hint">
              Location is blocked by your browser. Open browser settings →
              Site permissions → Location, allow this site, then refresh.
            </div>
          )}
          {locationDenied && !locationBlocked && (
            <div className="location-denied-hint">
              Location access was denied — click above to try again
            </div>
          )}
        </div>
      </div>

      {/* Both sections always rendered — they load automatically once gpsLocation is set */}
      <section id="dashboard" className="section" ref={forecastRef}>
        <div className="glass card section-inner">
          <WeatherTracker
            onWeatherLoad={setHourlyWeather}
            autoLocation={gpsLocation}
            onLocationGranted={setGpsLocation}
          />
        </div>
      </section>

      <section id="celestial" className="section" ref={celestialRef}>
        <div className="glass card section-inner">
          <CelestialWeather
            hourlyWeather={hourlyWeather}
            autoLocation={gpsLocation}
            onHeroEvent={setHeroEvent}
          />
        </div>
      </section>

      {/* Mounts once either data source is ready — callback ref fires the scroll */}
      {(hourlyWeather || heroEvent) && (
        <section id="recommendation" className="section" ref={setRecommendationRef}>
          <div className="glass card section-inner">
            <SkyRecommendation
              hourlyWeather={hourlyWeather}
              heroEvent={heroEvent}
            />
          </div>
        </section>
      )}

      <footer id="contact" className="footer-bar">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="footer-logo">✦ CelestSky</span>
            <span className="footer-tagline">Your window to the cosmos</span>
          </div>
          <div className="footer-links">
            <a href="#" onClick={(e) => { e.preventDefault(); forecastRef.current?.scrollIntoView({ behavior: 'smooth' }) }}>Weather Forecast</a>
            <a href="#" onClick={(e) => { e.preventDefault(); celestialRef.current?.scrollIntoView({ behavior: 'smooth' }) }}>Celestial Events</a>
          </div>
          <div className="footer-copy">
            <span>By the Emberstorm Phantasm</span>
            <span>Built with React + Vite</span>
          </div>
        </div>
      </footer>
    </>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/*"        element={<MainApp />} />
    </Routes>
  )
}

export default App