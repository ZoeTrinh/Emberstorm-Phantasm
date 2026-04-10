import { useNavigate } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || 'null')

  function handleLogout() {
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <nav className="navbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div className="nav-logo">CelestSky</div>
      <ul className="nav-links" style={{ display: 'flex', listStyle: 'none', gap: 24, margin: 0 }}>
        <li><a href="#">Info</a></li>
        <li><a href="#">Satellites selector</a></li>
        <li><a href="#">Drag model</a></li>
        <li><a href="#">Contact</a></li>
      </ul>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {user ? (
          <>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
              {user.guest ? 'Guest' : user.name}
            </span>
            <button
              onClick={handleLogout}
              style={{
                padding: '6px 14px',
                background: 'transparent',
                border: '0.5px solid rgba(255,255,255,0.25)',
                borderRadius: 8,
                color: 'rgba(255,255,255,0.7)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => navigate('/login')}
              style={{
                padding: '6px 14px',
                background: 'transparent',
                border: '0.5px solid rgba(255,255,255,0.25)',
                borderRadius: 8,
                color: 'rgba(255,255,255,0.7)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Log in
            </button>
            <button
              onClick={() => navigate('/register')}
              style={{
                padding: '6px 14px',
                background: 'rgba(255,255,255,0.1)',
                border: '0.5px solid rgba(255,255,255,0.25)',
                borderRadius: 8,
                color: '#fff',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Register
            </button>
          </>
        )}
      </div>
    </nav>
  )
}