import { useEffect, useMemo, useState } from "react";
import { getUserLocation } from "../utils/Gps";
import "./WeatherTracker.css";

function getSkyInfo(cloudcover = 0) {
  if (cloudcover <= 20) return { label: "Clear",         icon: "☀️" };
  if (cloudcover <= 50) return { label: "Partly Cloudy", icon: "⛅" };
  if (cloudcover <= 80) return { label: "Mostly Cloudy", icon: "🌥️" };
  return                       { label: "Overcast",      icon: "☁️" };
}
function formatHour(timeStr) {
  const h = new Date(timeStr).getHours();
  if (h === 0) return "12am"; if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}
function formatDay(dateStr, index) {
  if (index === 0) return "Today";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-AU", { weekday: "short" });
}
function formatShortTime(timeStr) {
  return new Date(timeStr).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}
function formatVisibility(meters) {
  if (meters == null) return "—";
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
}
function getViewingConditions({ cloud = 0, visibility = 0, rain = 0 }) {
  if (rain > 0 || visibility < 5000 || cloud > 75) return { label: "Poor", note: "Cloud, rain, or low visibility" };
  if (visibility < 10000 || cloud > 40)            return { label: "Fair", note: "Some obstruction possible" };
  return                                                  { label: "Good", note: "Clearer viewing conditions" };
}
async function fetchWeatherData(lat, lng) {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m,precipitation,rain,is_day` +
    `&hourly=temperature_2m,relative_humidity_2m,cloud_cover,visibility,wind_speed_10m,precipitation,rain` +
    `&daily=temperature_2m_max,temperature_2m_min,cloud_cover_mean,wind_speed_10m_max,sunrise,sunset,uv_index_max,rain_sum,precipitation_probability_max` +
    `&timezone=auto&forecast_days=7`
  );
  if (!res.ok) throw new Error("Failed to fetch weather data.");
  return res.json();
}
async function geocodeLocation(query) {
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
  if (!res.ok) throw new Error("Failed to search location.");
  const data = await res.json();
  if (!data.results?.length) throw new Error("Location not found.");
  const p = data.results[0];
  return { name: `${p.name}${p.admin1 ? `, ${p.admin1}` : ""}, ${p.country_code}`, lat: p.latitude, lng: p.longitude };
}

function WindBars() {
  const heights = [0.25, 0.5, 0.4, 0.7, 0.55, 0.9, 0.65, 0.8, 0.45, 0.72, 0.6, 0.85];
  return <div className="wt-wind-bars">{heights.map((h, i) => <div key={i} className="wt-wind-bar" style={{ height: `${h * 100}%` }} />)}</div>;
}

function UvGauge({ value }) {
  const max = 12; const pct = Math.min(value / max, 1);
  const cx = 50, cy = 46, r = 38;
  const toXY = (a) => ({ x: cx + r * Math.cos(a * Math.PI / 180), y: cy - r * Math.sin(a * Math.PI / 180) });
  const start = toXY(180); const sweepAngle = 180 - 180 * pct; const end = toXY(sweepAngle); const large = pct > 0.5 ? 1 : 0;
  const uvLabel = value <= 2 ? "Low" : value <= 5 ? "Moderate" : value <= 7 ? "High" : value <= 10 ? "Very High" : "Extreme";
  return (
    <div className="wt-uv-wrap"><div className="wt-uv-svg-wrap">
      <svg viewBox="0 0 100 54" fill="none">
        <defs><linearGradient id="uvGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#5bc8e8" /><stop offset="50%" stopColor="#f5c842" /><stop offset="100%" stopColor="#f55a23" /></linearGradient></defs>
        <path d={`M ${toXY(180).x} ${toXY(180).y} A ${r} ${r} 0 0 1 ${toXY(0).x} ${toXY(0).y}`} stroke="rgba(255,255,255,0.07)" strokeWidth="8" strokeLinecap="round" fill="none" />
        {pct > 0 && <path d={`M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`} stroke="url(#uvGrad)" strokeWidth="8" strokeLinecap="round" fill="none" />}
        <text x={cx} y={cy - 5} textAnchor="middle" fill="#f0f4ff" fontSize="16" fontFamily="'Barlow Condensed',sans-serif">{value}</text>
        <text x={cx} y={cy + 9} textAnchor="middle" fill="rgba(192,132,252,0.5)" fontSize="8" fontFamily="'Barlow Condensed',sans-serif">{uvLabel}</text>
      </svg>
    </div></div>
  );
}

function SunBar({ sunrise, sunset }) {
  const pct = Math.max(0, Math.min(1, (Date.now() - new Date(sunrise).getTime()) / (new Date(sunset).getTime() - new Date(sunrise).getTime()))) * 100;
  return (
    <>
      <div className="wt-sun-bar"><div className="wt-sun-dot" style={{ left: `${pct}%` }} /></div>
      <div className="wt-sun-times">
        <span>Sunrise {formatShortTime(sunrise)}</span>
        <span>Sunset {formatShortTime(sunset)}</span>
      </div>
    </>
  );
}

function tempSpectrumColor(temp, minTemp, maxTemp) {
  const t = (temp - minTemp) / ((maxTemp - minTemp) || 1);
  return `rgb(${Math.round(40 + t * 215)}, ${Math.round(100 - t * 60)}, ${Math.round(220 - t * 190)})`;
}

/* Main component */
export default function WeatherTracker({ onWeatherLoad, autoLocation, onLocationGranted }) {
  const [weather, setWeather]           = useState(null);
  const [rawForecast, setRawForecast]   = useState(null);
  const [locationName, setLocationName] = useState("");
  const [query, setQuery]               = useState("");
  const [error, setError]               = useState(null);
  const [loading, setLoading]           = useState(false);
  const [autoLoaded, setAutoLoaded]     = useState(false);
  const [now, setNow]                   = useState(new Date());

  /* Live clock — updates every minute so hourly cards re-align when a new hour starts */
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  function buildWeatherState(data, label) {
    setRawForecast(data);

    const current = {
      temp:          Math.round(data.current.temperature_2m),
      humidity:      data.current.relative_humidity_2m,
      wind:          Math.round(data.current.wind_speed_10m),
      cloud:         data.current.cloud_cover,
      rain:          data.current.rain,
      precipitation: data.current.precipitation,
      isDay:         data.current.is_day,
      high:          Math.round(data.daily.temperature_2m_max[0]),
      low:           Math.round(data.daily.temperature_2m_min[0]),
    };

    const daily = data.daily.time.map((d, i) => ({
      date:       d,
      high:       Math.round(data.daily.temperature_2m_max[i]),
      low:        Math.round(data.daily.temperature_2m_min[i]),
      cloud:      data.daily.cloud_cover_mean[i],
      wind:       Math.round(data.daily.wind_speed_10m_max[i]),
      sunrise:    data.daily.sunrise[i],
      sunset:     data.daily.sunset[i],
      uv:         data.daily.uv_index_max[i],
      rain:       data.daily.rain_sum[i],
      rainChance: data.daily.precipitation_probability_max[i],
    }));

    setLocationName(label);
    setWeather({ current, daily });
  }

  /* Recalculate the visible 24-hour forecast every time the raw data or clock changes */
  const liveHourly = useMemo(() => {
    if (!rawForecast) return [];

    // Use the API's utc_offset_seconds to find the correct local time for the
    // forecast location, regardless of the browser's own timezone.
    const utcOffsetMs    = (rawForecast.utc_offset_seconds ?? 0) * 1000;
    const localNow       = new Date(now.getTime() + utcOffsetMs);
    const currentHourKey = localNow.toISOString().slice(0, 13);

    let hourIndex = rawForecast.hourly.time.findIndex((t) => t.startsWith(currentHourKey));

    if (hourIndex === -1) {
      hourIndex = rawForecast.hourly.time.findIndex(
        (t) => new Date(t).getTime() + utcOffsetMs >= localNow.getTime()
      );
    }
    if (hourIndex === -1) hourIndex = 0;

    return rawForecast.hourly.time
      .slice(hourIndex, hourIndex + 24)
      .map((t, i) => ({
        time:          t,
        temp:          Math.round(rawForecast.hourly.temperature_2m[hourIndex + i]),
        humidity:      rawForecast.hourly.relative_humidity_2m[hourIndex + i],
        cloud:         rawForecast.hourly.cloud_cover[hourIndex + i],
        visibility:    rawForecast.hourly.visibility[hourIndex + i],
        wind:          Math.round(rawForecast.hourly.wind_speed_10m[hourIndex + i]),
        rain:          rawForecast.hourly.rain[hourIndex + i],
        precipitation: rawForecast.hourly.precipitation[hourIndex + i],
        isNow:         i === 0,
      }))
      .filter((item) => item.time);
  }, [rawForecast, now]);

  const liveCurrentVisibility = liveHourly[0]?.visibility ?? null;

  /* Notify parent whenever liveHourly changes after a fetch */
  useEffect(() => {
    if (liveHourly.length > 0) onWeatherLoad?.(liveHourly);
  }, [liveHourly]);

  /* Auto-load when GPS coords arrive from parent */
  useEffect(() => {
    if (autoLocation && !autoLoaded) {
      setAutoLoaded(true);
      setLoading(true);
      setError(null);
      fetchWeatherData(autoLocation.lat, autoLocation.lng)
        .then((data) => buildWeatherState(data, "My Location"))
        .catch((err) => setError(err.message || "Could not load weather."))
        .finally(() => setLoading(false));
    }
  }, [autoLocation, autoLoaded]);

  async function handleLocate() {
    setLoading(true); setError(null);
    try {
      const { lat, lng } = await getUserLocation();
      const data = await fetchWeatherData(lat, lng);
      buildWeatherState(data, "My Location");
      onLocationGranted?.({ lat, lng });
    } catch (err) { setError(err.message || "Could not get your location."); }
    finally { setLoading(false); }
  }

  async function handleSearch() {
    if (!query.trim()) { setError("Please enter a location."); return; }
    setLoading(true); setError(null);
    try {
      const place = await geocodeLocation(query);
      const data  = await fetchWeatherData(place.lat, place.lng);
      buildWeatherState(data, place.name);
    } catch (err) { setError(err.message || "Could not search that location."); }
    finally { setLoading(false); }
  }

  const sky      = weather ? getSkyInfo(weather.current.cloud) : null;
  const viewing  = weather ? getViewingConditions({ ...weather.current, visibility: liveCurrentVisibility ?? 0 }) : null;
  const today    = weather?.daily[0];
  const allHighs = weather?.daily.map((x) => x.high) ?? [];
  const allLows  = weather?.daily.map((x) => x.low)  ?? [];
  const minTemp  = Math.min(...allLows);
  const maxTemp  = Math.max(...allHighs);
  const tempRange = maxTemp - minTemp || 1;

  return (
    <div className="wt-page">
      <header className="wt-header">
        <div className="wt-logo">⬡ Celestial Forecast</div>
        <div className="wt-search-row">
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Enter suburb or city" className="wt-input" />
          <button className="wt-btn" onClick={handleSearch} disabled={loading}>Search</button>
          <button className="wt-btn" onClick={handleLocate} disabled={loading}>{loading ? "Locating…" : "📍 My Location"}</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
          {locationName && <div className="wt-location-tag">📌 <strong>{locationName}</strong></div>}
          {error && <div className="wt-error">{error}</div>}
        </div>
      </header>

      {!weather && loading && (
        <div className="wt-empty">
          <div className="wt-empty-icon" style={{ animation: "wt-spin 2s linear infinite", display: "inline-block" }}>✦</div>
          <div className="wt-empty-label">Fetching your sky…</div>
        </div>
      )}
      {!weather && !loading && (
        <div className="wt-empty">
          <div className="wt-empty-icon">🌌</div>
          <div className="wt-empty-label">Enter a location or allow GPS to begin</div>
        </div>
      )}

      {weather && (
        <div className="wt-dashboard">

          {/* Hero temperature card */}
          <div className="wt-col-left">
            <div className="wt-hero-card">
              <div className="wt-card-label">Current Conditions</div>
              <div className="wt-hero-top"><div className="wt-hero-sky-icon">{sky.icon}</div></div>
              <div className="wt-hero-center">
                <div className="wt-hero-temp">{weather.current.temp}°</div>
                <div className="wt-hero-desc">{sky.label}</div>
                <div className="wt-hero-hl">H {weather.current.high}° · L {weather.current.low}°</div>
              </div>
              <div className="wt-hero-divider" />
              <div className="wt-hero-meta-grid">
                <div className="wt-hero-meta-item">💨 Wind <span>{weather.current.wind} km/h</span></div>
                <div className="wt-hero-meta-item">💧 Humidity <span>{weather.current.humidity}%</span></div>
                <div className="wt-hero-meta-item">👁 Visibility <span>{formatVisibility(liveCurrentVisibility)}</span></div>
                <div className="wt-hero-meta-item">🌧 Rain <span>{weather.current.rain} mm</span></div>
                <div className="wt-hero-meta-item">☁️ Cloud <span>{weather.current.cloud}%</span></div>
                <div className="wt-hero-meta-item">🌡 Precip <span>{weather.current.precipitation} mm</span></div>
              </div>
              <div className="wt-viewing-badge">Viewing: <strong>{viewing.label}</strong></div>
              <div className="wt-viewing-note">{viewing.note}</div>
            </div>
          </div>

          {/* Right column */}
          <div className="wt-col-right">

            {/* Four stat cards */}
            <div className="wt-stats-grid">
              <div className="wt-card">
                <div className="wt-card-label">Humidity</div>
                <div className="wt-stat-value">{weather.current.humidity}<span className="wt-stat-unit">%</span></div>
                <div className="wt-stat-note">{weather.current.humidity < 30 ? "Dry air" : weather.current.humidity < 60 ? "Comfortable" : "Humid"}</div>
              </div>
              <div className="wt-card">
                <div className="wt-card-label">Visibility</div>
                <div className="wt-stat-value" style={{ fontSize: 28 }}>{formatVisibility(liveCurrentVisibility)}</div>
                <div className="wt-stat-note">{liveCurrentVisibility >= 10000 ? "Clear" : liveCurrentVisibility >= 5000 ? "Moderate" : "Low"}</div>
              </div>
              <div className="wt-card">
                <div className="wt-card-label">Rain Today</div>
                <div className="wt-stat-value">{today.rain}<span className="wt-stat-unit"> mm</span></div>
                <div className="wt-stat-note">{today.rainChance}% chance</div>
              </div>
              <div className="wt-card">
                <div className="wt-card-label">Cloud Cover</div>
                <div className="wt-stat-value">{weather.current.cloud}<span className="wt-stat-unit">%</span></div>
                <div className="wt-stat-note">{sky.label}</div>
              </div>
            </div>

            {/* Highlights */}
            <div className="wt-highlights-grid">
              <div className="wt-card">
                <div className="wt-card-label">Wind Status</div>
                <WindBars />
                <div className="wt-stat-value">{weather.current.wind}<span className="wt-stat-unit"> km/h</span></div>
                <div className="wt-stat-note">Max today · {today.wind} km/h</div>
              </div>
              <div className="wt-card">
                <div className="wt-card-label">UV Index</div>
                <UvGauge value={today.uv} />
                <div className="wt-stat-note" style={{ textAlign: "center" }}>Today's maximum</div>
              </div>
              <div className="wt-card">
                <div className="wt-card-label">Sunrise & Sunset</div>
                <SunBar sunrise={today.sunrise} sunset={today.sunset} />
                <div className="wt-stat-note" style={{ marginTop: 8 }}>
                  Day length ·{" "}
                  {(() => { const mins = Math.round((new Date(today.sunset) - new Date(today.sunrise)) / 60000); return `${Math.floor(mins / 60)}h ${mins % 60}m`; })()}
                </div>
              </div>
            </div>

            {/* Hourly */}
            <div className="wt-card">
              <div className="wt-card-label">Next 24 Hours</div>
              <div className="wt-hourly-scroll">
                {liveHourly.map((h) => {
                  const { icon } = getSkyInfo(h.cloud);
                  return (
                    <div key={h.time} className={`wt-hour-cell${h.isNow ? " wt-hour-now" : ""}`}>
                      <div className="wt-hour-label">{h.isNow ? "Now" : formatHour(h.time)}</div>
                      <div className="wt-hour-icon">{icon}</div>
                      <div className="wt-hour-temp">{h.temp}°</div>
                      <div className="wt-hour-meta">{h.cloud}% ☁</div>
                      <div className="wt-hour-meta">{h.rain} mm</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 7-day */}
            <div className="wt-card">
              <div className="wt-card-label">7-Day Forecast</div>
              <div className="wt-daily-grid">
                {weather.daily.map((d, i) => {
                  const { icon } = getSkyInfo(d.cloud);
                  const barLeft   = ((d.low  - minTemp) / tempRange) * 100;
                  const barWidth  = ((d.high - d.low)   / tempRange) * 100;
                  const fillColor = tempSpectrumColor((d.high + d.low) / 2, minTemp, maxTemp);
                  return (
                    <div key={i} className={`wt-day-cell${i === 0 ? " wt-day-today" : ""}`}>
                      <div className="wt-day-name">{formatDay(d.date, i)}</div>
                      <div className="wt-day-icon">{icon}</div>
                      <div className="wt-day-high">{d.high}°</div>
                      <div className="wt-day-bar-track">
                        <div className="wt-day-bar-fill" style={{ left: `${barLeft}%`, width: `${barWidth}%`, background: fillColor, boxShadow: `0 0 6px ${fillColor}88` }} />
                      </div>
                      <div className="wt-day-low">{d.low}°</div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}