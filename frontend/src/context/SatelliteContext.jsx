import { createContext, useContext, useState } from 'react';
import { DEMO_SATELLITES } from '../utils/constants';

const SatelliteContext = createContext();

export function SatelliteProvider({ children }) {
  const [selected, setSelected] = useState(DEMO_SATELLITES[0]);
  return (
    <SatelliteContext.Provider value={{ selected, setSelected, satellites: DEMO_SATELLITES }}>
      {children}
    </SatelliteContext.Provider>
  );
}

export const useSatellite = () => useContext(SatelliteContext);