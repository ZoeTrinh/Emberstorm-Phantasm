import { useState } from "react";
import { getUserLocation } from "../utils/Gps";

function getSkyInfo(cloudcover) {
  if (cloudcover <= 20) return { label: "Clear", icon: "☀️" };
  if (cloudcover <= 50) return { label: "Partly cloudy", icon: "⛅" };
  if (cloudcover <= 80) return { label: "Mostly cloudy", icon: "🌥️" };
  return { label: "Overcast", icon: "☁️" };
}

function formatHour(timeStr) {
  const date = new Date(timeStr);
  const h = date.getHours();
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

function formatDay(dateStr, index) {
  if (index === 0) return "Today";
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-AU", { weekday: "short" });
}

export default function WeatherTracker() {
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleLocate() {
    setLoading(true);
    setError(null);
    try {
      const { lat, lng } = await getUserLocation();

      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${lat}&longitude=${lng}` +
        `&hourly=temperature_2m,cloudcover,windspeed_10m` +
        `&daily=temperature_2m_max,temperature_2m_min,cloudcover_mean,windspeed_10m_max` +
        `&current_weather=true` +
        `&timezone=auto` +
        `&forecast_days=7`
      );
      const data = await res.json();

      // find current hour index
      const now = new Date().toISOString().slice(0, 13);
      const hourIndex = data.hourly.time.findIndex(t => t.startsWith(now));

      // grab next 24 hours from current hour
      const hourlySlice = data.hourly.time
        .slice(hourIndex, hourIndex + 24)
        .map((t, i) => ({
          time: t,
          temp: Math.round(data.hourly.temperature_2m[hourIndex + i]),
          cloud: data.hourly.cloudcover[hourIndex + i],
          wind: Math.round(data.hourly.windspeed_10m[hourIndex + i]),
        }));

      // build 7-day daily
      const daily = data.daily.time.map((d, i) => ({
        date: d,
        high: Math.round(data.daily.temperature_2m_max[i]),
        low: Math.round(data.daily.temperature_2m_min[i]),
        cloud: data.daily.cloudcover_mean[i],
        wind: Math.round(data.daily.windspeed_10m_max[i]),
      }));

      setWeather({
        current: {
          temp: Math.round(data.current_weather.temperature),
          wind: Math.round(data.current_weather.windspeed),
          cloud: data.hourly.cloudcover[hourIndex],
          high: Math.round(data.daily.temperature_2m_max[0]),
          low: Math.round(data.daily.temperature_2m_min[0]),
        },
        hourly: hourlySlice,
        daily,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const sky = weather ? getSkyInfo(weather.current.cloud) : null;

  return (
    <div style={{ maxWidth: 420, fontFamily: "sans-serif", padding: "1rem" }}>
      <button onClick={handleLocate} disabled={loading}>
        {loading ? "Locating..." : "Check my sky"}
      </button>

      {error && <p style={{ color: "red", marginTop: 8 }}>{error}</p>}

      {weather && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>

          {/* CURRENT CONDITIONS CARD */}
          <div style={{ background: "#fff", border: "0.5px solid #ddd", borderRadius: 12, padding: "1.25rem" }}>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 6 }}>Now</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: 56, fontWeight: 500, lineHeight: 1 }}>{weather.current.temp}°</div>
                <div style={{ fontSize: 14, color: "#888", marginTop: 4 }}>{sky.label} · {weather.current.cloud}% cloud</div>
                <div style={{ fontSize: 14, color: "#888", marginTop: 2 }}>Wind {weather.current.wind} km/h</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 32 }}>{sky.icon}</div>
                <div style={{ fontSize: 13, color: "#888", marginTop: 8 }}>H: {weather.current.high}° &nbsp; L: {weather.current.low}°</div>
              </div>
            </div>
          </div>

          {/* HOURLY CARD */}
          <div style={{ background: "#fff", border: "0.5px solid #ddd", borderRadius: 12, padding: "1.25rem" }}>
            <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Hourly forecast</div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {weather.hourly.map((h, i) => {
                const { icon } = getSkyInfo(h.cloud);
                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 48 }}>
                    <div style={{ fontSize: 11, color: "#888" }}>{i === 0 ? "Now" : formatHour(h.time)}</div>
                    <div style={{ fontSize: 16 }}>{icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{h.temp}°</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* WEEKLY CARD */}
          <div style={{ background: "#fff", border: "0.5px solid #ddd", borderRadius: 12, padding: "1.25rem" }}>
            <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>7-day forecast</div>
            {weather.daily.map((d, i) => {
              const { icon } = getSkyInfo(d.cloud);
              const allHighs = weather.daily.map(x => x.high);
              const allLows = weather.daily.map(x => x.low);
              const minTemp = Math.min(...allLows);
              const maxTemp = Math.max(...allHighs);
              const range = maxTemp - minTemp || 1;
              const barLeft = ((d.low - minTemp) / range) * 100;
              const barWidth = ((d.high - d.low) / range) * 100;

              return (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: i < 6 ? "0.5px solid #eee" : "none" }}>
                  <div style={{ fontSize: 14, width: 44 }}>{formatDay(d.date, i)}</div>
                  <div style={{ fontSize: 15, width: 24, textAlign: "center" }}>{icon}</div>
                  <div style={{ flex: 1, margin: "0 10px", position: "relative", height: 6, background: "#eee", borderRadius: 3 }}>
                    <div style={{ position: "absolute", left: `${barLeft}%`, width: `${barWidth}%`, height: 6, borderRadius: 3, background: "#f5a623" }} />
                  </div>
                  <div style={{ display: "flex", gap: 8, fontSize: 13 }}>
                    <span style={{ color: "#888" }}>{d.low}°</span>
                    <span style={{ fontWeight: 500 }}>{d.high}°</span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
}