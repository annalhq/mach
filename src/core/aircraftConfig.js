import * as CONFIG from "./config.js";

export const AIRCRAFT_TYPES = {
  SHENYANG_J11: "shenyang_j11",
  F35_LIGHTNING: "f35_lightning",
  EUROFIGHTER_TYPHOON: "eurofighter_typhoon",
};

export const AIRCRAFT_CONFIGS = {
  [AIRCRAFT_TYPES.SHENYANG_J11]: {
    name: "Shenyang J-11",
    description: "Chinese multirole fighter aircraft",
    modelUrl: `${CONFIG.ASSETS_DIR}/jets/shenyang_j-11.glb`,
    scale: 0.8,
    maxSpeed: CONFIG.PLAYER_SPEED,
    acceleration: 1.0,
    handling: 1.0,
    color: 0xcccccc,
  },
  [AIRCRAFT_TYPES.F35_LIGHTNING]: {
    name: "F-35 Lightning II",
    description: "American stealth multirole combat aircraft",
    modelUrl: `${CONFIG.ASSETS_DIR}/jets/f35-lightning2.glb`,
    scale: 0.09,
    maxSpeed: CONFIG.PLAYER_SPEED * 1.3,
    acceleration: 1.3,
    handling: 0.9,
    color: 0xdddddd,
  },
  [AIRCRAFT_TYPES.EUROFIGHTER_TYPHOON]: {
    name: "Eurofighter Typhoon",
    description: "European multirole fighter",
    modelUrl: `${CONFIG.ASSETS_DIR}/jets/eurofighter_typhoon_fighter_jet.glb`,
    scale: 5.0,
    maxSpeed: CONFIG.PLAYER_SPEED * 1.07,
    acceleration: 2.0,
    handling: 1.1,
    color: 0xefefef,
  },
};

// yeh hain default aircraft
const defaultAircraft = AIRCRAFT_TYPES.EUROFIGHTER_TYPHOON;

let currentAircraftType =
  localStorage.getItem("selectedAircraftType") ||
  defaultAircraft;

if (!AIRCRAFT_CONFIGS[currentAircraftType]) {
  currentAircraftType = AIRCRAFT_TYPES.EUROFIGHTER_TYPHOON;
  localStorage.setItem("selectedAircraftType", currentAircraftType);
}

/**
 * Get the currently selected aircraft configuration
 * @returns {Object} Current aircraft configuration
 */
export function getCurrentAircraft() {
  return AIRCRAFT_CONFIGS[currentAircraftType];
}

/**
 * Change the current aircraft selection
 * @param {string} aircraftType - Aircraft type from AIRCRAFT_TYPES
 * @returns {boolean} Success status
 */
export function selectAircraft(aircraftType) {
  if (AIRCRAFT_CONFIGS[aircraftType]) {
    currentAircraftType = aircraftType;
    // Store the selection in localStorage
    localStorage.setItem("selectedAircraftType", aircraftType);
    return true;
  }
  console.error(`Invalid aircraft type: ${aircraftType}`);
  return false;
}

/**
 * Get a list of all available aircraft
 * @returns {Array} List of aircraft configurations
 */
export function getAvailableAircraft() {
  return Object.keys(AIRCRAFT_CONFIGS).map((key) => ({
    id: key,
    ...AIRCRAFT_CONFIGS[key],
  }));
}
