import Aurora from './Aurora'

export default function CelestialOverlay() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        /* z-index 1: above the hero background image (z-index 0),
           below all text and card content (z-index 3+) */
        zIndex: 10,
        pointerEvents: 'none',
        opacity: 0.7,
        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 85%)',
        maskImage:        'linear-gradient(to bottom, black 0%, black 50%, transparent 85%)',
      }}
    >
      <Aurora
        colorStops={['#67e8f9', '#c084fc', '#38bdf8']}
        amplitude={1.1}
        blend={0.6}
        speed={0.4}
      />
    </div>
  )
}