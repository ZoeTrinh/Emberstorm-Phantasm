import "./SkyRecommendation.css";

/*
  Props:
  - hourlyWeather : array from WeatherTracker's onWeatherLoad  (can be null)
  - heroEvent     : object from CelestialWeather's onHeroEvent (can be null)
*/
export default function SkyRecommendation({ hourlyWeather, heroEvent }) {
  /* Don't render until we have at least weather data */
  if (!hourlyWeather || hourlyWeather.length === 0) return null;

  const now         = hourlyWeather[0];
  const cloud       = now.cloud   ?? 0;
  const rain        = now.rain    ?? 0;
  const visibility  = now.visibility ?? 10000;

  /* ── Derive sky quality ── */
  const isRaining   = rain > 0;
  const isOvercast  = cloud > 75;
  const isCloudy    = cloud > 40;
  const isHazy      = visibility < 5000;

  let skyGrade; // "blocked" | "poor" | "fair" | "good" | "excellent"
  if (isRaining || isOvercast)        skyGrade = "blocked";
  else if (isCloudy || isHazy)        skyGrade = "poor";
  else if (cloud > 20)                skyGrade = "fair";
  else if (cloud <= 20 && !isHazy)    skyGrade = "good";

  /* ── Build recommendation copy ── */
  const event = heroEvent;

  const GRADES = {
    blocked: {
      verdict:  "Not tonight",
      icon:     "☁️",
      color:    "var(--sr-red)",
      glow:     "var(--sr-red-glow)",
      skyDesc:  isRaining
        ? `Rain is falling (${rain} mm) and the sky is fully obscured.`
        : `Heavy cloud cover (${cloud}%) is blocking the sky entirely.`,
      tip: "Check back when skies clear — conditions can change quickly.",
    },
    poor: {
      verdict:  "Conditions poor",
      icon:     "⛅",
      color:    "var(--sr-amber)",
      glow:     "var(--sr-amber-glow)",
      skyDesc:  isHazy
        ? `Atmospheric haze (visibility ${(visibility / 1000).toFixed(1)} km) will wash out faint objects.`
        : `Patchy cloud cover (${cloud}%) will interrupt viewing.`,
      tip: "You may catch glimpses during clear gaps — worth a look but temper expectations.",
    },
    fair: {
      verdict:  "Decent window",
      icon:     "🌤",
      color:    "var(--sr-teal)",
      glow:     "var(--sr-teal-glow)",
      skyDesc:  `Partly cloudy (${cloud}%) with reasonable visibility.`,
      tip: "Find an open patch of sky away from trees and buildings.",
    },
    good: {
      verdict:  "Good skies",
      icon:     "✨",
      color:    "var(--sr-purple)",
      glow:     "var(--sr-purple-glow)",
      skyDesc:  `Clear skies (${cloud}% cloud) and good visibility.`,
      tip: "Let your eyes dark-adapt for 20 minutes before observing.",
    },
  };

  const grade = GRADES[skyGrade];

  /* ── Event-specific advice ── */
  let eventLine = null;
  if (event) {
    if (skyGrade === "blocked") {
      eventLine = `${event.title} is happening but the sky is closed — you won't see it from here tonight.`;
    } else if (skyGrade === "poor") {
      eventLine = `${event.title} is active. Cloudy skies will make it hard but not impossible.`;
    } else {
      eventLine = `Tonight's highlight: ${event.title}. ${event.subtitle}.`;
    }
  }

  /* ── Telescope badge ── */
  const needsScope = event?.needsTelescope;

  return (
    <div className="sr-wrap">
      <div className={`sr-card sr-card--${skyGrade}`}>

        {/* Ambient glow blob */}
        <div className="sr-glow" style={{ background: grade.glow }} />

        {/* Header row */}
        <div className="sr-header">
          <span className="sr-eyebrow">Tonight's Recommendation</span>
          <span className="sr-icon">{grade.icon}</span>
        </div>

        {/* Verdict */}
        <div className="sr-verdict" style={{ color: grade.color }}>
          {grade.verdict}
        </div>

        {/* Sky conditions summary */}
        <div className="sr-sky-row">
          <Pill label={`☁ ${cloud}%`}  dim={skyGrade === "blocked"} />
          <Pill label={`💧 ${rain} mm`} dim={rain === 0} />
          <Pill label={`👁 ${visibility >= 1000 ? (visibility / 1000).toFixed(0) + " km" : visibility + " m"}`} dim={isHazy} />
        </div>

        {/* Description */}
        <p className="sr-desc">{grade.skyDesc}</p>

        {/* Event callout */}
        {eventLine && (
          <div className={`sr-event-box sr-event-box--${skyGrade}`}>
            <span className="sr-event-dot" style={{ background: grade.color }} />
            <span className="sr-event-text">{eventLine}</span>
            {needsScope && <span className="sr-scope-tag">🔭</span>}
          </div>
        )}

        {/* Tip */}
        <div className="sr-tip">
          <span className="sr-tip-label">Tip</span>
          {grade.tip}
        </div>

      </div>
    </div>
  );
}

function Pill({ label, dim }) {
  return (
    <span className={`sr-pill${dim ? " sr-pill--dim" : ""}`}>{label}</span>
  );
}