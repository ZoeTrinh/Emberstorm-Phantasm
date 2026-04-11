import { useNavigate } from 'react-router-dom'

export default function Navbar({ onForecastClick, onCelestialClick, onLoginClick, onRegisterClick }) {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || 'null')

  function handleLogout() {
    localStorage.removeItem('user')
    window.location.reload()
  }

  return (
    
      <nav className="navbar">
        <div className="nav-logo">✦ CelestSky</div>

        <ul className="nav-links">
          <li>
            <a href="#" onClick={(e) => { e.preventDefault(); onForecastClick?.() }}>
              Weather Forecast
            </a>
          </li>
          <li>
            <a href="#" onClick={(e) => { e.preventDefault(); onCelestialClick?.() }}>
              Celestial Phenomena
            </a>
          </li>
        </ul>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user && !user.guest ? (
            <>
              <span style={{
                fontFamily: "'Barlow', sans-serif", fontSize: 15,
                color: 'rgba(203,213,245,0.6)',
              }}>
                {user.name}
              </span>
              <button onClick={handleLogout} style={outlineBtnStyle}>Log out</button>
            </>
          ) : (
            <>
              <button onClick={onLoginClick} style={outlineBtnStyle}>Log in</button>
              <button onClick={onRegisterClick} style={fillBtnStyle}>Register</button>
            </>
          )}
        </div>
      </nav>
  )
}


const outlineBtnStyle = {
  padding: '8px 18px',
  background: 'transparent',
  border: '1px solid rgba(192,132,252,0.25)',
  borderRadius: 8,
  color: 'rgba(203,213,245,0.8)',
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: 16, letterSpacing: '0.06em',
  cursor: 'pointer',
  transition: 'border-color 0.2s, color 0.2s',
}

const fillBtnStyle = {
  padding: '8px 18px',
  background: 'rgba(168,85,247,0.15)',
  border: '1px solid rgba(192,132,252,0.35)',
  borderRadius: 8,
  color: '#c084fc',
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: 16, letterSpacing: '0.06em',
  cursor: 'pointer',
}