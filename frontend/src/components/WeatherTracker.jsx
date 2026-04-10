import { useState } from "react";
import { getUserLocation } from "../utils/Gps";

function WeatherTracker() {
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleLocate() {
    setLoading(true);
    setError(null);
    try {
      const { lat, lng } = await getUserLocation();
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=cloudcover`
      );
      const data = await res.json();

      // cloudcover is 0–100 (percentage)
      const cloudcover = data.hourly.cloudcover[0];

      setWeather({
        temperature: data.current_weather.temperature,
        windspeed: data.current_weather.windspeed,
        cloudcover,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function getSkyMessage(cloudcover) {
    if (cloudcover <= 20) return { msg: "Clear sky — great time to look up!", emoji: "☀️" };
    if (cloudcover <= 50) return { msg: "Partly cloudy — still worth a look.", emoji: "⛅" };
    if (cloudcover <= 80) return { msg: "Mostly cloudy — not ideal.", emoji: "🌥️" };
    return { msg: "Overcast — sky is covered.", emoji: "☁️" };
  }

  return (
    <div>
      <button onClick={handleLocate} disabled={loading}>
        {loading ? "Locating..." : "Check my sky"}
      </button>

      {weather && (() => {
        const { msg, emoji } = getSkyMessage(weather.cloudcover);
        return (
          <div>
            <p>{emoji} {msg}</p>
            <p>Cloud cover: {weather.cloudcover}%</p>
            <p>Temp: {weather.temperature}°C</p>
            <p>Wind: {weather.windspeed} km/h</p>
          </div>
        );
      })()}

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

export default WeatherTracker;