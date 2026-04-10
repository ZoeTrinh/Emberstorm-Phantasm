import { useState } from "react";
import { getUserLocation } from "../utils/Gps";

function getSkyInfo(cloudcover = 0) {
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

function formatShortTime(timeStr) {
  return new Date(timeStr).toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatVisibility(meters) {
  if (meters == null) return "—";
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${meters} m`;
}

function getViewingConditions({ cloud = 0, visibility = 0, rain = 0, isDay = 1 }) {
  if (!isDay) {
    return { label: "Night viewing", note: "Check cloud and visibility" };
  }
  if (rain > 0 || visibility < 5000 || cloud > 75) {
    return { label: "Poor", note: "Cloud, rain, or low visibility" };
  }
  if (visibility < 10000 || cloud > 40) {
    return { label: "Fair", note: "Some obstruction possible" };
  }
  return { label: "Good", note: "Clearer viewing conditions" };
}

async function fetchWeatherData(lat, lng) {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m,precipitation,rain,is_day` +
      `&hourly=temperature_2m,relative_humidity_2m,cloud_cover,visibility,wind_speed_10m,precipitation,rain` +
      `&daily=temperature_2m_max,temperature_2m_min,cloud_cover_mean,wind_speed_10m_max,sunrise,sunset,uv_index_max,rain_sum,precipitation_probability_max` +
      `&timezone=auto` +
      `&forecast_days=7`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch weather data.");
  }

  return res.json();
}

async function geocodeLocation(query) {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      query
    )}&count=1&language=en&format=json`
  );

  if (!res.ok) {
    throw new Error("Failed to search location.");
  }

  const data = await res.json();

  if (!data.results || data.results.length === 0) {
    throw new Error("Location not found.");
  }

  const place = data.results[0];
  return {
    name: `${place.name}${place.admin1 ? `, ${place.admin1}` : ""}, ${place.country_code}`,
    lat: place.latitude,
    lng: place.longitude,
  };
}

export default function WeatherTracker() {
  const [weather, setWeather] = useState(null);
  const [locationName, setLocationName] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  function buildWeatherState(data, locationLabel) {
    const nowHour = new Date().toISOString().slice(0, 13);
    let hourIndex = data.hourly.time.findIndex((t) => t.startsWith(nowHour));

    if (hourIndex === -1) {
      hourIndex = 0;
    }

    const hourlySlice = data.hourly.time.slice(hourIndex, hourIndex + 24).map((t, i) => ({
      time: t,
      temp: Math.round(data.hourly.temperature_2m[hourIndex + i]),
      humidity: data.hourly.relative_humidity_2m[hourIndex + i],
      cloud: data.hourly.cloud_cover[hourIndex + i],
      visibility: data.hourly.visibility[hourIndex + i],
      wind: Math.round(data.hourly.wind_speed_10m[hourIndex + i]),
      rain: data.hourly.rain[hourIndex + i],
      precipitation: data.hourly.precipitation[hourIndex + i],
    }));

    const daily = data.daily.time.map((d, i) => ({
      date: d,
      high: Math.round(data.daily.temperature_2m_max[i]),
      low: Math.round(data.daily.temperature_2m_min[i]),
      cloud: data.daily.cloud_cover_mean[i],
      wind: Math.round(data.daily.wind_speed_10m_max[i]),
      sunrise: data.daily.sunrise[i],
      sunset: data.daily.sunset[i],
      uv: data.daily.uv_index_max[i],
      rain: data.daily.rain_sum[i],
      rainChance: data.daily.precipitation_probability_max[i],
    }));

    const current = {
      temp: Math.round(data.current.temperature_2m),
      humidity: data.current.relative_humidity_2m,
      wind: Math.round(data.current.wind_speed_10m),
      cloud: data.current.cloud_cover,
      rain: data.current.rain,
      precipitation: data.current.precipitation,
      isDay: data.current.is_day,
      visibility: data.hourly.visibility[hourIndex],
      high: Math.round(data.daily.temperature_2m_max[0]),
      low: Math.round(data.daily.temperature_2m_min[0]),
    };

    setLocationName(locationLabel);
    setWeather({
      current,
      hourly: hourlySlice,
      daily,
    });
  }

  async function handleLocate() {
    setLoading(true);
    setError(null);

    try {
      const { lat, lng } = await getUserLocation();
      const data = await fetchWeatherData(lat, lng);
      buildWeatherState(data, "My location");
    } catch (err) {
      setError(err.message || "Could not get your location.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    if (!query.trim()) {
      setError("Please enter a location.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const place = await geocodeLocation(query);
      const data = await fetchWeatherData(place.lat, place.lng);
      buildWeatherState(data, place.name);
    } catch (err) {
      setError(err.message || "Could not search that location.");
    } finally {
      setLoading(false);
    }
  }

  const sky = weather ? getSkyInfo(weather.current.cloud) : null;
  const viewing = weather ? getViewingConditions(weather.current) : null;

  return (
    <div style={{ maxWidth: 520, fontFamily: "sans-serif", padding: "1rem" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter suburb or city"
          style={{
            flex: 1,
            minWidth: 180,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #ccc",
          }}
        />
        <button onClick={handleSearch} disabled={loading}>
          Search
        </button>
        <button onClick={handleLocate} disabled={loading}>
          {loading ? "Loading..." : "Use my location"}
        </button>
      </div>

      {locationName && (
        <div style={{ fontSize: 14, color: "#666", marginBottom: 10 }}>
          Showing forecast for: <strong>{locationName}</strong>
        </div>
      )}

      {error && <p style={{ color: "red", marginTop: 8 }}>{error}</p>}

      {weather && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          <div
            style={{
              background: "#fff",
              border: "0.5px solid #ddd",
              borderRadius: 12,
              padding: "1.25rem",
            }}
          >
            <div style={{ fontSize: 13, color: "#888", marginBottom: 6 }}>Current conditions</div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontSize: 56, fontWeight: 500, lineHeight: 1 }}>
                  {weather.current.temp}°
                </div>
                <div style={{ fontSize: 14, color: "#888", marginTop: 4 }}>
                  {sky.label} · {weather.current.cloud}% cloud
                </div>
                <div style={{ fontSize: 14, color: "#888", marginTop: 2 }}>
                  Wind {weather.current.wind} km/h
                </div>
                <div style={{ fontSize: 14, color: "#888", marginTop: 2 }}>
                  Humidity {weather.current.humidity}%
                </div>
                <div style={{ fontSize: 14, color: "#888", marginTop: 2 }}>
                  Visibility {formatVisibility(weather.current.visibility)}
                </div>
                <div style={{ fontSize: 14, color: "#888", marginTop: 2 }}>
                  Rain {weather.current.rain} mm
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 32 }}>{sky.icon}</div>
                <div style={{ fontSize: 13, color: "#888", marginTop: 8 }}>
                  H: {weather.current.high}° &nbsp; L: {weather.current.low}°
                </div>
                <div
                  style={{
                    fontSize: 13,
                    marginTop: 10,
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: "#07094f",
                    display: "inline-block",
                  }}
                >
                  Viewing: <strong>{viewing.label}</strong>
                </div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 6 }}>{viewing.note}</div>
              </div>
            </div>
          </div>

          <div
            style={{
              background: "#fff",
              border: "0.5px solid #ddd",
              borderRadius: 12,
              padding: "1.25rem",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#888",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 10,
              }}
            >
              Next 24 hours
            </div>

            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
              {weather.hourly.map((h, i) => {
                const { icon } = getSkyInfo(h.cloud);
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      minWidth: 70,
                      padding: "6px 4px",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#888" }}>
                      {i === 0 ? "Now" : formatHour(h.time)}
                    </div>
                    <div style={{ fontSize: 16 }}>{icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{h.temp}°</div>
                    <div style={{ fontSize: 11, color: "#888" }}>{h.cloud}% cloud</div>
                    <div style={{ fontSize: 11, color: "#888" }}>{h.rain} mm rain</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              background: "#fff",
              border: "0.5px solid #ddd",
              borderRadius: 12,
              padding: "1.25rem",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#888",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 10,
              }}
            >
              7-day forecast
            </div>

            {weather.daily.map((d, i) => {
              const { icon } = getSkyInfo(d.cloud);
              const allHighs = weather.daily.map((x) => x.high);
              const allLows = weather.daily.map((x) => x.low);
              const minTemp = Math.min(...allLows);
              const maxTemp = Math.max(...allHighs);
              const range = maxTemp - minTemp || 1;
              const barLeft = ((d.low - minTemp) / range) * 100;
              const barWidth = ((d.high - d.low) / range) * 100;

              return (
                <div
                  key={i}
                  style={{
                    padding: "10px 0",
                    borderBottom: i < weather.daily.length - 1 ? "0.5px solid #eee" : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <div style={{ fontSize: 14, width: 50 }}>{formatDay(d.date, i)}</div>
                    <div style={{ fontSize: 15, width: 24, textAlign: "center" }}>{icon}</div>

                    <div
                      style={{
                        flex: 1,
                        margin: "0 10px",
                        position: "relative",
                        height: 6,
                        background: "#eee",
                        borderRadius: 3,
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: `${barLeft}%`,
                          width: `${barWidth}%`,
                          height: 6,
                          borderRadius: 3,
                          background: "#f5a623",
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", gap: 8, fontSize: 13 }}>
                      <span style={{ color: "#888" }}>{d.low}°</span>
                      <span style={{ fontWeight: 500 }}>{d.high}°</span>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      color: "#777",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <span>Cloud {d.cloud}%</span>
                    <span>Wind {d.wind} km/h</span>
                    <span>Rain {d.rain} mm</span>
                    <span>UV {d.uv}</span>
                    <span>Rain chance {d.rainChance}%</span>
                    <span>Sunrise {formatShortTime(d.sunrise)}</span>
                    <span>Sunset {formatShortTime(d.sunset)}</span>
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