import * as THREE from "three";
// Note: OrbitControls are useful for debugging, but not part of the core flight controls
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Configuration ---
export const WEBSOCKET_URL = `ws://${window.location.hostname}:8080`;
export const PLAYER_UPDATE_INTERVAL = 100; // ms (10 updates per second)
export const BASE_SPEED = 100; // units per second (adjust scale as needed)
export const MAX_BASE_SPEED = 500;
export const AFTERBURNER_MULTIPLIER = 3;
export const ACCELERATION = 80; // units per second^2
export const BRAKING = 100;
export const ROLL_SPEED = 1.5; // radians per second
export const PITCH_SPEED = 1.0;
export const YAW_SPEED = 0.5;
export const DAMPENING = 0.95; // Reduces rotational velocity over time
export const CAMERA_BASE_FOV = 75;
export const CAMERA_MAX_FOV_INCREASE = 25;
export const CAMERA_FOLLOW_DISTANCE = 15;
export const CAMERA_FOLLOW_HEIGHT = 5;
export const CITY_SIZE = 4000; // Width/Depth of the city area
export const BUILDING_COUNT = 800;
export const MAX_BUILDING_HEIGHT = 400;
export const MIN_BUILDING_HEIGHT = 50;
export const BUILDING_SIZE_MIN = 20;
export const BUILDING_SIZE_MAX = 60;
export const DAY_NIGHT_DURATION = 60 * 5; // 5 minutes for a full cycle
export const COLLISION_CHECKS_PER_FRAME = 3; // How many rays to cast for collision
