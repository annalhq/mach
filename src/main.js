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
import {
  getCurrentAircraft,
  selectAircraft,
  AIRCRAFT_TYPES,
} from "./core/aircraftConfig.js";
import { initializeAircraftUI } from "./core/ui.js";

let loadingManager;
let loadedModelTemplate = null;
let loadedTextures = {
  road: null,
  cloud: null,
  grass: null,
};
let gameInitialized = false;

let loadingIndicator;

function init() {
  loadingIndicator = document.getElementById("loading-indicator");
  if (!loadingIndicator) {
    console.error("Loading indicator element not found!");
  }

  initializeScene();
  loadResources();
}

function showLoadingIndicator(show, message = "Loading...") {
  if (loadingIndicator) {
    loadingIndicator.textContent = message;
    loadingIndicator.style.display = show ? "block" : "none";

    if (show || !message.startsWith("Error:")) {
      loadingIndicator.style.color = "white";
      loadingIndicator.style.backgroundColor = "rgba(0,0,0,0.7)";
    }
  }
}

function loadResources() {
  showLoadingIndicator(true, "Loading Assets...");
  let itemsToLoad = 4;
  let itemsLoaded = 0;

  loadingManager = new THREE.LoadingManager(
    () => {
      console.log("All resources loaded.");
      showLoadingIndicator(false);
      initializeGame();
    },

    (url, loaded, total) => {},
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

  // --- Model loader ---
  const gltfLoader = new GLTFLoader(loadingManager);
  const aircraftConfig = getCurrentAircraft();

  console.log(`Loading selected aircraft: ${aircraftConfig.name}`);

  gltfLoader.load(aircraftConfig.modelUrl, (gltf) => {
    console.log(`Aircraft model ${aircraftConfig.name} loaded.`);
    loadedModelTemplate = gltf.scene;
    loadedModelTemplate.scale.set(
      aircraftConfig.scale,
      aircraftConfig.scale,
      aircraftConfig.scale
    );
    loadedModelTemplate.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
      }
    });
    loadedModelTemplate.rotation.set(0, Math.PI, 0);
    updateLoadingProgress();
  });

  const textureLoader = new THREE.TextureLoader();

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
      itemsToLoad--;
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
      const repeats = CONFIG.GROUND_SIZE / 100;
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

  if (itemsToLoad === 0) {
    // Edge case if all textures fail instantly
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

  await initializeWorld(loadedTextures);
  initializePlayer(loadedModelTemplate);

  setupPlayerControls();

  initializeMultiplayer(loadedModelTemplate);

  initializeAircraftUI();

  gameInitialized = true;
  animate();
  console.log("Game initialized and animation loop started.");
}

function animate() {
  if (!gameInitialized) return;

  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();

  updatePlayer(deltaTime);
  updateCamera(deltaTime);
  updateWorld(deltaTime);
  updateDayNightCycle(deltaTime);

  const playerData = getPlayerStateForNetwork();
  sendUpdateToServerIfReady(playerData);

  renderer.render(scene, camera);
}

init();
