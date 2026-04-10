import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function generateStars(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    top: Math.random() * 100,
    left: Math.random() * 100,
    size: Math.random() * 2 + 1,
    opacity: Math.random() * 0.7 + 0.3,
    duration: Math.random() * 3 + 2,
  }));
}

const stars = generateStars(120);

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [sparkles, setSparkles] = useState([]);

  function spawnSparkles() {
    const newSparkles = Array.from({ length: 6 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100,
      y: Math.random() * 100,
    }));
    setSparkles(newSparkles);
    setTimeout(() => setSparkles([]), 700);
  }

  function handleGuest() {
    localStorage.setItem("user", JSON.stringify({ guest: true }));
    navigate("/");
  }

  function handleLogin(e) {
    e.preventDefault();
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const found = users.find(u => u.email === email && u.password === password);
    if (!found) return setError("Email or password is incorrect.");
    localStorage.setItem("user", JSON.stringify(found));
    navigate("/");
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#05050f",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* STARS */}
      {stars.map(s => (
        <div key={s.id} style={{
          position: "absolute",
          top: `${s.top}%`,
          left: `${s.left}%`,
          width: s.size,
          height: s.size,
          borderRadius: "50%",
          background: "#fff",
          opacity: s.opacity,
          animation: `twinkle ${s.duration}s ease-in-out infinite alternate`,
        }} />
      ))}

      <style>{`
        @keyframes twinkle { from { opacity: 0.2; } to { opacity: 1; } }
        @keyframes sparkle-pop { 0% { transform: scale(0); opacity: 1; } 100% { transform: scale(1.5); opacity: 0; } }
      `}</style>

      {/* CARD */}
      <div style={{
        width: 340,
        background: "rgba(255,255,255,0.04)",
        border: "0.5px solid rgba(255,255,255,0.12)",
        borderRadius: 16,
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        position: "relative",
        zIndex: 1,
      }}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>🌌</div>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: "#fff" }}>Welcome back</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Sign in to continue</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "0.5px solid rgba(255,255,255,0.15)",
              borderRadius: 8,
              padding: "10px 14px",
              color: "#fff",
              fontSize: 14,
              outline: "none",
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "0.5px solid rgba(255,255,255,0.15)",
              borderRadius: 8,
              padding: "10px 14px",
              color: "#fff",
              fontSize: 14,
              outline: "none",
            }}
          />
          {error && <p style={{ color: "#f09595", fontSize: 13 }}>{error}</p>}

          {/* LOGIN BUTTON WITH SPARKLES */}
          <div style={{ position: "relative" }}>
            <button
              type="submit"
              onClick={spawnSparkles}
              style={{
                width: "100%",
                padding: "10px",
                background: "rgba(255,255,255,0.1)",
                border: "0.5px solid rgba(255,255,255,0.25)",
                borderRadius: 8,
                color: "#fff",
                fontSize: 14,
                cursor: "pointer",
                position: "relative",
                overflow: "hidden",
              }}
            >
              Log in
              {sparkles.map(s => (
                <span key={s.id} style={{
                  position: "absolute",
                  top: `${s.y}%`,
                  left: `${s.x}%`,
                  width: 6,
                  height: 6,
                  background: "#ffe066",
                  borderRadius: "50%",
                  animation: "sparkle-pop 0.7s ease-out forwards",
                  pointerEvents: "none",
                }} />
              ))}
            </button>
          </div>
        </form>

        <button
          onClick={() => navigate("/register")}
          style={{
            width: "100%",
            padding: "10px",
            background: "transparent",
            border: "0.5px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            color: "rgba(255,255,255,0.6)",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Create an account
        </button>

        <button
          onClick={handleGuest}
          style={{
            width: "100%",
            padding: "10px",
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.35)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Continue as guest
        </button>
      </div>
    </div>
  );
}