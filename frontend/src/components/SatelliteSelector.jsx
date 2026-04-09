import { useSatellite } from '../context/SatelliteContext';

export default function SatelliteSelector() {
  const { selected, setSelected, satellites } = useSatellite();

  return (
    <div className="satellite-selector">
      <label>Tracking:</label>
      <select
        value={selected.noradId}
        onChange={(e) => {
          const sat = satellites.find(s => s.noradId === Number(e.target.value));
          setSelected(sat);
        }}
      >
        {satellites.map(s => (
          <option key={s.noradId} value={s.noradId}>
            {s.name} — {s.altitude} km
          </option>
        ))}
      </select>
    </div>
  );
}