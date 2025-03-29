// src/main.js
import * as THREE from "three";
import { initializeScene, handleResize } from "./modules/sceneSetup.js";
import { createWorldElements } from "./modules/world.js";
import { createPlayerAircraft, updatePlayer } from "./modules/player.js";
import { updateCamera } from "./modules/cameraControls.js";
import {
  connectWebSocket,
  sendStateIfNeeded,
  cleanupInactivePlayers,
} from "./modules/multiplayer.js";
import { updateGameUI } from "./modules/ui.js";
import { DAY_NIGHT_DURATION } from "./modules/config.js";

// --- Module Scope Variables ---
let scene, camera, renderer, clock;
let directionalLight, hemisphereLight, ambientLight; // Keep light refs for day/night
let playerAircraft, cameraTarget;
let worldElements = {
  // Store references to world items
  buildingMesh: null,
  starField: null,
  moon: null,
};
let lastPlayerState = null; // Store the state returned by updatePlayer

// --- Initialization Function ---
function init() {
  console.log("Initializing game...");
  clock = new THREE.Clock();

  // Scene, Camera, Renderer, Lights
  const sceneComponents = initializeScene();
  scene = sceneComponents.scene;
  camera = sceneComponents.camera;
  renderer = sceneComponents.renderer;
  directionalLight = sceneComponents.directionalLight;
  hemisphereLight = sceneComponents.hemisphereLight;
  ambientLight = sceneComponents.ambientLight; // Get ambient light ref

  // World Elements (Ground, City, Stars)
  worldElements = createWorldElements(scene); // Assign returned refs

  // Player Aircraft
  const playerComponents = createPlayerAircraft(scene);
  playerAircraft = playerComponents.playerAircraft;
  cameraTarget = playerComponents.cameraTarget;

  // Multiplayer Connection
  connectWebSocket(scene); // Pass scene reference

  // Event Listeners
  window.addEventListener(
    "resize",
    () => handleResize(camera, renderer),
    false
  );
  // Keyboard handled within player.js

  console.log("Initialization complete. Starting animation loop.");
  // Start the main game loop
  animate();
}

// --- Day/Night Cycle Update ---
function updateDayNightCycle(gameTime) {
  // Ensure all required components exist
  if (
    !directionalLight ||
    !hemisphereLight ||
    !ambientLight ||
    !worldElements ||
    !scene ||
    !camera
  )
    return;

  const cycleProgress = (gameTime % DAY_NIGHT_DURATION) / DAY_NIGHT_DURATION; // Normalized time (0 to 1)
  const sunAngle = cycleProgress * Math.PI * 2; // Angle from 0 to 2*PI

  // --- Sun Position ---
  // Calculate position based on angle (simple circular path)
  const sunX = CITY_SIZE * 1.0 * Math.cos(sunAngle);
  const sunY = CITY_SIZE * 0.8 * Math.sin(sunAngle); // Sun rises in the east (positive sin)
  const sunZ = CITY_SIZE * 0.4 * Math.sin(sunAngle - Math.PI / 4); // Add some north-south movement
  directionalLight.position.set(sunX, sunY, sunZ);
  directionalLight.target.position.set(0, 0, 0); // Keep sun pointing at the origin

  // --- Light Intensity & Color ---
  const sunElevation = Math.sin(sunAngle); // Ranges from -1 (midnight) to 1 (midday)
  // Intensity factor: 0 at night, peaks at 1 during the day. Use smoothstep for softer transitions.
  const dayIntensity = THREE.MathUtils.smoothstep(sunElevation, -0.2, 0.2); // Sun is bright when above horizon

  directionalLight.intensity = 1.2 * dayIntensity; // Max intensity
  ambientLight.intensity = 0.15 + 0.2 * dayIntensity; // Ambient slightly brighter during day

  // --- Sky Color ---
  const daySkyColor = new THREE.Color(0x87ceeb); // Light blue
  const nightSkyColor = new THREE.Color(0x000f23); // Very dark blue/black
  const sunsetSkyColor = new THREE.Color(0xffa500); // Orange/Yellow for sunset/sunrise

  const horizonColorDay = new THREE.Color(0xd8e1ff); // Lighter blue near horizon
  const horizonColorNight = new THREE.Color(0x0a0a20); // Dark purple/grey horizon
  const horizonColorSunset = new THREE.Color(0xfd8955); // Orangey-pink horizon

  // Blend colors based on sun elevation
  let skyLerp = (sunElevation + 0.2) / 1.2; // Normalize roughly to 0-1 during day
  skyLerp = THREE.MathUtils.clamp(skyLerp, 0, 1);

  const tempSkyColor = new THREE.Color();
  const tempHorizonColor = new THREE.Color();

  // Blend between night and sunset/sunrise
  if (skyLerp < 0.5) {
    // Morning or Evening transition
    const transitionLerp = skyLerp / 0.5; // 0 -> 1 as we go from night to peak sunrise/sunset
    tempSkyColor.lerpColors(nightSkyColor, sunsetSkyColor, transitionLerp);
    tempHorizonColor.lerpColors(
      horizonColorNight,
      horizonColorSunset,
      transitionLerp
    );
  } else {
    // Blend between sunset/sunrise and full day
    const transitionLerp = (skyLerp - 0.5) / 0.5; // 0 -> 1 as we go from peak sunrise/sunset to midday
    tempSkyColor.lerpColors(sunsetSkyColor, daySkyColor, transitionLerp);
    tempHorizonColor.lerpColors(
      horizonColorSunset,
      horizonColorDay,
      transitionLerp
    );
  }

  hemisphereLight.color.copy(tempSkyColor);
  hemisphereLight.groundColor.copy(tempHorizonColor);
  hemisphereLight.intensity = 0.4 + 0.6 * dayIntensity; // Dimmer at night

  // Scene background gradient or color (optional)
  if (!scene.background || !(scene.background instanceof THREE.Color)) {
    scene.background = new THREE.Color(); // Initialize if needed
  }
  scene.background.copy(tempSkyColor); // Match hemisphere sky color

  // --- Stars and Moon ---
  if (worldElements.starField && worldElements.starField.material) {
    // Stars fade in as sun sets. Fully visible when sun is well below horizon.
    const starsOpacity = THREE.MathUtils.smoothstep(sunElevation, 0.0, -0.3); // Fade in faster
    worldElements.starField.material.opacity = starsOpacity;
    // Subtle parallax effect for stars (optional)
    // worldElements.starField.position.copy(camera.position).multiplyScalar(0.01);
  }

  if (worldElements.moon) {
    const moonVisibility = THREE.MathUtils.smoothstep(
      sunElevation,
      -0.05,
      -0.25
    ); // Visible when sun is low
    worldElements.moon.visible = moonVisibility > 0.01;
    if (
      worldElements.moon.visible &&
      worldElements.moon.material instanceof THREE.MeshBasicMaterial
    ) {
      // Optional: Make moon slightly brighter when sun is fully down
      worldElements.moon.material.color.setScalar(0.8 + 0.2 * moonVisibility);
    }
    // Optional: Make moon move across sky (simple rotation example)
    // worldElements.moon.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), deltaTime * 0.01);
  }
}

// --- Main Animation Loop ---
function animate() {
  // Request the next frame
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();
  const gameTime = clock.getElapsedTime();

  // Update player (movement, controls, collision)
  // Pass buildingMesh for collision checks
  if (playerAircraft) {
    lastPlayerState = updatePlayer(deltaTime, worldElements.buildingMesh);
  }

  // Update camera (position, lookAt, FOV) based on player state
  if (lastPlayerState) {
    updateCamera(
      camera,
      playerAircraft,
      cameraTarget,
      lastPlayerState.speed,
      lastPlayerState.isAfterburner
    );
    // Update UI based on fresh player state
    updateGameUI(lastPlayerState.speed, lastPlayerState.position.y);
  } else {
    // Update UI with default values if player state isn't available (e.g., before init)
    updateGameUI(0, playerAircraft ? playerAircraft.position.y : 0);
  }

  // Update day/night cycle simulation
  updateDayNightCycle(gameTime);

  // Send player state over WebSocket (throttled)
  sendStateIfNeeded();

  // Cleanup inactive players (client-side fallback, less frequent)
  // Run approx once per second on average
  if (Math.random() < deltaTime) {
    // Chance increases with lower frame rates
    cleanupInactivePlayers();
  }

  // Render the scene
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

// --- Start the Application ---
init();
