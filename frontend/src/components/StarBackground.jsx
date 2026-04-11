import { useEffect } from 'react';

/* ─── Configuration ───────────────────────────────────────────── */
const STAR_COUNT = 160;

/* ─── Generate star data at module load (runs once ever) ─────── */
const STARS = Array.from({ length: STAR_COUNT }, (_, i) => {
  const layer = i % 3; // 0 = deep/dim, 1 = mid, 2 = bright/large
  const size =
    layer === 0 ? 0.7 + Math.random() * 0.6
    : layer === 1 ? 1.1 + Math.random() * 0.9
    : 1.6 + Math.random() * 1.3;
  const base =
    layer === 0 ? 0.12 + Math.random() * 0.25
    : layer === 1 ? 0.25 + Math.random() * 0.40
    : 0.50 + Math.random() * 0.45;
  const peak    = Math.min(1, base + 0.35 + Math.random() * 0.3);
  const scale   = (0.75 + Math.random() * 0.5).toFixed(3);
  const dur     = (2.8 + Math.random() * 5.5).toFixed(2);
  // Negative delay = animation already in progress on mount (no pop-in sync)
  const delay   = (-(Math.random() * 9)).toFixed(2);
  const isBlue  = Math.random() > 0.82;
  const color   = isBlue ? 'rgba(186,230,253,1)' : 'rgba(240,246,255,1)';

  return { x: (Math.random() * 100).toFixed(3), y: (Math.random() * 100).toFixed(3), size: size.toFixed(1), base: base.toFixed(3), peak: peak.toFixed(3), scale, dur, delay, color };
});

/* ─── Build the entire CSS string ───────────────────────────────
   Called once; result stored in module scope so HMR keeps it stable.   */
function buildCSS() {
  const kf = `
@keyframes sf-twinkle {
  0%,100% { opacity: var(--b); transform: scale(1); }
  50%     { opacity: var(--p); transform: scale(var(--s)); }
}
@keyframes sf-comet {
  0%   { transform: translateX(-140px) translateY(0px) rotate(var(--a)); opacity:0; }
  4%   { opacity: 1; }
  85%  { opacity: 0.7; }
  100% { transform: translateX(115vw) translateY(55vh) rotate(var(--a)); opacity:0; }
}`;

  const starRules = STARS.map((st, i) => `
.sf-s${i}{--b:${st.base};--p:${st.peak};--s:${st.scale};
  position:absolute;left:${st.x}%;top:${st.y}%;
  width:${st.size}px;height:${st.size}px;border-radius:50%;
  background:${st.color};
  animation:sf-twinkle ${st.dur}s ease-in-out ${st.delay}s infinite;
  will-change:opacity,transform;}`).join('');

  const cometData = [
    { top: 6,  w: 110, dur: 20, delay: 2,  angle: 22 },
    { top: 18, w: 160, dur: 31, delay: 15, angle: 17 },
    { top: 34, w: 90,  dur: 24, delay: 40, angle: 25 },
  ];

  const cometRules = cometData.map((c, i) => `
.sf-c${i}{--a:${c.angle}deg;
  position:absolute;left:-150px;top:${c.top}%;
  width:${c.w}px;height:1.5px;border-radius:1px;
  background:linear-gradient(90deg,transparent 0%,rgba(186,230,253,0.95) 100%);
  animation:sf-comet ${c.dur}s linear ${c.delay}s infinite;
  will-change:transform,opacity;}
.sf-c${i}::after{content:'';position:absolute;right:-1px;top:-1.5px;
  width:4px;height:4px;border-radius:50%;
  background:rgba(255,255,255,0.95);}`).join('');

  return kf + starRules + cometRules;
}

const STAR_CSS = buildCSS();

/* ─── Component ─────────────────────────────────────────────── */
export default function Starfield() {
  useEffect(() => {
    if (document.getElementById('sf-styles')) return; // HMR guard
    const el = document.createElement('style');
    el.id = 'sf-styles';
    el.textContent = STAR_CSS;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {STARS.map((_, i) => <span key={i} className={`sf-s${i}`} />)}
      <span className="sf-c0" />
      <span className="sf-c1" />
      <span className="sf-c2" />
    </div>
  );
}