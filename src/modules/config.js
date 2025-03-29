// Note: OrbitControls are useful for debugging, but not part of the core flight controls
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- My base main configuration ---


// -- Network --
export const WEBSOCKET_URL = `ws://${window.location.hostname}:8080`; // Adjust if server is elsewhere
export const PLAYER_UPDATE_INTERVAL = 100; // ms (10 updates per second)

// -- Player Physics & Control --
export const BASE_SPEED = 100; // units per second
export const MAX_BASE_SPEED = 500;
export const AFTERBURNER_MULTIPLIER = 3;
export const ACCELERATION = 80; // units per second^2
export const BRAKING = 100;
export const ROLL_SPEED = 1.5; // radians per second
export const PITCH_SPEED = 1.0;
export const YAW_SPEED = 0.5;
export const DAMPENING = 0.95; // Reduces rotational velocity over time

// -- Camera --
export const CAMERA_BASE_FOV = 75;
export const CAMERA_MAX_FOV_INCREASE = 25;
export const CAMERA_FOLLOW_DISTANCE = 15;
export const CAMERA_FOLLOW_HEIGHT = 5;
export const CAMERA_LERP_FACTOR = 0.08; // Smoothing factor for camera movement

// -- World Generation --
export const CITY_SIZE = 4000; // Width/Depth of the city area
export const BUILDING_COUNT = 800;
export const MAX_BUILDING_HEIGHT = 400;
export const MIN_BUILDING_HEIGHT = 50;
export const BUILDING_SIZE_MIN = 20;
export const BUILDING_SIZE_MAX = 60;
export const STAR_COUNT = 5000;
export const STAR_FIELD_RADIUS = 15000;

// -- Environment --
export const DAY_NIGHT_DURATION = 60 * 5; // 5 minutes for a full cycle

// -- Gameplay / Misc --
export const COLLISION_CHECKS_PER_FRAME = 3; // How many rays to cast for collision per frame
export const COLLISION_DISTANCE_BUFFER = 5; // Base distance for collision checks
export const COLLISION_SPEED_FACTOR = 0.5; // How much speed affects collision check distance