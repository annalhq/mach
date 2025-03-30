import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as CONFIG from "./core/config.js";
import {
  initializeScene,
  updateDayNightCycle,
  renderer,
  clock,
  scene,
  camera,
} from "./core/sceneSetup.js";
import { initializeWorld, updateWorld } from "./core/world.js";
import {
  initializePlayer,
  setupPlayerControls,
  updatePlayer,
  getPlayerStateForNetwork,
} from "./core/player.js";
import { updateCamera } from "./core/cameraControl.js";
import {
  initializeMultiplayer,
  sendUpdateToServerIfReady,
  displayError,
} from "./core/multiplayer.js";

// --- Global State (Minimal) ---
let loadingManager;
let loadedModelTemplate = null;
let loadedTextures = {
  road: null,
  cloud: null,
  grass: null,
};
let gameInitialized = false;

// --- DOM Elements ---
let loadingIndicator;

// --- Initialization ---
function init() {
  loadingIndicator = document.getElementById("loading-indicator");
  if (!loadingIndicator) {
    console.error("Loading indicator element not found!");
  }

  // Initialize basic scene components
  initializeScene(); // Creates scene, camera, renderer, clock, lights, stars

  // Start loading assets
  loadResources();
}

function showLoadingIndicator(show, message = "Loading...") {
  if (loadingIndicator) {
    loadingIndicator.textContent = message;
    loadingIndicator.style.display = show ? "block" : "none";
    // Reset error styles if hiding or showing normal loading
    if (show || !message.startsWith("Error:")) {
      loadingIndicator.style.color = "white";
      loadingIndicator.style.backgroundColor = "rgba(0,0,0,0.7)";
    }
  }
}

function loadResources() {
  showLoadingIndicator(true, "Loading Assets...");
  let itemsToLoad = 4; // Model + 3 Textures
  let itemsLoaded = 0;

  loadingManager = new THREE.LoadingManager(
    // --- All Loaded ---
    () => {
      console.log("All resources loaded.");
      showLoadingIndicator(false); // Hide after textures confirmed loaded too
      initializeGame(); // Proceed to game setup
    },
    // --- Progress ---
    (url, loaded, total) => {
      // Note: Manager progress might only track files it directly manages (like GLTF dependencies)
      // We manually track textures.
      // console.log(`Loading file: ${url} (${loaded}/${total})`);
      // updateLoadingProgress(); // Call manual progress update
    },
    // --- Error ---
    (url) => {
      console.error("Loading manager error for: " + url);
      showLoadingIndicator(true, `Error loading: ${url}. Please refresh.`);
      displayError(
        "Failed to load critical resources. Please check console and refresh."
      );
    }
  );

  const updateLoadingProgress = () => {
    itemsLoaded++;
    const progress = Math.round((itemsLoaded / itemsToLoad) * 100);
    showLoadingIndicator(true, `Loading Assets... ${progress}%`);
  };

  // --- Load Model ---
  const gltfLoader = new GLTFLoader(loadingManager);
  gltfLoader.load(
    CONFIG.MODEL_URL,
    (gltf) => {
      console.log("Aircraft model loaded.");
      loadedModelTemplate = gltf.scene;
      loadedModelTemplate.scale.set(
        CONFIG.MODEL_SCALE,
        CONFIG.MODEL_SCALE,
        CONFIG.MODEL_SCALE
      );
      loadedModelTemplate.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
        }
      });
      // Set default rotation (nose towards -Z, top towards +Y)
      loadedModelTemplate.rotation.set(0, Math.PI, 0);
      updateLoadingProgress();
    } /* Let manager handle progress/error */
  );

  // --- Load Textures ---
  const textureLoader = new THREE.TextureLoader(); // Use a separate loader or add to manager's scope

  // Road Texture
  textureLoader.load(
    CONFIG.ROAD_TEXTURE_URL,
    (texture) => {
      console.log("Road texture loaded.");
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      loadedTextures.road = texture;
      updateLoadingProgress();
    },
    undefined,
    (err) => {
      console.error("Failed to load road texture:", err);
      itemsToLoad--; /* Failed */
    }
  );

  // Cloud Texture
  textureLoader.load(
    CONFIG.CLOUD_TEXTURE_URL,
    (texture) => {
      console.log("Cloud texture loaded.");
      loadedTextures.cloud = texture; // Store globally for world.js
      updateLoadingProgress();
    },
    undefined,
    (err) => {
      console.error("Failed to load cloud texture:", err);
      itemsToLoad--;
    }
  );

  // Grass Texture
  textureLoader.load(
    CONFIG.GRASS_TEXTURE_URL,
    (texture) => {
      console.log("Ground texture loaded.");
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      const repeats = CONFIG.GROUND_SIZE / 100; // Adjust divisor based on texture size/look
      texture.repeat.set(repeats, repeats);
      loadedTextures.grass = texture;
      updateLoadingProgress();
    },
    undefined,
    (err) => {
      console.error("Failed to load grass texture:", err);
      itemsToLoad--;
    }
  );

  // Check if loading manager needs manual trigger if no files assigned
  if (itemsToLoad === 0) {
    // Edge case if all textures fail instantly?
    loadingManager.onLoad();
  }
}

async function initializeGame() {
  // Make async for world init
  if (gameInitialized) return; // Prevent double initialization

  if (
    !loadedModelTemplate ||
    !loadedTextures.road ||
    !loadedTextures.cloud ||
    !loadedTextures.grass
  ) {
    console.error("Essential resources not ready for game initialization!");
    showLoadingIndicator(
      true,
      "Error: Missing essential assets. Cannot start."
    );
    displayError("Failed to load necessary assets. Please refresh.");
    return;
  }

  console.log("Initializing game...");

  // Initialize World (async)
  await initializeWorld(loadedTextures); // Pass loaded textures

  // Initialize Player (pass loaded model)
  initializePlayer(loadedModelTemplate);

  // Setup Controls
  setupPlayerControls();

  // Initialize Multiplayer (pass loaded model for cloning others)
  initializeMultiplayer(loadedModelTemplate);

  // Start the animation loop
  gameInitialized = true;
  animate();
  console.log("Game initialized and animation loop started.");
}

// --- Game Loop ---
function animate() {
  if (!gameInitialized) return; // Stop loop if game hasn't started

  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();

  // Update game components
  updatePlayer(deltaTime);
  updateCamera(deltaTime);
  updateWorld(deltaTime); // Update clouds, etc.
  updateDayNightCycle(deltaTime);

  // Multiplayer updates
  const playerData = getPlayerStateForNetwork();
  sendUpdateToServerIfReady(playerData);

  // Render the scene
  renderer.render(scene, camera);
}

// --- Start the application ---
init();
