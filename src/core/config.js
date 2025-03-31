export const WEBSOCKET_URL = "ws://localhost:8080";
export const PLAYER_SPEED = 200.0;
export const AFTERBURNER_MULTIPLIER = 3.0;
export const ROLL_SPEED = Math.PI * 1.0;
export const PITCH_SPEED = Math.PI * 0.8;
export const YAW_SPEED = Math.PI * 0.5;
export const DAMPING = 0.95;
export const CAMERA_BASE_FOV = 75;
export const CAMERA_MAX_FOV_BOOST = 25;
export const UPDATE_INTERVAL_MS = 100;
export const GROUND_SIZE = 8000;
export const GROUND_SEGMENTS = 100;
export const BUILDING_COUNT = 200;
export const MAX_BUILDING_HEIGHT = 400;
export const MIN_BUILDING_HEIGHT = 50;
export const STAR_COUNT = 5000;
export const DAY_NIGHT_CYCLE_MINUTES = 10;
export const ASSETS_DIR = "/assets/";
export const OTHER_PLAYER_COLOR = 0x00aaff;

// --- Terrain & Tree---
export const TERRAIN_AMPLITUDE = 50;
export const TERRAIN_FREQUENCY = (8 * Math.PI * 2) / GROUND_SIZE;
export const TREE_COUNT = 7000;
export const TRUNK_HEIGHT = 10;
export const TRUNK_RADIUS = 2.0;
export const FOLIAGE_HEIGHT = 20;
export const FOLIAGE_RADIUS = 8;

// --- Cloud ---
export const CLOUD_COUNT = 200;
export const CLOUD_SIZE = 1000;
export const CLOUD_ALTITUDE_MIN = 600;
export const CLOUD_ALTITUDE_MAX = 1200;
export const CLOUD_AREA_XZ = GROUND_SIZE * 1.5;
export const CLOUD_DRIFT_SPEED = 5.0;
export const CLOUD_TEXTURE_URL = `${ASSETS_DIR}cloud10.png`;

// --- Road  ---
export const ROAD_COUNT = 5;
export const ROAD_WIDTH = 30;
export const ROAD_MIN_LENGTH = 1000;
export const ROAD_MAX_LENGTH = 2000;
export const ROAD_SEGMENT_LENGTH = 10;
export const ROAD_THICKNESS_OFFSET = 0.2;
export const ROAD_TEXTURE_URL = `${ASSETS_DIR}road.jpg`;
export const GRASS_TEXTURE_URL = "/assets/grass-texture.jpg";
export const HOLLYWOOD_FONT_URL = "/assets/hollywood.ttf";
