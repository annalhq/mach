export const WEBSOCKET_URL = `ws://${window.location.hostname}:8080`;
export const PLAYER_UPDATE_INTERVAL = 100; // ms (Client send rate: 10 Hz)

// -- Player Physics & Control --
export const PLAYER_BASE_SPEED = 200.0;
export const AFTERBURNER_MULTIPLIER = 3.0;
export const ROLL_SPEED = Math.PI * 1.0;
export const PITCH_SPEED = Math.PI * 0.8;
export const YAW_SPEED = Math.PI * 0.5;
export const DAMPING = 0.95;
export const ROTATIONAL_DAMPING = 0.92;
export const MIN_SPEED = 5.0;

// -- Camera --
export const CAMERA_BASE_FOV = 75;
export const CAMERA_MAX_FOV_BOOST = 25; // Additional FOV at max speed boost
export const CAMERA_LERP_FACTOR = 0.1; // Smoothing factor for camera movement (0-1)
export const CAMERA_OFFSET = { x: 0, y: 2.5, z: 12 }; // Relative position behind player (Positive Z is behind)

// -- World Generation --
export const GROUND_SIZE = 8000;
export const GROUND_SEGMENTS = 100;
export const TERRAIN_AMPLITUDE = 60;
export const TERRAIN_FREQUENCY = (10 * Math.PI * 2) / GROUND_SIZE; // wavy

// -- Environment Assets --
export const BUILDING_COUNT = 200;
export const MAX_BUILDING_HEIGHT = 400;
export const MIN_BUILDING_HEIGHT = 50;
export const HOUSE_CLUSTERS = 20;
export const POND_COUNT = 30;
export const LANDMARK_COUNT = 0; // Set to 0 if specific landmarks are added manually
export const TREE_COUNT = 2000; 
export const TRUNK_HEIGHT = 10;
export const TRUNK_RADIUS = 2.0;
export const FOLIAGE_HEIGHT = 20;
export const FOLIAGE_RADIUS = 8;
export const CLOUD_COUNT = 250;
export const CLOUD_SIZE = 1200;
export const CLOUD_ALTITUDE_MIN = 700;
export const CLOUD_ALTITUDE_MAX = 1300;
export const CLOUD_AREA_XZ = GROUND_SIZE * 1.5;
export const CLOUD_DRIFT_SPEED = 6.0;
export const ROAD_COUNT = 8;
export const ROAD_WIDTH = 30;
export const ROAD_MIN_LENGTH = 800;
export const ROAD_MAX_LENGTH = 2500;
export const ROAD_SEGMENT_LENGTH = 15;
export const ROAD_THICKNESS_OFFSET = 0.2; // Place roads slightly above terrain
export const STAR_COUNT = 5000;
export const STAR_FIELD_RADIUS = 15000;

// -- Day/Night Cycle --
export const DAY_NIGHT_CYCLE_MINUTES = 20;

// -- Assets --
export const ASSETS_DIR = "/assets/"; 
export const MODEL_URL = `${ASSETS_DIR}shenyang_j-11.glb`;
export const MODEL_SCALE = 0.8; // model specific

// Correct orientation for J-11 model
export const MODEL_INIT_ROTATION = { x: 0, y: Math.PI, z: 0 }; // Rotate 180 deg on Y
export const OTHER_PLAYER_COLOR = 0x00aaff;
export const CLOUD_TEXTURE_URL = `${ASSETS_DIR}cloud10.png`;
export const ROAD_TEXTURE_URL = `${ASSETS_DIR}road.jpg`;
export const GRASS_TEXTURE_URL = "/textures/terrain/grasslight-big.jpg";


// -- Gameplay / Misc --
export const COLLISION_DISTANCE_BUFFER = 5;
export const COLLISION_SPEED_FACTOR = 0.1;