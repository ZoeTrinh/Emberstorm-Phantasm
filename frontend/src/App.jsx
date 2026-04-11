import '@google/model-viewer'
import { useState, useEffect, useRef } from 'react'
import { Routes, Route } from 'react-router-dom'
import WeatherTracker from './components/WeatherTracker.jsx'
import StarBackground from './components/StarBackground'
import CelestialOverlay from './components/CelestialOverlay.jsx'
import './App.css'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import CelestialWeather from './components/CelestialWeather'
import SkyRecommendation from './components/SkyRecommendation'

function MainApp() {
  const [hourlyWeather, setHourlyWeather]   = useState(null)
  const [heroEvent, setHeroEvent]           = useState(null)
  const [gpsLocation, setGpsLocation]       = useState(null)
  const [locationDenied, setLocationDenied] = useState(false)
  const [loginModal, setLoginModal]         = useState(false)
  const [registerModal, setRegisterModal]   = useState(false)

  const forecastRef       = useRef(null)
  const celestialRef      = useRef(null)
  const recommendationRef = useRef(null)

  function askLocation() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationDenied(false)
      },
      () => setLocationDenied(true),
      { enableHighAccuracy: true, timeout: 12000 }
    )
  }

  useEffect(() => { askLocation() }, [])

  function handleViewSkyClick() {
    askLocation()
    forecastRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  function handleLocationGranted(loc) {
    setGpsLocation(loc)
  }

  return (
    <>
      <StarBackground />
      <CelestialOverlay />

      <Navbar
        onForecastClick={()       => forecastRef.current?.scrollIntoView({ behavior: 'smooth' })}
        onCelestialClick={()      => celestialRef.current?.scrollIntoView({ behavior: 'smooth' })}
        onRecommendationClick={()  => recommendationRef.current?.scrollIntoView({ behavior: 'smooth' })}
        onLoginClick={()          => setLoginModal(true)}
        onRegisterClick={()        => setRegisterModal(true)}
      />

      {loginModal && (
        <Login isModal onClose={() => { setLoginModal(false); askLocation() }} />
      )}
      {registerModal && (
        <Register isModal onClose={() => { setRegisterModal(false); askLocation() }} />
      )}

      <div className="titlePanel">
        <h1>Should you look up<br />the sky today?</h1>
        <p>Celestial phenomena calendar using space weather</p>
        <div className="galaxy-button">
          <button className="space-button" onClick={handleViewSkyClick}>
            <span className="backdrop" />
            <span className="galaxy" />
            <label className="text">View your sky</label>
          </button>
          {locationDenied && (
            <div className="location-denied-hint">
              Location access was denied — click above to try again
            </div>
          )}
        </div>
      </div>

      <section id="dashboard" className="section" ref={forecastRef}>
        <div className="glass card section-inner">
          <WeatherTracker
            onWeatherLoad={setHourlyWeather}
            autoLocation={gpsLocation}
            onLocationGranted={handleLocationGranted}
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

      {/* Recommendation banner — only appears once both data sources are ready */}
      {(hourlyWeather || heroEvent) && (
        <section id="recommendation" className="section" ref={recommendationRef}>
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