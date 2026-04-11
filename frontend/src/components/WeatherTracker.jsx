import { useState } from "react";
import { getUserLocation } from "../utils/Gps";
import "./WeatherTracker.css";

/* Sky condition helper */
function getSkyInfo(cloudcover = 0) {
  if (cloudcover <= 20) return { label: "Clear", icon: "☀️" };
  if (cloudcover <= 50) return { label: "Partly Cloudy", icon: "⛅" };
  if (cloudcover <= 80) return { label: "Mostly Cloudy", icon: "🌥️" };
  return { label: "Overcast", icon: "☁️" };
}

/* Format hour label */
function formatHour(timeStr) {
  const date = new Date(timeStr);
  const h = date.getHours();
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

/* Format short day name */
function formatDay(dateStr, index) {
  if (index === 0) return "Today";
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-AU", { weekday: "short" });
}

/* Format time string to readable time */
function formatShortTime(timeStr) {
  return new Date(timeStr).toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/* Format visibility meters to km or m */
function formatVisibility(meters) {
  if (meters == null) return "—";
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${meters} m`;
}

/* Determine sky viewing quality */
function getViewingConditions({ cloud = 0, visibility = 0, rain = 0, isDay = 1 }) {
  if (!isDay) return { label: "Night Viewing", note: "Check cloud and visibility" };
  if (rain > 0 || visibility < 5000 || cloud > 75) return { label: "Poor", note: "Cloud, rain, or low visibility" };
  if (visibility < 10000 || cloud > 40) return { label: "Fair", note: "Some obstruction possible" };
  return { label: "Good", note: "Clearer viewing conditions" };
}

/* Fetch 7-day forecast from open-meteo */
async function fetchWeatherData(lat, lng) {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m,precipitation,rain,is_day` +
      `&hourly=temperature_2m,relative_humidity_2m,cloud_cover,visibility,wind_speed_10m,precipitation,rain` +
      `&daily=temperature_2m_max,temperature_2m_min,cloud_cover_mean,wind_speed_10m_max,sunrise,sunset,uv_index_max,rain_sum,precipitation_probability_max` +
      `&timezone=auto&forecast_days=7`
  );
  if (!res.ok) throw new Error("Failed to fetch weather data.");
  return res.json();
}

/* Geocode a place name to lat lng */
async function geocodeLocation(query) {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`
  );
  if (!res.ok) throw new Error("Failed to search location.");
  const data = await res.json();
  if (!data.results || data.results.length === 0) throw new Error("Location not found.");
  const place = data.results[0];
  return {
    name: `${place.name}${place.admin1 ? `, ${place.admin1}` : ""}, ${place.country_code}`,
    lat: place.latitude,
    lng: place.longitude,
  };
}

/* Wind bar chart visual using hourly wind speeds */
function WindBars({ speed }) {
  const heights = [0.25, 0.5, 0.4, 0.7, 0.55, 0.9, 0.65, 0.8, 0.45, 0.72, 0.6, 0.85];
  return (
    <div className="wt-wind-bars">
      {heights.map((h, i) => (
        <div key={i} className="wt-wind-bar" style={{ height: `${h * 100}%` }} />
      ))}
    </div>
  );
}

/* UV index arc gauge using SVG */
function UvGauge({ value }) {
  const max = 12;
  const pct = Math.min(value / max, 1);

  /* Arc from left to right across a 180 degree sweep */
  const cx = 50;
  const cy = 46;
  const r  = 38;
  const startAngle = 180;
  const endAngle   = 0;
  const sweepAngle = startAngle - (startAngle - endAngle) * pct;

  const toXY = (angleDeg) => {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy - r * Math.sin(rad),
    };
  };

  const start = toXY(180);
  const end   = toXY(sweepAngle);
  const large = pct > 0.5 ? 1 : 0;

  const uvLabel =
    value <= 2 ? "Low" :
    value <= 5 ? "Moderate" :
    value <= 7 ? "High" :
    value <= 10 ? "Very High" : "Extreme";

  return (
    <div className="wt-uv-wrap">
      <div className="wt-uv-svg-wrap">
        <svg viewBox="0 0 100 54" fill="none">
          <defs>
            <linearGradient id="uvGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#5bc8e8" />
              <stop offset="50%"  stopColor="#f5c842" />
              <stop offset="100%" stopColor="#f55a23" />
            </linearGradient>
          </defs>
          {/* Background arc track */}
          <path
            d={`M ${toXY(180).x} ${toXY(180).y} A ${r} ${r} 0 0 1 ${toXY(0).x} ${toXY(0).y}`}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
          {/* Filled arc */}
          {pct > 0 && (
            <path
              d={`M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`}
              stroke="url(#uvGrad)"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
            />
          )}
          {/* Center value text */}
          <text x={cx} y={cy - 5} textAnchor="middle" fill="#ddeeff" fontSize="16" fontFamily="'Barlow Condensed',sans-serif" fontWeight="400">
            {value}
          </text>
          <text x={cx} y={cy + 9} textAnchor="middle" fill="rgba(120,160,210,0.5)" fontSize="8" fontFamily="'Barlow Condensed',sans-serif">
            {uvLabel}
          </text>
        </svg>
      </div>
    </div>
  );
}

/* Sunrise and sunset position bar */
function SunBar({ sunrise, sunset }) {
  const now  = Date.now();
  const rise = new Date(sunrise).getTime();
  const set  = new Date(sunset).getTime();
  const pct  = Math.max(0, Math.min(1, (now - rise) / (set - rise))) * 100;
  return (
    <>
      <div className="wt-sun-bar">
        <div className="wt-sun-dot" style={{ left: `${pct}%` }} />
      </div>
      <div className="wt-sun-times">
        <span>🌅 {formatShortTime(sunrise)}</span>
        <span>🌇 {formatShortTime(sunset)}</span>
      </div>
    </>
  );
}

/* Blue to red temperature spectrum colour for bar fill */
function tempSpectrumColor(temp, minTemp, maxTemp) {
  const range = maxTemp - minTemp || 1;
  const t = (temp - minTemp) / range;

  /* Interpolate from cold blue through purple to warm red */
  const r = Math.round(40  + t * 215);
  const g = Math.round(100 - t * 60);
  const b = Math.round(220 - t * 190);
  return `rgb(${r}, ${g}, ${b})`;
}

/* Main component */
export default function WeatherTracker() {
  const [weather, setWeather]           = useState(null);
  const [locationName, setLocationName] = useState("");
  const [query, setQuery]               = useState("");
  const [error, setError]               = useState(null);
  const [loading, setLoading]           = useState(false);

  /* Build normalised weather state from API response */
  function buildWeatherState(data, locationLabel) {
    const nowHour = new Date().toISOString().slice(0, 13);
    let hourIndex = data.hourly.time.findIndex((t) => t.startsWith(nowHour));
    if (hourIndex === -1) hourIndex = 0;

    const hourlySlice = data.hourly.time.slice(hourIndex, hourIndex + 24).map((t, i) => ({
      time:        t,
      temp:        Math.round(data.hourly.temperature_2m[hourIndex + i]),
      humidity:    data.hourly.relative_humidity_2m[hourIndex + i],
      cloud:       data.hourly.cloud_cover[hourIndex + i],
      visibility:  data.hourly.visibility[hourIndex + i],
      wind:        Math.round(data.hourly.wind_speed_10m[hourIndex + i]),
      rain:        data.hourly.rain[hourIndex + i],
      precipitation: data.hourly.precipitation[hourIndex + i],
    }));

    const daily = data.daily.time.map((d, i) => ({
      date:      d,
      high:      Math.round(data.daily.temperature_2m_max[i]),
      low:       Math.round(data.daily.temperature_2m_min[i]),
      cloud:     data.daily.cloud_cover_mean[i],
      wind:      Math.round(data.daily.wind_speed_10m_max[i]),
      sunrise:   data.daily.sunrise[i],
      sunset:    data.daily.sunset[i],
      uv:        data.daily.uv_index_max[i],
      rain:      data.daily.rain_sum[i],
      rainChance: data.daily.precipitation_probability_max[i],
    }));

    const current = {
      temp:        Math.round(data.current.temperature_2m),
      humidity:    data.current.relative_humidity_2m,
      wind:        Math.round(data.current.wind_speed_10m),
      cloud:       data.current.cloud_cover,
      rain:        data.current.rain,
      precipitation: data.current.precipitation,
      isDay:       data.current.is_day,
      visibility:  data.hourly.visibility[hourIndex],
      high:        Math.round(data.daily.temperature_2m_max[0]),
      low:         Math.round(data.daily.temperature_2m_min[0]),
    };

    setLocationName(locationLabel);
    setWeather({ current, hourly: hourlySlice, daily });
  }

  /* Use browser geolocation */
  async function handleLocate() {
    setLoading(true);
    setError(null);
    try {
      const { lat, lng } = await getUserLocation();
      const data = await fetchWeatherData(lat, lng);
      buildWeatherState(data, "My Location");
    } catch (err) {
      setError(err.message || "Could not get your location.");
    } finally {
      setLoading(false);
    }
  }

  /* Search by city name */
  async function handleSearch() {
    if (!query.trim()) { setError("Please enter a location."); return; }
    setLoading(true);
    setError(null);
    try {
      const place = await geocodeLocation(query);
      const data  = await fetchWeatherData(place.lat, place.lng);
      buildWeatherState(data, place.name);
    } catch (err) {
      setError(err.message || "Could not search that location.");
    } finally {
      setLoading(false);
    }
  }

  const sky     = weather ? getSkyInfo(weather.current.cloud) : null;
  const viewing = weather ? getViewingConditions(weather.current) : null;
  const today   = weather?.daily[0];

  /* Temperature range across all 7 days for spectrum bar scaling */
  const allHighs  = weather?.daily.map((x) => x.high) ?? [];
  const allLows   = weather?.daily.map((x) => x.low)  ?? [];
  const minTemp   = Math.min(...allLows);
  const maxTemp   = Math.max(...allHighs);
  const tempRange = maxTemp - minTemp || 1;

  return (
    <div className="wt-page">

      {/* Header with logo, search and location tag */}
      <header className="wt-header">
        <div className="wt-logo">⬡ Celestial Forecast</div>

        <div className="wt-search-row">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Enter suburb or city"
            className="wt-input"
          />
          <button className="wt-btn" onClick={handleSearch} disabled={loading}>
            Search
          </button>
          <button className="wt-btn" onClick={handleLocate} disabled={loading}>
            {loading ? "Locating…" : "📍 My Location"}
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
          {locationName && (
            <div className="wt-location-tag">📌 <strong>{locationName}</strong></div>
          )}
          {error && <div className="wt-error">{error}</div>}
        </div>
      </header>

      {/* Empty state shown before any location is loaded */}
      {!weather && (
        <div className="wt-empty">
          <div className="wt-empty-icon">🌌</div>
          <div className="wt-empty-label">Enter a location to begin</div>
        </div>
      )}

      {/* Main dashboard grid */}
      {weather && (
        <div className="wt-dashboard">

          {/* Main Panel */}
          <div className="wt-col-left">

            {/* Hero temperature card */}
            <div className="wt-hero-card">
              <div className="wt-card-label">Current Conditions</div>

              <div className="wt-hero-top">
                <div className="wt-hero-sky-icon">{sky.icon}</div>
              </div>

              <div className="wt-hero-center">
                <div className="wt-hero-temp">{weather.current.temp}°</div>
                <div className="wt-hero-desc">{sky.label}</div>
                <div className="wt-hero-hl">
                  H {weather.current.high}° · L {weather.current.low}°
                </div>
              </div>

              <div className="wt-hero-divider" />

              {/* Conditions grid */}
              <div className="wt-hero-meta-grid">
                <div className="wt-hero-meta-item">💨 Wind <span>{weather.current.wind} km/h</span></div>
                <div className="wt-hero-meta-item">💧 Humidity <span>{weather.current.humidity}%</span></div>
                <div className="wt-hero-meta-item">👁 Visibility <span>{formatVisibility(weather.current.visibility)}</span></div>
                <div className="wt-hero-meta-item">🌧 Rain <span>{weather.current.rain} mm</span></div>
                <div className="wt-hero-meta-item">☁️ Cloud <span>{weather.current.cloud}%</span></div>
                <div className="wt-hero-meta-item">🌡 Precip <span>{weather.current.precipitation} mm</span></div>
              </div>

              {/* Sky viewing quality indicator */}
              <div className="wt-viewing-badge">
                Viewing: <strong>{viewing.label}</strong>
              </div>
              <div className="wt-viewing-note">{viewing.note}</div>
            </div>

          </div>

          {/* Right column: stat cards, highlights, hourly strip, 7-day forecast */}
          <div className="wt-col-right">

            {/* Four small stat cards */}
            <div className="wt-stats-grid">

              <div className="wt-card">
                <div className="wt-card-label">Humidity</div>
                <div className="wt-stat-value">
                  {weather.current.humidity}<span className="wt-stat-unit">%</span>
                </div>
                <div className="wt-stat-note">
                  {weather.current.humidity < 30 ? "Dry air" : weather.current.humidity < 60 ? "Comfortable" : "Humid"}
                </div>
              </div>

              <div className="wt-card">
                <div className="wt-card-label">Visibility</div>
                <div className="wt-stat-value" style={{ fontSize: 28 }}>
                  {formatVisibility(weather.current.visibility)}
                </div>
                <div className="wt-stat-note">
                  {weather.current.visibility >= 10000 ? "Clear" : weather.current.visibility >= 5000 ? "Moderate" : "Low"}
                </div>
              </div>

              <div className="wt-card">
                <div className="wt-card-label">Rain Today</div>
                <div className="wt-stat-value">
                  {today.rain}<span className="wt-stat-unit"> mm</span>
                </div>
                <div className="wt-stat-note">{today.rainChance}% chance</div>
              </div>

              <div className="wt-card">
                <div className="wt-card-label">Cloud Cover</div>
                <div className="wt-stat-value">
                  {weather.current.cloud}<span className="wt-stat-unit">%</span>
                </div>
                <div className="wt-stat-note">{sky.label}</div>
              </div>

            </div>

            {/* Highlights row: wind chart, UV gauge, sunrise bar */}
            <div className="wt-highlights-grid">

              <div className="wt-card">
                <div className="wt-card-label">Wind Status</div>
                <WindBars speed={weather.current.wind} />
                <div className="wt-stat-value">
                  {weather.current.wind}<span className="wt-stat-unit"> km/h</span>
                </div>
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
                  {(() => {
                    const mins = Math.round((new Date(today.sunset) - new Date(today.sunrise)) / 60000);
                    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
                  })()}
                </div>
              </div>

            </div>

            {/* Horizontally scrollable hourly forecast strip */}
            <div className="wt-card">
              <div className="wt-card-label">Next 24 Hours</div>
              <div className="wt-hourly-scroll">
                {weather.hourly.map((h, i) => {
                  const { icon } = getSkyInfo(h.cloud);
                  return (
                    <div key={i} className={`wt-hour-cell${i === 0 ? " wt-hour-now" : ""}`}>
                      <div className="wt-hour-label">{i === 0 ? "Now" : formatHour(h.time)}</div>
                      <div className="wt-hour-icon">{icon}</div>
                      <div className="wt-hour-temp">{h.temp}°</div>
                      <div className="wt-hour-meta">{h.cloud}% ☁</div>
                      <div className="wt-hour-meta">{h.rain} mm</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 7-day forecast displayed as column cards with spectrum temperature bar */}
            <div className="wt-card">
              <div className="wt-card-label">7-Day Forecast</div>
              <div className="wt-daily-grid">
                {weather.daily.map((d, i) => {
                  const { icon }  = getSkyInfo(d.cloud);
                  const barLeft   = ((d.low  - minTemp) / tempRange) * 100;
                  const barWidth  = ((d.high - d.low)   / tempRange) * 100;
                  const fillColor = tempSpectrumColor((d.high + d.low) / 2, minTemp, maxTemp);
                  return (
                    <div key={i} className={`wt-day-cell${i === 0 ? " wt-day-today" : ""}`}>
                      <div className="wt-day-name">{formatDay(d.date, i)}</div>
                      <div className="wt-day-icon">{icon}</div>
                      <div className="wt-day-high">{d.high}°</div>
                      {/* Spectrum bar representing temperature range from low to high */}
                      <div className="wt-day-bar-track">
                        <div
                          className="wt-day-bar-fill"
                          style={{
                            left:       `${barLeft}%`,
                            width:      `${barWidth}%`,
                            background: fillColor,
                            boxShadow:  `0 0 6px ${fillColor}88`,
                          }}
                        />
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