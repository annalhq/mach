// src/main.js
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { initializeScene, handleResize } from "./core/sceneSetup.js";
import {
  initializeWorld,
  updateWorld,
  loadWorldAssets,
  getTerrainHeight,
} from "./core/world.js"; // Import load function
import {
  createPlayerAircraft,
  updatePlayer,
  checkCollisions,
  getPlayerVelocity,
} from "./core/player.js";
import { updateCamera } from "./core/cameraControls.js";
import {
  initializeMultiplayer,
  sendStateIfNeeded,
  cleanupInactivePlayers,
  updateOtherPlayers,
} from "./core/multiplayer.js";
import {
  updateGameUI,
  showLoadingIndicator,
  displayError,
  updatePlayerCountUI,
} from "./ui.js";
import {
  DAY_NIGHT_CYCLE_MINUTES,
  MODEL_URL,
  MODEL_SCALE,
} from "./core/config.js"; // Import necessary configs

let scene, camera, renderer, clock;
let skyLight, sunLight, ambientLight;
let playerAircraft = null;
let worldData = { buildingBoundingBoxes: [], clouds: null };
let assetRefs = { playerModelTemplate: null }; // Store only the essential model template ref here
let gameInitialized = false;
let sunAngle = Math.PI / 3; // Start slightly later in the morning

function runGame() {
  console.log("Starting Vibe Jet...");
  clock = new THREE.Clock();
  const sceneComps = initializeScene();
  scene = sceneComps.scene;
  camera = sceneComps.camera;
  renderer = sceneComps.renderer;
  skyLight = sceneComps.skyLight;
  sunLight = sceneComps.sunLight;
  ambientLight = sceneComps.ambientLight;
  window.addEventListener(
    "resize",
    () => handleResize(camera, renderer),
    false
  );

  loadAssetsAndInitialize()
    .then(() => {
      gameInitialized = true;
      showLoadingIndicator(false);
      console.log("Initialization complete. Starting loop.");
      animate();
    })
    .catch((error) => {
      console.error("Game Initialization Failed:", error);
      showLoadingIndicator(false);
      displayError(`Initialization Failed: ${error.message || error}`);
    });
}

async function loadAssetsAndInitialize() {
  showLoadingIndicator(true, "Loading Assets...");
  const loadingManager = new THREE.LoadingManager();
  loadingManager.onProgress = (url, loaded, total) =>
    console.log(`Loading: ${url} (${loaded}/${total})`);
  loadingManager.onError = (url) => console.error(`Loading Error: ${url}`);

  try {
    // --- Load Assets Concurrently ---
    const loadPromises = [
      loadPlayerModel(loadingManager),
      loadWorldAssets(loadingManager), // Returns { roadTexture, grassTexture }
    ];
    const [modelTemplate, worldTextures] = await Promise.all(loadPromises);

    // Store loaded refs
    assetRefs.playerModelTemplate = modelTemplate;
    // Pass textures directly to world initializer
    worldData = initializeWorld(
      scene,
      worldTextures.grassTexture,
      worldTextures.roadTexture
    );

    // --- Initialize Components AFTER assets are ready ---
    playerAircraft = createPlayerAircraft(scene, assetRefs.playerModelTemplate);
    if (!playerAircraft) throw new Error("Failed to create player aircraft");

    initializeMultiplayer(scene, assetRefs.playerModelTemplate);

    updatePlayerCountUI(1);
    updateGameUI(0, playerAircraft.position.y);
  } catch (error) {
    throw error; // Propagate error up
  }
}

function loadPlayerModel(manager) {
  return new Promise((resolve, reject) => {
    console.log("Loading player model...");
    const loader = new GLTFLoader(manager);
    loader.load(
      MODEL_URL,
      (gltf) => {
        console.log("Player model loaded.");
        const template = gltf.scene;
        template.scale.set(MODEL_SCALE, MODEL_SCALE, MODEL_SCALE);
        template.traverse((child) => {
          if (child.isMesh) child.castShadow = true;
        });
        resolve(template);
      },
      undefined,
      (error) => {
        console.error("Player model load error:", error);
        reject(error);
      }
    );
  });
}

function updateDayNightCycle(deltaTime) {
  if (!skyLight || !sunLight || !ambientLight || !scene?.fog || !renderer)
    return;
  const cycleSpeed = (2 * Math.PI) / (DAY_NIGHT_CYCLE_MINUTES * 60);
  sunAngle = (sunAngle + cycleSpeed * deltaTime) % (2 * Math.PI);
  const sunY = Math.sin(sunAngle);
  const sunX = Math.cos(sunAngle);
  sunLight.position.set(sunX * 2500, sunY * 2000, 1500);
  sunLight.target.position.set(0, 0, 0);
  const dayIntensity = Math.max(0, sunY);
  const nightIntensity = Math.max(0, -sunY);
  sunLight.intensity = dayIntensity * 1.5;
  skyLight.intensity = 0.15 + dayIntensity * 0.5 + nightIntensity * 0.1; // Adjusted balance
  ambientLight.intensity = 0.1 + dayIntensity * 0.15;

  const daySky = new THREE.Color(0x87ceeb);
  const nightSky = new THREE.Color(0x000f23);
  const sunsetCol = new THREE.Color(0xffa500);
  const dayFog = new THREE.Color(0xcce0ff);
  const nightFog = new THREE.Color(0x050a1a);
  const blend = (sunY + 1) / 2;
  const currentSky = new THREE.Color().lerpColors(nightSky, daySky, blend);
  const sunsetGlow = Math.sin(blend * Math.PI);
  currentSky.lerp(sunsetCol, sunsetGlow * 0.25); // Less intense sunset blend
  skyLight.color.copy(currentSky);
  skyLight.groundColor.set(0x556b2f).lerp(nightSky, nightIntensity * 0.7); // Greener ground color
  scene.fog.color.lerpColors(nightFog, dayFog, blend);
  scene.fog.near = 600 + nightIntensity * 1000; // Adjusted fog distance
  scene.fog.far = 16000 - nightIntensity * 6000;
  renderer.setClearColor(currentSky.clone().multiplyScalar(0.7)); // Slightly darker background
}

function animate() {
  if (!gameInitialized) return;
  requestAnimationFrame(animate);
  const deltaTime = clock.getDelta();
  const playerState = updatePlayer(deltaTime);
  if (playerState) checkCollisions(worldData.buildingBoundingBoxes);
  updateOtherPlayers(deltaTime);
  updateWorld(deltaTime);
  if (playerAircraft) updateCamera(camera, playerAircraft);
  updateDayNightCycle(deltaTime);
  sendStateIfNeeded();
  if (Math.random() < deltaTime * 0.1) cleanupInactivePlayers();
  if (playerState)
    updateGameUI(playerState.velocity.length(), playerState.position.y);
  renderer.render(scene, camera);
}

runGame(); // Start the process
