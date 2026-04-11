import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StarBackground from '../components/StarBackground'

function ConstellationCorner({ flip }) {
  const stars = [
    { cx: 18, cy: 22 }, { cx: 52, cy: 10 }, { cx: 88, cy: 34 },
    { cx: 34, cy: 58 }, { cx: 70, cy: 48 }, { cx: 110, cy: 18 },
    { cx: 6,  cy: 72 }, { cx: 44, cy: 82 }, { cx: 92, cy: 70 },
  ]
  const lines = [[0,1],[1,2],[1,4],[4,3],[4,5],[3,6],[6,7],[7,8],[4,8]]
  return (
    <svg
      width="120" height="100"
      style={{
        position: 'absolute',
        ...(flip
          ? { bottom: 0, right: 0, transform: 'rotate(180deg)' }
          : { top: 0, left: 0 }),
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      {lines.map(([a, b], i) => (
        <line key={i} x1={stars[a].cx} y1={stars[a].cy} x2={stars[b].cx} y2={stars[b].cy}
          stroke="rgba(192,132,252,0.25)" strokeWidth="0.8" />
      ))}
      {stars.map((s, i) => (
        <g key={i}>
          <circle cx={s.cx} cy={s.cy} r="1.8" fill="#c084fc" opacity="0.9">
            <animate attributeName="opacity" values="0.4;1;0.4" dur={`${2.5 + i * 0.4}s`} repeatCount="indefinite" />
          </circle>
          <circle cx={s.cx} cy={s.cy} r="4" fill="rgba(192,132,252,0.12)">
            <animate attributeName="r" values="3;6;3" dur={`${2.5 + i * 0.4}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0;0.3" dur={`${2.5 + i * 0.4}s`} repeatCount="indefinite" />
          </circle>
        </g>
      ))}
    </svg>
  )
}

function BorderSparkles() {
  const sparks = Array.from({ length: 12 }, (_, i) => ({
    id: i, pos: i / 12, delay: i * 0.3, dur: 2 + (i % 3) * 0.7,
  }))
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
      {sparks.map((s) => {
        const perim = s.pos
        let x, y
        if (perim < 0.25)      { x = `${perim * 4 * 100}%`; y = '0%' }
        else if (perim < 0.5)  { x = '100%'; y = `${(perim - 0.25) * 4 * 100}%` }
        else if (perim < 0.75) { x = `${(1 - (perim - 0.5) * 4) * 100}%`; y = '100%' }
        else                   { x = '0%'; y = `${(1 - (perim - 0.75) * 4) * 100}%` }
        return (
          <g key={s.id}>
            <circle cx={x} cy={y} r="2" fill="#c084fc">
              <animate attributeName="opacity" values="0;1;0" dur={`${s.dur}s`} begin={`${s.delay}s`} repeatCount="indefinite" />
              <animate attributeName="r" values="1;3;1" dur={`${s.dur}s`} begin={`${s.delay}s`} repeatCount="indefinite" />
            </circle>
          </g>
        )
      })}
    </svg>
  )
}

export default function Register({ onClose, isModal = false }) {
  const navigate = useNavigate()
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)

  function handleRegister(e) {
    e.preventDefault()
    setError('')
    if (!name || !email || !password || !confirm) { setError('Please fill in all fields.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6)  { setError('Password must be at least 6 characters.'); return }

    const users = JSON.parse(localStorage.getItem('users') || '[]')
    if (users.find(u => u.email === email)) { setError('An account with this email already exists.'); return }

    users.push({ name, email, password })
    localStorage.setItem('users', JSON.stringify(users))
    localStorage.setItem('user', JSON.stringify({ name, email }))
    setSuccess(true)
    setTimeout(() => {
      if (isModal && onClose) onClose()
      else navigate('/')
    }, 900)
  }

  function handleGuest() {
    localStorage.setItem('user', JSON.stringify({ guest: true, name: 'Guest' }))
    if (isModal && onClose) onClose()
    else navigate('/')
  }

  const card = (
    <div style={{
      position: 'relative',
      background: 'rgba(6, 8, 24, 0.82)',
      border: '1px solid rgba(192,132,252,0.35)',
      borderRadius: 24,
      padding: '48px 48px 40px',
      width: 420,
      maxWidth: '92vw',
      boxShadow: '0 0 80px rgba(168,85,247,0.18), inset 0 1px 0 rgba(255,255,255,0.06)',
      backdropFilter: 'blur(24px)',
      overflow: 'hidden',
    }}>
      <ConstellationCorner flip={false} />
      <ConstellationCorner flip={true} />
      <BorderSparkles />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>✦</div>
          <h1 style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 32, fontWeight: 200,
            color: '#c084fc', letterSpacing: '0.08em',
            textShadow: '0 0 24px rgba(168,85,247,0.5)', margin: '0 0 6px',
          }}>Create Account</h1>
          <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 15, color: 'rgba(240,244,255,0.45)', margin: 0 }}>
            Join the cosmos
          </p>
        </div>

        {success && (
          <div style={{
            background: 'rgba(72,199,142,0.12)', border: '1px solid rgba(72,199,142,0.3)',
            color: '#6ee7b7', borderRadius: 10, padding: '10px 14px',
            fontFamily: "'Barlow', sans-serif", fontSize: 15, marginBottom: 16, textAlign: 'center',
          }}>Account created! Launching your sky…</div>
        )}

        {error && (
          <div style={{
            background: 'rgba(239,83,80,0.12)', border: '1px solid rgba(239,83,80,0.3)',
            color: '#f87171', borderRadius: 10, padding: '10px 14px',
            fontFamily: "'Barlow', sans-serif", fontSize: 15, marginBottom: 16,
          }}>{error}</div>
        )}

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" style={inputStyle} />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" style={inputStyle} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" style={inputStyle} />
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm password" style={inputStyle} />
          <button type="submit" style={primaryBtnStyle}>Create Account</button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(192,132,252,0.18)' }} />
          <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: 'rgba(192,132,252,0.5)' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(192,132,252,0.18)' }} />
        </div>

        <button onClick={handleGuest} style={ghostBtnStyle}>Continue as Guest</button>

        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 14, color: 'rgba(240,244,255,0.4)' }}>
            Already have an account?{' '}
          </span>
          <span
            onClick={() => navigate('/login')}
            style={{ fontFamily: "'Barlow', sans-serif", fontSize: 14, color: '#c084fc', cursor: 'pointer', textDecoration: 'underline' }}
          >Sign in</span>
        </div>
      </div>
    </div>
  )

  if (isModal) {
    return (
      <div
        onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(2,4,14,0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {card}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <StarBackground />
      <div style={{ position: 'relative', zIndex: 1 }}>{card}</div>
    </div>
  )
}

const inputStyle = {
  background: 'rgba(10,20,60,0.5)',
  border: '1px solid rgba(192,132,252,0.25)',
  borderRadius: 10, padding: '12px 16px',
  color: '#f0f4ff',
  fontFamily: "'Barlow', sans-serif", fontSize: 16,
  outline: 'none', width: '100%', boxSizing: 'border-box',
}

const primaryBtnStyle = {
  background: 'rgba(168,85,247,0.2)',
  border: '1px solid rgba(192,132,252,0.45)',
  borderRadius: 10, padding: '13px',
  color: '#c084fc',
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: 18, fontWeight: 300, letterSpacing: '0.08em',
  textTransform: 'uppercase', cursor: 'pointer',
}

const ghostBtnStyle = {
  background: 'transparent',
  border: '1px solid rgba(240,244,255,0.15)',
  borderRadius: 10, padding: '12px',
  color: 'rgba(240,244,255,0.6)',
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: 17, fontWeight: 300, letterSpacing: '0.06em',
  cursor: 'pointer', width: '100%',
}