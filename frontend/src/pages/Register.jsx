import { useState } from "react";
import { useNavigate } from "react-router-dom";

const stars = Array.from({ length: 120 }, (_, i) => ({
  id: i,
  top: Math.random() * 100,
  left: Math.random() * 100,
  size: Math.random() * 2 + 1,
  opacity: Math.random() * 0.7 + 0.3,
  duration: Math.random() * 3 + 2,
}));

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", birthday: "", password: "" });
  const [error, setError] = useState("");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    if (users.find(u => u.email === form.email)) {
      return setError("An account with this email already exists.");
    }
    const newUser = { ...form, guest: false };
    users.push(newUser);
    localStorage.setItem("users", JSON.stringify(users));
    localStorage.setItem("user", JSON.stringify(newUser));
    navigate("/");
  }

  const inputStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "0.5px solid rgba(255,255,255,0.15)",
    borderRadius: 8,
    padding: "10px 14px",
    color: "#fff",
    fontSize: 14,
    outline: "none",
  };

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

      <style>{`@keyframes twinkle { from { opacity: 0.2; } to { opacity: 1; } }`}</style>

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
          <div style={{ fontSize: 28, marginBottom: 4 }}>🚀</div>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: "#fff" }}>Create account</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Join the crew</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input name="name" type="text" placeholder="Full name" value={form.name} onChange={handleChange} required style={inputStyle} />
          <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required style={inputStyle} />
          <input name="birthday" type="date" value={form.birthday} onChange={handleChange} required style={{ ...inputStyle, colorScheme: "dark" }} />
          <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required style={inputStyle} />

          {error && <p style={{ color: "#f09595", fontSize: 13 }}>{error}</p>}

          <button type="submit" style={{
            width: "100%",
            padding: "10px",
            background: "rgba(255,255,255,0.1)",
            border: "0.5px solid rgba(255,255,255,0.25)",
            borderRadius: 8,
            color: "#fff",
            fontSize: 14,
            cursor: "pointer",
            marginTop: 4,
          }}>
            Register
          </button>
        </form>

        <button
          onClick={() => navigate("/login")}
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
          Back to login
        </button>
      </div>
    </div>
  );
}