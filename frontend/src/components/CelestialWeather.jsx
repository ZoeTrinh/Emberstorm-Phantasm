import { useState, useEffect, useCallback } from "react";
import { getUserLocation } from "../utils/Gps";
import "./CelestialWeather.css";

/* ─── NASA API key (set VITE_NASA_API_KEY in your .env file) ─── */
const NASA_KEY = import.meta.env.VITE_NASA_API_KEY || "DEMO_KEY";

/* ─── Astronomy calculation helpers ─── */

/** Julian Date from JS Date */
function toJulian(date = new Date()) {
  return date.getTime() / 86400000 + 2440587.5;
}

/** Moon phase (0–1) and name from Julian date */
function getMoonPhase(date = new Date()) {
  const jd = toJulian(date);
  const cycle = 29.53058867;
  const known = 2451549.5; // known new moon Jan 6 2000
  const phase = ((jd - known) % cycle) / cycle;
  const norm = phase < 0 ? phase + 1 : phase;

  const pct = Math.round(norm * 100);
  let name, emoji;
  if (norm < 0.03 || norm >= 0.97)      { name = "New Moon";        emoji = "🌑"; }
  else if (norm < 0.22)                  { name = "Waxing Crescent"; emoji = "🌒"; }
  else if (norm < 0.28)                  { name = "First Quarter";   emoji = "🌓"; }
  else if (norm < 0.47)                  { name = "Waxing Gibbous";  emoji = "🌔"; }
  else if (norm < 0.53)                  { name = "Full Moon";       emoji = "🌕"; }
  else if (norm < 0.72)                  { name = "Waning Gibbous";  emoji = "🌖"; }
  else if (norm < 0.78)                  { name = "Last Quarter";    emoji = "🌗"; }
  else                                   { name = "Waning Crescent"; emoji = "🌘"; }

  /* Days until next full moon and new moon */
  const daysToFull = norm < 0.5
    ? Math.round((0.5 - norm) * cycle)
    : Math.round((1.5 - norm) * cycle);
  const daysToNew = norm < 1
    ? Math.round((1 - norm) * cycle)
    : 0;

  /* Illumination percentage (approx) */
  const illumination = Math.round(50 * (1 - Math.cos(2 * Math.PI * norm)));

  return { phase: norm, pct, name, emoji, daysToFull, daysToNew, illumination };
}

/** Known annual meteor showers */
const METEOR_SHOWERS = [
  { name: "Quadrantids",   peak: { m: 1,  d: 3  }, rate: 120, parent: "2003 EH1"          },
  { name: "Lyrids",        peak: { m: 4,  d: 22 }, rate: 20,  parent: "Comet Thatcher"    },
  { name: "Eta Aquariids", peak: { m: 5,  d: 6  }, rate: 60,  parent: "Comet Halley"      },
  { name: "Delta Aquariids",peak:{ m: 7,  d: 30 }, rate: 20,  parent: "Comet Machholz"    },
  { name: "Perseids",      peak: { m: 8,  d: 12 }, rate: 100, parent: "Comet Swift-Tuttle"},
  { name: "Orionids",      peak: { m: 10, d: 21 }, rate: 25,  parent: "Comet Halley"      },
  { name: "Leonids",       peak: { m: 11, d: 17 }, rate: 15,  parent: "Comet Tempel-Tuttle"},
  { name: "Geminids",      peak: { m: 12, d: 14 }, rate: 150, parent: "3200 Phaethon"     },
  { name: "Ursids",        peak: { m: 12, d: 22 }, rate: 10,  parent: "Comet Tuttle"      },
];

/** Days between two {m,d} dates (cyclical within year) */
function daysUntilPeak(peak) {
  const now  = new Date();
  const year = now.getFullYear();
  const peakDate = new Date(year, peak.m - 1, peak.d);
  if (peakDate < now) peakDate.setFullYear(year + 1);
  return Math.round((peakDate - now) / 86400000);
}

/** Activity window ±3 days around peak */
function getShowerActivity(peak) {
  const days = daysUntilPeak(peak);
  if (days <= 3)  return { label: "Active now",   color: "#4fc3f7", intensity: 1   };
  if (days <= 7)  return { label: "Coming soon",  color: "#81d4fa", intensity: 0.6 };
  if (days <= 30) return { label: "This month",   color: "#4a6fa5", intensity: 0.3 };
  return              { label: `In ${days} days`, color: "#2a3f5f", intensity: 0.1 };
}

/** Aurora probability based on latitude */
function getAuroraProbability(lat) {
  const absLat = Math.abs(lat);
  if (absLat >= 65) return { chance: 85, zone: "Auroral oval",    tip: "Look north on clear nights" };
  if (absLat >= 55) return { chance: 55, zone: "Sub-auroral",     tip: "Visible during strong storms" };
  if (absLat >= 45) return { chance: 25, zone: "Mid-latitude",    tip: "Only during G3+ geomagnetic storms" };
  if (absLat >= 35) return { chance: 8,  zone: "Low-latitude",    tip: "Rare — requires extreme G4/G5 event" };
  return                   { chance: 1,  zone: "Near equatorial", tip: "Extremely rare — major solar event needed" };
}

/* ─── NASA API fetchers ─── */

/** DONKI: geomagnetic storms in the last 30 days */
async function fetchGeomagneticStorms() {
  const end   = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const res = await fetch(
    `https://api.nasa.gov/DONKI/GST?startDate=${start}&endDate=${end}&api_key=${NASA_KEY}`
  );
  if (!res.ok) return [];
  return res.json();
}

/** DONKI: solar flares in the last 30 days */
async function fetchSolarFlares() {
  const end   = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const res = await fetch(
    `https://api.nasa.gov/DONKI/FLR?startDate=${start}&endDate=${end}&api_key=${NASA_KEY}`
  );
  if (!res.ok) return [];
  return res.json();
}

/** NASA SSD small-body close approaches (comets & asteroids) */
async function fetchCloseApproaches() {
  const res = await fetch(
    `https://api.nasa.gov/neo/rest/v1/feed/today?detailed=false&api_key=${NASA_KEY}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  const today = Object.values(data.near_earth_objects)[0] || [];
  return today
    .filter((o) => o.is_potentially_hazardous_asteroid === false)
    .slice(0, 6)
    .map((o) => ({
      name:     o.name,
      diameter: Math.round(o.estimated_diameter.meters.estimated_diameter_max),
      distance: parseFloat(o.close_approach_data[0]?.miss_distance?.lunar).toFixed(1),
      velocity: parseFloat(o.close_approach_data[0]?.relative_velocity?.kilometers_per_hour).toFixed(0),
    }));
}

/** NASA eclipse data via Horizons-style endpoint (approximation from known schedule) */
function getUpcomingEclipses() {
  /* Hard-coded upcoming eclipses (NASA publishes these years in advance).
     Update this list periodically or integrate with a live eclipse API. */
  const now = new Date();
  const eclipses = [
    { date: "2026-08-12", type: "Total Solar",   region: "Arctic, Greenland, Europe", duration: "2m18s" },
    { date: "2026-02-17", type: "Annular Solar",  region: "Antarctica",                duration: "3m57s" },
    { date: "2025-09-07", type: "Total Lunar",    region: "Americas, Europe, Africa",  duration: "84m"   },
    { date: "2025-03-14", type: "Total Lunar",    region: "Americas, Europe",           duration: "65m"   },
    { date: "2027-08-02", type: "Total Solar",    region: "N Africa, Middle East",      duration: "6m23s" },
  ];
  return eclipses
    .map((e) => ({ ...e, daysAway: Math.round((new Date(e.date) - now) / 86400000) }))
    .filter((e) => e.daysAway >= 0)
    .sort((a, b) => a.daysAway - b.daysAway)
    .slice(0, 3);
}

/* ─── Sub-components ─── */

/** Moon phase SVG disc */
function MoonDisc({ phase }) {
  /* phase 0=new, 0.5=full, 1=new again */
  const isWaxing = phase < 0.5;
  const p = isWaxing ? phase * 2 : (phase - 0.5) * 2; // 0→1 within half-cycle

  /* We draw a circle filled dark, then overlay a coloured lune on the lit side */
  const cx = 50, cy = 50, r = 40;
  /* The terminator ellipse x-radius goes from r (new) to 0 (quarter) to -r (full) */
  const ex = r * Math.abs(1 - p * 2); // 0 at quarter, r at new/full
  const lit = (isWaxing && p > 0.5) || (!isWaxing && p < 0.5);

  return (
    <svg viewBox="0 0 100 100" width="80" height="80" className="cw-moon-disc">
      <defs>
        <clipPath id="moonClip">
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      {/* Dark side */}
      <circle cx={cx} cy={cy} r={r} fill="#0d1b2e" stroke="#4a6fa5" strokeWidth="1" />
      {/* Lit portion — elliptical lune approximation */}
      <g clipPath="url(#moonClip)">
        {phase > 0.03 && phase < 0.97 && (
          <ellipse
            cx={isWaxing ? cx + ex * (p < 0.5 ? -1 : 1) : cx + ex * (p < 0.5 ? 1 : -1)}
            cy={cy}
            rx={ex === 0 ? r : r}
            ry={r}
            fill="#f5e6c8"
            opacity="0.9"
          />
        )}
        {/* Full moon */}
        {(phase >= 0.47 && phase <= 0.53) && (
          <circle cx={cx} cy={cy} r={r} fill="#f5e6c8" opacity="0.95" />
        )}
        {/* New moon (nearly invisible) */}
        {(phase < 0.03 || phase > 0.97) && (
          <circle cx={cx} cy={cy} r={r} fill="#0d1b2e" />
        )}
      </g>
      {/* Subtle crater texture */}
      <circle cx={38} cy={38} r={5} fill="none" stroke="rgba(100,80,40,0.2)" strokeWidth="0.8" />
      <circle cx={60} cy={55} r={3} fill="none" stroke="rgba(100,80,40,0.15)" strokeWidth="0.8" />
    </svg>
  );
}

/** Kp-index bar indicator */
function KpBar({ value = 0 }) {
  const max = 9;
  const segments = Array.from({ length: max }, (_, i) => i + 1);
  return (
    <div className="cw-kp-bar">
      {segments.map((s) => (
        <div
          key={s}
          className="cw-kp-seg"
          style={{
            background: s <= value
              ? s <= 3 ? "#4fc3f7" : s <= 6 ? "#81c784" : "#ef9a9a"
              : "rgba(255,255,255,0.07)",
          }}
          title={`Kp ${s}`}
        />
      ))}
      <span className="cw-kp-label">Kp {value}</span>
    </div>
  );
}

/** Section header */
function SectionTitle({ emoji, title, subtitle }) {
  return (
    <div className="cw-section-title">
      <span className="cw-section-emoji">{emoji}</span>
      <div>
        <div className="cw-section-name">{title}</div>
        {subtitle && <div className="cw-section-sub">{subtitle}</div>}
      </div>
    </div>
  );
}

/* ─── Main component ─── */
export default function CelestialWeather({ lat = null, lng = null }) {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [coords, setCoords]     = useState({ lat, lng });
  const [locName, setLocName]   = useState("");

  const load = useCallback(async (latitude, longitude, label = "") => {
    setLoading(true);
    setError(null);
    try {
      const [storms, flares, neos] = await Promise.all([
        fetchGeomagneticStorms(),
        fetchSolarFlares(),
        fetchCloseApproaches(),
      ]);

      /* Latest Kp index from storm data */
      const latestKp = storms.length > 0
        ? Math.max(...storms.flatMap((s) =>
            s.allKpIndex?.map((k) => parseFloat(k.kpIndex)) || [0]
          ))
        : 0;

      /* Latest flare class */
      const latestFlare = flares.length > 0
        ? flares[flares.length - 1]
        : null;

      /* Showers with activity */
      const showers = METEOR_SHOWERS.map((s) => ({
        ...s,
        daysUntil: daysUntilPeak(s.peak),
        activity:  getShowerActivity(s.peak),
      })).sort((a, b) => a.daysUntil - b.daysUntil);

      setData({
        moon:     getMoonPhase(),
        aurora:   getAuroraProbability(latitude),
        eclipses: getUpcomingEclipses(),
        showers,
        kp:       Math.round(latestKp),
        flare:    latestFlare,
        neos,
      });
      setLocName(label);
    } catch (err) {
      setError("Could not load celestial data. " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /* Auto-load if parent passed coords */
  useEffect(() => {
    if (lat !== null && lng !== null) {
      setCoords({ lat, lng });
      load(lat, lng, "Current Location");
    }
  }, [lat, lng, load]);

  async function handleLocate() {
    setLoading(true);
    setError(null);
    try {
      const { lat: la, lng: lo } = await getUserLocation();
      setCoords({ lat: la, lng: lo });
      await load(la, lo, "My Location");
    } catch (err) {
      setError(err.message || "Could not get your location.");
      setLoading(false);
    }
  }

  /* Next active shower (soonest peak ≤ 7 days) */
  const nextShower = data?.showers.find((s) => s.daysUntil <= 7);
  const upcomingShowers = data?.showers.slice(0, 4);

  return (
    <div className="cw-root">

      {/* ── Header ── */}
      <div className="cw-header">
        <div className="cw-header-left">
          <div className="cw-logo">✦ Celestial Events</div>
          {locName && <div className="cw-loc-tag">📌 {locName}</div>}
        </div>
        <button className="cw-btn" onClick={handleLocate} disabled={loading}>
          {loading ? "Loading…" : "📍 Load My Sky"}
        </button>
      </div>

      {error && <div className="cw-error">{error}</div>}

      {/* ── Empty state ── */}
      {!data && !loading && (
        <div className="cw-empty">
          <div className="cw-empty-icon">🔭</div>
          <div className="cw-empty-label">Press "Load My Sky" to see celestial events for your location</div>
        </div>
      )}

      {loading && (
        <div className="cw-empty">
          <div className="cw-empty-icon cw-spin">✦</div>
          <div className="cw-empty-label">Scanning the cosmos…</div>
        </div>
      )}

      {/* ── Dashboard ── */}
      {data && !loading && (
        <div className="cw-grid">

          {/* ── Moon Phase ── */}
          <div className="cw-card cw-card-moon">
            <SectionTitle emoji="🌕" title="Moon Phase" subtitle={data.moon.name} />
            <div className="cw-moon-body">
              <MoonDisc phase={data.moon.phase} />
              <div className="cw-moon-stats">
                <div className="cw-moon-stat">
                  <span className="cw-stat-label">Illumination</span>
                  <span className="cw-stat-val">{data.moon.illumination}%</span>
                </div>
                <div className="cw-moon-stat">
                  <span className="cw-stat-label">Full moon in</span>
                  <span className="cw-stat-val">{data.moon.daysToFull}d</span>
                </div>
                <div className="cw-moon-stat">
                  <span className="cw-stat-label">New moon in</span>
                  <span className="cw-stat-val">{data.moon.daysToNew}d</span>
                </div>
                <div className="cw-moon-phase-bar">
                  <div className="cw-moon-phase-fill" style={{ width: `${data.moon.illumination}%` }} />
                </div>
                <div className="cw-moon-cycle-label">
                  {data.moon.illumination < 50 ? "🌒 Waxing cycle" : "🌘 Waning cycle"}
                </div>
              </div>
            </div>
          </div>

          {/* ── Aurora ── */}
          <div className="cw-card cw-card-aurora">
            <SectionTitle emoji="🌌" title="Aurora Activity" subtitle={data.aurora.zone} />
            <div className="cw-aurora-chance">
              <div
                className="cw-aurora-ring"
                style={{ "--pct": `${data.aurora.chance}%` }}
              >
                <span className="cw-aurora-pct">{data.aurora.chance}%</span>
                <span className="cw-aurora-sub">chance</span>
              </div>
            </div>
            <div className="cw-aurora-info">
              <div className="cw-info-row">
                <span className="cw-info-label">Geomagnetic Kp</span>
                <KpBar value={data.kp} />
              </div>
              {data.flare && (
                <div className="cw-info-row">
                  <span className="cw-info-label">Latest solar flare</span>
                  <span className="cw-info-val cw-flare-badge">
                    {data.flare.classType}
                  </span>
                </div>
              )}
              <div className="cw-aurora-tip">{data.aurora.tip}</div>
            </div>
          </div>

          {/* ── Meteor Showers ── */}
          <div className="cw-card cw-card-meteors">
            <SectionTitle emoji="☄️" title="Meteor Showers"
              subtitle={nextShower ? `${nextShower.name} peaks in ${nextShower.daysUntil}d` : "No active shower"} />
            <div className="cw-shower-list">
              {upcomingShowers.map((s) => (
                <div key={s.name} className="cw-shower-row">
                  <div className="cw-shower-left">
                    <div
                      className="cw-shower-dot"
                      style={{ background: s.activity.color, boxShadow: `0 0 6px ${s.activity.color}` }}
                    />
                    <div>
                      <div className="cw-shower-name">{s.name}</div>
                      <div className="cw-shower-meta">
                        Peak {`${String(s.peak.d).padStart(2,"0")}/${String(s.peak.m).padStart(2,"0")}`}
                        · {s.rate} ZHR · {s.parent}
                      </div>
                    </div>
                  </div>
                  <div className="cw-shower-badge" style={{ background: s.activity.color + "22", color: s.activity.color }}>
                    {s.activity.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Eclipses ── */}
          <div className="cw-card cw-card-eclipses">
            <SectionTitle emoji="🌑" title="Upcoming Eclipses" subtitle="NASA eclipse schedule" />
            <div className="cw-eclipse-list">
              {data.eclipses.map((e) => (
                <div key={e.date} className="cw-eclipse-row">
                  <div className="cw-eclipse-icon">
                    {e.type.includes("Solar") ? "🌞" : "🌕"}
                  </div>
                  <div className="cw-eclipse-info">
                    <div className="cw-eclipse-type">{e.type} Eclipse</div>
                    <div className="cw-eclipse-detail">
                      {new Date(e.date + "T12:00:00").toLocaleDateString("en-AU", {
                        day: "numeric", month: "long", year: "numeric"
                      })}
                      · {e.region}
                    </div>
                    <div className="cw-eclipse-detail">Duration: {e.duration}</div>
                  </div>
                  <div className="cw-eclipse-days">
                    <span className="cw-eclipse-countdown">{e.daysAway}</span>
                    <span className="cw-eclipse-days-label">days</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Near-Earth Objects / Comets ── */}
          <div className="cw-card cw-card-neos">
            <SectionTitle emoji="🌠" title="Near-Earth Objects Today" subtitle="Via NASA NeoWs" />
            {data.neos.length === 0 ? (
              <div className="cw-neo-empty">No close approaches today</div>
            ) : (
              <div className="cw-neo-list">
                <div className="cw-neo-header-row">
                  <span>Object</span>
                  <span>Size (m)</span>
                  <span>Distance (LD)</span>
                  <span>Speed (km/h)</span>
                </div>
                {data.neos.map((n, i) => (
                  <div key={i} className="cw-neo-row">
                    <span className="cw-neo-name">{n.name.replace(/[()]/g, "")}</span>
                    <span>{n.diameter}</span>
                    <span>{n.distance}</span>
                    <span>{Number(n.velocity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="cw-neo-footnote">LD = Lunar Distance (384,400 km)</div>
          </div>

        </div>
      )}
    </div>
  );
}
