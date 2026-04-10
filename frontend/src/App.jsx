import { useEffect, useState } from "react";
import "@google/model-viewer";
import heroImg from "./assets/hero.png";
import "./App.css";

function App() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchWeather() {
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/api/weather?lat=-37.8136&lon=144.9631"
        );

        if (!response.ok) {
          throw new Error("Failed to fetch weather data");
        }

        const data = await response.json();
        console.log("Weather data:", data);
        setWeather(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchWeather();
  }, []);

  return (
    <>
      <nav className="navbar">
        <div className="nav-logo">Emberstorm Phantasm</div>
        <ul className="nav-links">
          <li><a href="#dashboard">Dashboard</a></li>
          <li><a href="#satellites">Satellites</a></li>
          <li><a href="#model">Model</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
      </nav>

      <section id="dashboard" className="section grid">
        <div className="glass card">
          <h2>Current Weather</h2>
          {loading && <p>Loading weather...</p>}
          {error && <p>Error: {error}</p>}
          {weather && (
            <>
              <p>Temperature: {weather.current_weather?.temperature}°C</p>
              <p>Wind Speed: {weather.current_weather?.windspeed} km/h</p>
              <p>Weather Code: {weather.current_weather?.weathercode}</p>
            </>
          )}
        </div>

        <div className="glass card">
          <h2>Forecast Summary</h2>
          {weather?.daily ? (
            <>
              <p>Max Temp Today: {weather.daily.temperature_2m_max?.[0]}°C</p>
              <p>Min Temp Today: {weather.daily.temperature_2m_min?.[0]}°C</p>
              <p>
                Rain Chance: {weather.daily.precipitation_probability_max?.[0]}%
              </p>
            </>
          ) : (
            <p>Forecast data coming soon...</p>
          )}
        </div>

        <div className="glass card">
          <h2>Live Data</h2>
          <p>Real-time solar/weather monitoring</p>
        </div>
      </section>

      <section id="model" className="section">
        <div className="glass card">
          <h2>Solar Model</h2>
          <model-viewer
            src="/Sun.glb"
            camera-controls
            auto-rotate
            style={{ width: "100%", height: "400px" }}
          />
        </div>
      </section>

      <section id="center">
        <section className="dashboard">
          <h1>Dashboard</h1>
        </section>

        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
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

      <model-viewer
        src="/SpaceXStarlink.glb"
        camera-controls
        style={{ width: "100%", height: "500px" }}
      />

      <footer id="contact" className="footer glass">
        <h3>By Emberstorm Phantasm</h3>
        <p>Built with React + Vite + FastAPI</p>
      </footer>
    </>
  );
}

export default App;