import '@google/model-viewer'
import { Routes, Route, Navigate } from 'react-router-dom'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'

function MainApp() {
  return (
    <>
      <Navbar />

      <section id="satellites" className="section grid">
        <div className="glass card">
          <h2>Dashboard</h2>
          <p>Satellite analytics coming soon...</p>
        </div>
        <div className="glass card">
          <h2>Drag Simulation</h2>
          <p>Visualise atmospheric drag effects</p>
        </div>
        <div className="glass card">
          <h2>Live Data</h2>
          <p>Real-time solar weather</p>
        </div>
      </section>

      <section id="model" className="section">
        <div className="glass card">
          <h2>Solar Model</h2>
          <model-viewer
            src="/Sun.glb"
            camera-controls
            auto-rotate
            style={{ width: '100%', height: '400px' }}
          />
        </div>
      </section>

      <section id="center">
        <section className="dashboard">
          <h1>Dashboard</h1>
        </section>
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>Get started</h1>
          <p>Edit <code>src/App.jsx</code> and save to test <code>HMR</code> testtttt</p>
        </div>
        <div className="galaxy-button">
          <button className="space-button">
            <span className="backdrop"></span>
            <span className="galaxy"></span>
            <label className="text">Space</label>
          </button>
          <div className="bodydrop"></div>
        </div>
      </section>

      <div className="ticks"></div>

      <model-viewer
        src="/SpaceXStarlink.glb"
        camera-controls
        style={{ width: '100%', height: '500px' }}
      />

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg className="button-icon" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg className="button-icon" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg className="button-icon" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg className="button-icon" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>

      <div>
        <footer id="contact" className="footer glass">
          <h3>By the Emberstorm Phantasm</h3>
          <p>Built with React + Vite</p>
        </footer>
      </div>
    </>
  )
}

function App() {
  const user = JSON.parse(localStorage.getItem('user') || 'null')

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/*" element={user ? <MainApp /> : <Navigate to="/login" />} />
    </Routes>
  )
}

export default App