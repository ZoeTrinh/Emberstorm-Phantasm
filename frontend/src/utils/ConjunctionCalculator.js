import * as Astronomy from 'astronomy-engine';

const PLANETS = [
  { name: 'Mercury', body: Astronomy.Body.Mercury, needsTelescope: false },
  { name: 'Venus',   body: Astronomy.Body.Venus,   needsTelescope: false },
  { name: 'Mars',    body: Astronomy.Body.Mars,     needsTelescope: false },
  { name: 'Jupiter', body: Astronomy.Body.Jupiter,  needsTelescope: false },
  { name: 'Saturn',  body: Astronomy.Body.Saturn,   needsTelescope: false },
  { name: 'Uranus',  body: Astronomy.Body.Uranus,   needsTelescope: true  },
  { name: 'Neptune', body: Astronomy.Body.Neptune,  needsTelescope: true  },
];

// Angular separation in degrees between two planets on a given date
function getAngularSeparation(bodyA, bodyB, date) {
  const observer = new Astronomy.Observer(0, 0, 0); // location doesn't matter for separation
  const a = Astronomy.Equator(bodyA, date, observer, true, true);
  const b = Astronomy.Equator(bodyB, date, observer, true, true);
  return Astronomy.AngleBetween(
    new Astronomy.Vector(
      Math.cos(a.dec * Math.PI/180) * Math.cos(a.ra * Math.PI/12),
      Math.cos(a.dec * Math.PI/180) * Math.sin(a.ra * Math.PI/12),
      Math.sin(a.dec * Math.PI/180),
      date
    ),
    new Astronomy.Vector(
      Math.cos(b.dec * Math.PI/180) * Math.cos(b.ra * Math.PI/12),
      Math.cos(b.dec * Math.PI/180) * Math.sin(b.ra * Math.PI/12),
      Math.sin(b.dec * Math.PI/180),
      date
    )
  );
}

// Check if a planet is visible from location at night on a given date
function isVisibleAtNight(body, date, lat, lng) {
  const observer = new Astronomy.Observer(lat, lng, 0);
  const rise = Astronomy.SearchRiseSet(body, observer, +1, date, 1);
  const set  = Astronomy.SearchRiseSet(body, observer, -1, date, 1);
  const sun  = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, date, 1); // sunset
  if (!rise || !set || !sun) return false;
  // Planet rises before midnight or is up during night hours
  return rise.date < sun.date || set.date > sun.date;
}

export function calculateConjunctions(lat, lng, daysAhead = 90, thresholdDeg = 5) {
  const conjunctions = [];
  const now = new Date();

  // Check every planet pair
  for (let i = 0; i < PLANETS.length; i++) {
    for (let j = i + 1; j < PLANETS.length; j++) {
      const pA = PLANETS[i];
      const pB = PLANETS[j];

      let minSep = Infinity;
      let minDate = null;

      // Scan day by day
      for (let d = 0; d <= daysAhead; d++) {
        const date = new Date(now.getTime() + d * 86400000);
        const sep  = getAngularSeparation(pA.body, pB.body, date);

        if (sep < minSep) {
          minSep = sep;
          minDate = date;
        }

        // Once separation starts growing past threshold, stop scanning this pair
        if (sep < thresholdDeg && d > 0) {
          const prevDate = new Date(now.getTime() + (d - 1) * 86400000);
          const prevSep  = getAngularSeparation(pA.body, pB.body, prevDate);
          if (sep > prevSep && minSep < thresholdDeg) break;
        }
      }

      if (minSep <= thresholdDeg && minDate) {
        const daysAway = Math.round((minDate - now) / 86400000);
        const visible  = isVisibleAtNight(pA.body, minDate, lat, lng);
        conjunctions.push({
          name:          `${pA.name}–${pB.name} Conjunction`,
          date:          minDate.toISOString().slice(0, 10),
          objects:       `${pA.name} & ${pB.name}`,
          needsTelescope: pA.needsTelescope || pB.needsTelescope,
          separation:    minSep.toFixed(2),
          daysAway,
          visibleFromLocation: visible,
          tip: `${pA.name} and ${pB.name} will be ${minSep.toFixed(1)}° apart.${pA.needsTelescope || pB.needsTelescope ? ' Telescope recommended.' : ' Visible to the naked eye.'}`,
        });
      }
    }
  }

  return conjunctions.sort((a, b) => a.daysAway - b.daysAway);
}