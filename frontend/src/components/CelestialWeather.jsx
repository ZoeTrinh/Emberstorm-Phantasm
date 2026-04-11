import { useState, useCallback, useEffect } from "react";
import { getUserLocation } from "../utils/Gps";
import "./CelestialWeather.css";
import { calculateConjunctions } from '../utils/ConjunctionCalculator';

const NASA_KEY = import.meta.env.VITE_NASA_API_KEY || "DEMO_KEY";

function toJulian(date = new Date()) { return date.getTime() / 86400000 + 2440587.5; }

function getMoonPhase(date = new Date()) {
  const jd    = toJulian(date);
  const cycle = 29.53058867;
  const norm  = (((jd - 2451549.5) % cycle) / cycle + 1) % 1;
  let name, emoji;
  if (norm < 0.03 || norm >= 0.97)      { name = "New Moon";        emoji = "🌑"; }
  else if (norm < 0.22)                  { name = "Waxing Crescent"; emoji = "🌒"; }
  else if (norm < 0.28)                  { name = "First Quarter";   emoji = "🌓"; }
  else if (norm < 0.47)                  { name = "Waxing Gibbous";  emoji = "🌔"; }
  else if (norm < 0.53)                  { name = "Full Moon";       emoji = "🌕"; }
  else if (norm < 0.72)                  { name = "Waning Gibbous";  emoji = "🌖"; }
  else if (norm < 0.78)                  { name = "Last Quarter";    emoji = "🌗"; }
  else                                   { name = "Waning Crescent"; emoji = "🌘"; }
  const illumination = Math.round(50 * (1 - Math.cos(2 * Math.PI * norm)));
  const daysToFull   = norm < 0.5 ? Math.round((0.5 - norm) * cycle) : Math.round((1.5 - norm) * cycle);
  const daysToNew    = Math.round((1 - norm) * cycle);
  return { phase: norm, name, emoji, illumination, daysToFull, daysToNew };
}

const METEOR_SHOWERS = [
  { name: "Quadrantids",    peak: { m: 1,  d: 3  }, rate: 120, parent: "2003 EH1",            needsTelescope: false },
  { name: "Lyrids",         peak: { m: 4,  d: 22 }, rate: 20,  parent: "Comet Thatcher",      needsTelescope: false },
  { name: "Eta Aquariids",  peak: { m: 5,  d: 6  }, rate: 60,  parent: "Comet Halley",        needsTelescope: false },
  { name: "Delta Aquariids",peak: { m: 7,  d: 30 }, rate: 20,  parent: "Comet Machholz",      needsTelescope: false },
  { name: "Perseids",       peak: { m: 8,  d: 12 }, rate: 100, parent: "Comet Swift-Tuttle",  needsTelescope: false },
  { name: "Orionids",       peak: { m: 10, d: 21 }, rate: 25,  parent: "Comet Halley",        needsTelescope: false },
  { name: "Leonids",        peak: { m: 11, d: 17 }, rate: 15,  parent: "Comet Tempel-Tuttle", needsTelescope: false },
  { name: "Geminids",       peak: { m: 12, d: 14 }, rate: 150, parent: "3200 Phaethon",       needsTelescope: false },
  { name: "Ursids",         peak: { m: 12, d: 22 }, rate: 10,  parent: "Comet Tuttle",        needsTelescope: false },
];

function daysUntilPeak(peak) {
  const now      = new Date();
  const peakDate = new Date(now.getFullYear(), peak.m - 1, peak.d);
  if (peakDate < now) peakDate.setFullYear(now.getFullYear() + 1);
  return Math.round((peakDate - now) / 86400000);
}

function getShowerActivity(peak) {
  const days = daysUntilPeak(peak);
  if (days <= 3)  return { label: "Active now",  color: "#c084fc" };
  if (days <= 7)  return { label: "Coming soon", color: "#a78bfa" };
  if (days <= 30) return { label: "This month",  color: "#7c3aed" };
  return              { label: `In ${days}d`,    color: "#4c1d95" };
}

function getAuroraProbability(lat) {
  const a = Math.abs(lat);
  if (a >= 65) return { chance: 85, zone: "Auroral oval",    tip: "Look north on clear nights" };
  if (a >= 55) return { chance: 55, zone: "Sub-auroral",     tip: "Visible during strong storms" };
  if (a >= 45) return { chance: 25, zone: "Mid-latitude",    tip: "Only during G3+ storms" };
  if (a >= 35) return { chance: 8,  zone: "Low-latitude",    tip: "Requires extreme G4/G5 event" };
  return             { chance: 1,  zone: "Near equatorial",  tip: "Extremely rare — major solar event needed" };
}

function getUpcomingEclipses() {
  const now = new Date();
  return [
    { date: "2026-08-12", type: "Total Solar",   region: "Arctic, Greenland, Europe", duration: "2m18s", isSolar: true  },
    { date: "2026-02-17", type: "Annular Solar",  region: "Antarctica",                duration: "3m57s", isSolar: true  },
    { date: "2025-09-07", type: "Total Lunar",    region: "Americas, Europe, Africa",  duration: "84m",   isSolar: false },
    { date: "2025-03-14", type: "Total Lunar",    region: "Americas, Europe",          duration: "65m",   isSolar: false },
    { date: "2027-08-02", type: "Total Solar",    region: "N Africa, Middle East",     duration: "6m23s", isSolar: true  },
  ]
    .map((e) => ({ ...e, daysAway: Math.round((new Date(e.date) - now) / 86400000) }))
    .filter((e) => e.daysAway >= 0)
    .sort((a, b) => a.daysAway - b.daysAway)
    .slice(0, 3);
}

function pickHeroEvent(data) {
  const activeShower = data.showers.find((s) => s.daysUntil <= 3);
  if (activeShower) return {
    title:          activeShower.name + " Meteor Shower",
    subtitle:       `Peaks ${activeShower.peak.d}/${activeShower.peak.m}`,
    funFact:        `Up to ${activeShower.rate} meteors/hour at peak. Parent: ${activeShower.parent}. No telescope needed — just lie back and look up.`,
    searchQuery:    activeShower.name + " meteor shower",
    needsTelescope: false,
    isDay:          false,
  };

  const nextEclipse = data.eclipses[0];
  if (nextEclipse && nextEclipse.daysAway <= 30) return {
    title:          `${nextEclipse.type} Eclipse`,
    subtitle:       `${nextEclipse.daysAway} days away · ${nextEclipse.region}`,
    funFact:        nextEclipse.isSolar
      ? `Totality lasts ${nextEclipse.duration}. The corona becomes visible only during total solar eclipses. Always use ISO 12312-2 certified eclipse glasses.`
      : `The Moon turns deep red during totality — Earth's atmosphere scatters blue light and bends red light onto the lunar surface. Safe to view naked-eye.`,
    searchQuery:    nextEclipse.type + " eclipse NASA",
    needsTelescope: nextEclipse.isSolar,
    isDay:          nextEclipse.isSolar,
  };

  const nextConj = data.conjunctions.find((c) => c.daysAway >= 0 && c.daysAway <= 14);
  if (nextConj) return {
    title:          nextConj.name,
    subtitle:       nextConj.daysAway === 0 ? "Happening tonight!" : `In ${nextConj.daysAway} days`,
    funFact:        nextConj.tip,
    searchQuery:    `${nextConj.objects} planet conjunction astronomy`,
    needsTelescope: nextConj.needsTelescope,
    isDay:          false,
  };

  if (data.moon.illumination >= 95) return {
    title:          "Full Moon",
    subtitle:       `${data.moon.illumination}% illuminated tonight`,
    funFact:        "A full moon is up to 14× brighter than a half moon — the opposition surge caused by the absence of shadows when sunlight hits the lunar surface head-on.",
    searchQuery:    "full moon NASA photography",
    needsTelescope: false,
    isDay:          false,
  };

  if (data.kp >= 5) return {
    title:          "Geomagnetic Storm",
    subtitle:       `Kp ${data.kp} — aurora possible tonight`,
    funFact:        "Green aurora forms when solar particles excite oxygen at ~100 km altitude. Red aurora comes from oxygen above 200 km. Purple and blue hues come from nitrogen.",
    searchQuery:    "aurora borealis NASA",
    needsTelescope: false,
    isDay:          false,
  };

  const nextShower = data.showers[0];
  return {
    title:          nextShower.name + " Meteor Shower",
    subtitle:       `Next shower — in ${nextShower.daysUntil} days`,
    funFact:        `The ${nextShower.name} are debris trails from ${nextShower.parent}. As Earth crosses the trail each year, particles burn at ~80 km altitude — up to ${nextShower.rate} meteors/hour.`,
    searchQuery:    nextShower.name + " meteor shower space",
    needsTelescope: false,
    isDay:          false,
  };
}

function getViewingWarning(hourlyWeather) {
  if (!hourlyWeather || hourlyWeather.length === 0) return null;
  const { cloud, rain, visibility } = hourlyWeather[0];
  if (rain > 0)          return { level: "blocked", icon: "🌧", message: `Rain detected (${rain}mm) — sky viewing not possible right now.` };
  if (cloud > 80)        return { level: "blocked", icon: "☁️", message: `Overcast (${cloud}% cloud cover) — celestial events not visible right now.` };
  if (cloud > 50)        return { level: "partial", icon: "⛅", message: `Partly cloudy (${cloud}%) — viewing may be interrupted.` };
  if (visibility < 5000) return { level: "partial", icon: "🌫", message: `Low visibility (${(visibility / 1000).toFixed(1)}km) — atmosphere may affect clarity.` };
  if (cloud <= 20)       return { level: "clear",   icon: "✨", message: `Clear skies (${cloud}% cloud) — great conditions for tonight!` };
  return                        { level: "fair",    icon: "🌤", message: `Mostly clear (${cloud}% cloud) — decent viewing conditions.` };
}

async function fetchGeomagneticStorms() {
  const end   = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const res   = await fetch(`https://api.nasa.gov/DONKI/GST?startDate=${start}&endDate=${end}&api_key=${NASA_KEY}`);
  if (!res.ok) return [];
  return res.json();
}

async function fetchSolarFlares() {
  const end   = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const res   = await fetch(`https://api.nasa.gov/DONKI/FLR?startDate=${start}&endDate=${end}&api_key=${NASA_KEY}`);
  if (!res.ok) return [];
  return res.json();
}

async function fetchCloseApproaches() {
  const res = await fetch(`https://api.nasa.gov/neo/rest/v1/feed/today?detailed=false&api_key=${NASA_KEY}`);
  if (!res.ok) return [];
  const data = await res.json();
  const today = Object.values(data.near_earth_objects)[0] || [];
  return today.slice(0, 6).map((o) => ({
    name:     o.name,
    diameter: Math.round(o.estimated_diameter.meters.estimated_diameter_max),
    distance: parseFloat(o.close_approach_data[0]?.miss_distance?.lunar).toFixed(1),
    velocity: parseFloat(o.close_approach_data[0]?.relative_velocity?.kilometers_per_hour).toFixed(0),
  }));
}

async function fetchNasaImage(query) {
  try {
    const SATURN_FALLBACK = {
      url:    "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/p/i/a/1/PIA18335.jpg",
      title:  "Saturn",
      credit: "NASA/JPL-Caltech",
    };

    const res  = await fetch(`https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=image&page_size=8`);
    if (!res.ok) return SATURN_FALLBACK;
    const data = await res.json();
    for (const item of (data.collection?.items ?? [])) {
      const link = item.links?.find((l) => l.rel === "preview");
      if (link) return { url: link.href, title: item.data?.[0]?.title ?? query, credit: item.data?.[0]?.center ?? "NASA" };
    }
    return SATURN_FALLBACK;
  } catch { 
    return {
      url:    "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/p/i/a/1/PIA18335.jpg",
      title:  "Saturn",
      credit: "NASA/JPL-Caltech",
    };
  }
}

function MoonDisc({ phase }) {
  const cx = 50, cy = 50, r = 40;
  const isWaxing = phase < 0.5;
  const p  = isWaxing ? phase * 2 : (phase - 0.5) * 2;
  const ex = r * Math.abs(1 - p * 2);
  return (
    <svg viewBox="0 0 100 100" width="80" height="80" className="cw-moon-disc">
      <defs><clipPath id="mc"><circle cx={cx} cy={cy} r={r} /></clipPath></defs>
      <circle cx={cx} cy={cy} r={r} fill="#0d1b2e" stroke="#a855f7" strokeWidth="1" />
      <g clipPath="url(#mc)">
        {phase > 0.03 && phase < 0.47 && <ellipse cx={isWaxing ? cx - ex : cx + ex} cy={cy} rx={r} ry={r} fill="#f5e6c8" opacity="0.9" />}
        {phase >= 0.47 && phase <= 0.53 && <circle cx={cx} cy={cy} r={r} fill="#f5e6c8" opacity="0.95" />}
        {phase > 0.53 && phase < 0.97  && <ellipse cx={isWaxing ? cx + ex : cx - ex} cy={cy} rx={r} ry={r} fill="#f5e6c8" opacity="0.9" />}
      </g>
      <circle cx={38} cy={38} r={5} fill="none" stroke="rgba(100,80,40,0.2)" strokeWidth="0.8" />
      <circle cx={60} cy={55} r={3} fill="none" stroke="rgba(100,80,40,0.15)" strokeWidth="0.8" />
    </svg>
  );
}

function KpBar({ value = 0 }) {
  return (
    <div className="cw-kp-bar">
      {Array.from({ length: 9 }, (_, i) => i + 1).map((s) => (
        <div key={s} className="cw-kp-seg" style={{
          background: s <= value
            ? s <= 3 ? "#c084fc" : s <= 6 ? "#67e8f9" : "#f87171"
            : "rgba(255,255,255,0.07)",
        }} />
      ))}
      <span className="cw-kp-label">Kp {value}</span>
    </div>
  );
}

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

function ViewingBanner({ warning }) {
  if (!warning) return null;
  const palette = {
    blocked: { bg: "rgba(239,83,80,0.12)",  border: "rgba(239,83,80,0.35)",   text: "#f87171" },
    partial: { bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.3)",   text: "#fbbf24" },
    fair:    { bg: "rgba(168,85,247,0.10)", border: "rgba(168,85,247,0.3)",   text: "#c084fc" },
    clear:   { bg: "rgba(103,232,249,0.10)",border: "rgba(103,232,249,0.3)",  text: "#67e8f9" },
  };
  const c = palette[warning.level] || palette.fair;
  return (
    <div className="cw-viewing-banner" style={{ background: c.bg, borderColor: c.border, color: c.text }}>
      <span className="cw-banner-icon">{warning.icon}</span>
      <span>{warning.message}</span>
    </div>
  );
}

/* ─── Hero panel ─────────────────────────────────────────────── */
function HeroPanel({ hero, image, cloudWarning, closestEvent, timeLeft }) {
  if (!hero) return null;
  const blocked = cloudWarning?.level === "blocked";
  return (
    <div className="cw-hero">
      <div className="cw-hero-bg" style={image ? { 
        backgroundImage:    `url(${image.url})`,
        backgroundSize:     "200%",
        backgroundPosition: "30% 20%",
      } : {}} />
      <div className="cw-hero-overlay" />
      <div className="cw-hero-content">
        <div className="cw-hero-eyebrow">✦ {hero.isDay ? "Event of the Day" : "Event of the Night"}</div>
        <h2 className="cw-hero-title">{hero.title}</h2>
        <div className="cw-hero-subtitle">{hero.subtitle}</div>

        {closestEvent && timeLeft && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(168,212,245,0.45)", marginBottom: 8 }}>
              Live countdown
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                ["Days", timeLeft.days],
                ["Hours", timeLeft.hours],
                ["Min", timeLeft.minutes],
                ["Sec", timeLeft.seconds],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    minWidth: 70,
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(74,111,165,0.2)",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#ffd54f" }}>{value}</div>
                  <div style={{ fontSize: 11, color: "rgba(168,212,245,0.5)" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {hero.needsTelescope && (
          <div className="cw-telescope-badge">🔭 Telescope or binoculars recommended</div>
        )}

        <ViewingBanner warning={cloudWarning} />
        {blocked && <div className="cw-hero-blocked-note">The event is still occurring — check again when skies clear.</div>}
        <div className="cw-hero-funfact">
          <span className="cw-funfact-label">✦ Fun fact</span>
          <p>{hero.funFact}</p>
        </div>
        {image && <div className="cw-hero-credit">📷 {image.title} · {image.credit}</div>}
      </div>
    </div>
  );
}

// Convert the nearest event into an exact Date object
function getClosestPhenomenonDate(data) {
  if (!data) return null;

  const now = new Date();
  const candidates = [];

  // Meteor showers
  for (const s of data.showers || []) {
    let year = now.getFullYear();
    let eventDate = new Date(year, s.peak.m - 1, s.peak.d, 22, 0, 0); // 10pm local time

    if (eventDate < now) {
      eventDate = new Date(year + 1, s.peak.m - 1, s.peak.d, 22, 0, 0);
    }

    candidates.push({
      type: "Meteor Shower",
      title: s.name,
      date: eventDate,
    });
  }

  // Eclipses
  for (const e of data.eclipses || []) {
    const eventDate = new Date(`${e.date}T12:00:00`); // midday placeholder
    if (eventDate > now) {
      candidates.push({
        type: "Eclipse",
        title: `${e.type} Eclipse`,
        date: eventDate,
      });
    }
  }

  // Conjunctions
  for (const c of data.conjunctions || []) {
    if (c.daysAway >= 0) {
      const eventDate = new Date();
      eventDate.setDate(eventDate.getDate() + c.daysAway);
      eventDate.setHours(21, 0, 0, 0); // 9pm local time

      candidates.push({
        type: "Conjunction",
        title: c.objects || c.name,
        date: eventDate,
      });
    }
  }

  candidates.sort((a, b) => a.date - b.date);
  return candidates[0] || null;
}

// Break remaining time into parts for display
function getTimeLeft(targetDate) {
  if (!targetDate) return null;

  const diff = targetDate - new Date();

  if (diff <= 0) {
    return {
      expired: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  const totalSeconds = Math.floor(diff / 1000);

  return {
    expired: false,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

/* ─── Main ───────────────────────────────────────────────────── */
export default function CelestialWeather({ hourlyWeather = null, onHeroEvent }) {
  const [data, setData]           = useState(null);
  const [hero, setHero]           = useState(null);
  const [heroImage, setHeroImage] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [locName, setLocName]     = useState("");
  const [autoLoaded, setAutoLoaded] = useState(false);

  const [closestEvent, setClosestEvent] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  const cloudWarning = getViewingWarning(hourlyWeather);

  useEffect(() => {
    if (!closestEvent) return;

    // Set the countdown immediately
    setTimeLeft(getTimeLeft(closestEvent.date));

    // Update every second
    const intervalId = setInterval(() => {
      setTimeLeft(getTimeLeft(closestEvent.date));
    }, 1000);

    // Clean up interval when event changes or component unmounts
    return () => clearInterval(intervalId);
  }, [closestEvent]);

  const load = useCallback(async (lat, lng, label = "") => {
    setLoading(true);
    setError(null);
    try {
      // Run NASA fetches and conjunction calculation in parallel
      const [storms, flares, neos, conjunctions] = await Promise.all([
        fetchGeomagneticStorms(),
        fetchSolarFlares(),
        fetchCloseApproaches(),
        Promise.resolve(calculateConjunctions(lat, lng, 90, 5)),
      ]);
      const latestKp = storms.length > 0
        ? Math.max(...storms.flatMap((s) => s.allKpIndex?.map((k) => parseFloat(k.kpIndex)) || [0]))
        : 0;
      const showers = METEOR_SHOWERS
        .map((s) => ({ ...s, daysUntil: daysUntilPeak(s.peak), activity: getShowerActivity(s.peak) }))
        .sort((a, b) => a.daysUntil - b.daysUntil);

      const assembled = {
        moon:         getMoonPhase(),
        aurora:       getAuroraProbability(lat),
        eclipses:     getUpcomingEclipses(),
        showers,
        conjunctions, // ✅ live-calculated from real GPS, already has daysAway sorted
        kp:           Math.round(latestKp),
        flare:        flares.length > 0 ? flares[flares.length - 1] : null,
        neos,
      };
      setData(assembled);
      setLocName(label);

      // Find the earliest upcoming phenomenon for the live countdown
      const nearest = getClosestPhenomenonDate(assembled);
      setClosestEvent(nearest);

      const heroEvent = pickHeroEvent(assembled);
      setHero(heroEvent);
      onHeroEvent?.(heroEvent);
      fetchNasaImage(heroEvent.searchQuery).then(setHeroImage);
    } catch (err) {
      setError("Could not load celestial data. " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleLocate() {
    setLoading(true);
    setError(null);
    try {
      const { lat, lng } = await getUserLocation();
      await load(lat, lng, "My Location");
    } catch (err) {
      setError(err.message || "Could not get your location.");
      setLoading(false);
    }
  }

  return (
    <div className="cw-root">

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

      {!data && cloudWarning && <ViewingBanner warning={cloudWarning} />}

      {!data && !loading && (
        <div className="cw-empty">
          <div className="cw-empty-icon">🔭</div>
          <div className="cw-empty-label">
            Allow location access to see tonight's celestial events
            {hourlyWeather ? " — weather data already loaded above." : "."}
          </div>
        </div>
      )}

      {loading && (
        <div className="cw-empty">
          <div className="cw-empty-icon cw-spin">✦</div>
          <div className="cw-empty-label">Scanning the cosmos…</div>
        </div>
      )}

      {data && !loading && (
        <>
          <HeroPanel hero={hero} image={heroImage} cloudWarning={cloudWarning} closestEvent={closestEvent} timeLeft={timeLeft}/>

          <div className="cw-grid">

            <div className="cw-card cw-card-moon">
              <SectionTitle emoji="🌕" title="Moon Phase" subtitle={data.moon.name} />
              <div className="cw-moon-body">
                <MoonDisc phase={data.moon.phase} />
                <div className="cw-moon-stats">
                  <div className="cw-moon-stat"><span className="cw-stat-label">Phase</span><span className="cw-stat-val">{data.moon.name} {data.moon.emoji}</span></div>
                  <div className="cw-moon-stat"><span className="cw-stat-label">Illumination</span><span className="cw-stat-val">{data.moon.illumination}%</span></div>
                  <div className="cw-moon-stat"><span className="cw-stat-label">Full moon in</span><span className="cw-stat-val">{data.moon.daysToFull}d</span></div>
                  <div className="cw-moon-stat"><span className="cw-stat-label">New moon in</span><span className="cw-stat-val">{data.moon.daysToNew}d</span></div>
                  <div className="cw-moon-phase-bar"><div className="cw-moon-phase-fill" style={{ width: `${data.moon.illumination}%` }} /></div>
                </div>
              </div>
            </div>

            <div className="cw-card cw-card-aurora">
              <SectionTitle emoji="🌌" title="Aurora Activity" subtitle={data.aurora.zone} />
              <div className="cw-aurora-chance">
                <div className="cw-aurora-ring" style={{ "--pct": `${data.aurora.chance}%` }}>
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
                    <span className="cw-info-val cw-flare-badge">{data.flare.classType}</span>
                  </div>
                )}
                <div className="cw-aurora-tip">{data.aurora.tip}</div>
                {cloudWarning?.level === "blocked" && (
                  <ViewingBanner warning={{ level: "blocked", icon: "☁️", message: "Cloudy — aurora not visible right now even if active." }} />
                )}
              </div>
            </div>

            <div className="cw-card cw-card-meteors">
              <SectionTitle emoji="☄️" title="Meteor Showers"
                subtitle={data.showers[0]?.daysUntil <= 3
                  ? `${data.showers[0].name} active now!`
                  : `Next: ${data.showers[0]?.name} in ${data.showers[0]?.daysUntil}d`} />
              <div className="cw-shower-list">
                {data.showers.slice(0, 4).map((s) => (
                  <div key={s.name} className="cw-shower-row">
                    <div className="cw-shower-left">
                      <div className="cw-shower-dot" style={{ background: s.activity.color, boxShadow: `0 0 6px ${s.activity.color}` }} />
                      <div>
                        <div className="cw-shower-name">{s.name}</div>
                        <div className="cw-shower-meta">Peak {String(s.peak.d).padStart(2,"0")}/{String(s.peak.m).padStart(2,"0")} · {s.rate} ZHR · {s.parent}</div>
                      </div>
                    </div>
                    <div className="cw-shower-badge" style={{ background: s.activity.color + "22", color: s.activity.color }}>
                      {s.activity.label}
                    </div>
                  </div>
                ))}
              </div>
              {cloudWarning?.level === "blocked" && (
                <ViewingBanner warning={{ level: "blocked", icon: "☁️", message: "Overcast — meteors not visible tonight." }} />
              )}
            </div>

            <div className="cw-card cw-card-eclipses">
              <SectionTitle emoji="🌑" title="Upcoming Eclipses" subtitle="NASA eclipse schedule" />
              <div className="cw-eclipse-list">
                {data.eclipses.map((e) => (
                  <div key={e.date} className="cw-eclipse-row">
                    <div className="cw-eclipse-icon">{e.isSolar ? "🌞" : "🌕"}</div>
                    <div className="cw-eclipse-info">
                      <div className="cw-eclipse-type">{e.type} Eclipse {e.isSolar && <span className="cw-telescope-inline" title="Eclipse glasses required">🔭</span>}</div>
                      <div className="cw-eclipse-detail">{new Date(e.date + "T12:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })} · {e.region}</div>
                      <div className="cw-eclipse-detail">Duration: {e.duration}</div>
                      {e.isSolar && <div className="cw-eclipse-solar-warn">⚠️ Eclipse glasses required — ISO 12312-2 certified</div>}
                    </div>
                    <div className="cw-eclipse-days">
                      <span className="cw-eclipse-countdown">{e.daysAway}</span>
                      <span className="cw-eclipse-days-label">days</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="cw-card cw-card-conjunctions">
              <SectionTitle
                emoji="🔭"
                title="Planetary Conjunctions"
                subtitle={
                  data.conjunctions.length === 0
                    ? "None in next 90 days"
                    : data.conjunctions[0]?.daysAway === 0
                      ? "Happening tonight!"
                      : `Next: ${data.conjunctions[0]?.objects} in ${data.conjunctions[0]?.daysAway}d`
                }
              />
              <div className="cw-conjunction-list">
                {data.conjunctions.length === 0 ? (
                  <div className="cw-neo-empty">No conjunctions found in the next 90 days</div>
                ) : (
                  data.conjunctions.slice(0, 3).map((c) => (
                    <div key={c.name} className="cw-conjunction-row">
                      <div className="cw-conjunction-left">
                        <div className="cw-conjunction-name">{c.objects}</div>
                        <div className="cw-conjunction-tip">
                          {c.tip}
                          {c.visibleFromLocation === false && (
                            <span style={{ color: "#ef9a9a", marginLeft: 6 }}>· Not visible from your location</span>
                          )}
                        </div>
                      </div>
                      <div className="cw-conjunction-right">
                        <span className="cw-conjunction-days">
                          {c.daysAway === 0 ? "Tonight!" : `${c.daysAway}d`}
                        </span>
                        {c.needsTelescope && <span className="cw-telescope-tag">🔭</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
              {cloudWarning?.level === "blocked" && (
                <ViewingBanner warning={{ level: "blocked", icon: "☁️", message: "Overcast — conjunctions not visible tonight." }} />
              )}
            </div>

            <div className="cw-card cw-card-neos">
              <SectionTitle emoji="🌠" title="Near-Earth Objects Today" subtitle="Via NASA NeoWs" />
              {data.neos.length === 0 ? (
                <div className="cw-neo-empty">No close approaches today</div>
              ) : (
                <div className="cw-neo-list">
                  <div className="cw-neo-header-row">
                    <span>Object</span><span>Size (m)</span><span>Distance (LD)</span><span>Speed (km/h)</span>
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
        </>
      )}
    </div>
  );
}