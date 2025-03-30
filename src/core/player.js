import * as THREE from "three";
import * as CONFIG from "./config.js";
import { scene, camera } from "./sceneSetup.js"; // Import camera as well
import { buildingBoundingBoxes } from "./world.js"; // Import collision data
import { getCurrentAircraft } from "./aircraftConfig.js"; // Import aircraft config

let playerAircraft = null;
let playerVelocity = new THREE.Vector3();
let playerAngularVelocity = new THREE.Vector3();
let controls = {
  forward: 0,
  backward: 0,
  left: 0,
  right: 0,
  up: 0,
  down: 0,
  rollLeft: 0,
  rollRight: 0,
  boost: 0,
};
let isColliding = false;

// DOM Elements for UI
let speedElement, altitudeElement;

function initializePlayer(loadedModelTemplate) {
  if (!loadedModelTemplate) {
    console.error(
      "Cannot create player aircraft, model template not provided."
    );
    // Maybe create a fallback placeholder?
    const geometry = new THREE.ConeGeometry(2, 8, 8);
    geometry.rotateX(Math.PI / 2);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0x330000,
    });
    playerAircraft = new THREE.Mesh(geometry, material);
  } else {
    console.log("Creating player aircraft from template...");
    playerAircraft = loadedModelTemplate.clone(); // Use SkeletonUtils.clone if animated

    // Apply aircraft-specific configuration
    const aircraftConfig = getCurrentAircraft();
    // Adjust aircraft properties based on selected type
    // Scale is already applied to the template in main.js
  }

  playerAircraft.position.set(0, 50, 0); // Start position
  playerAircraft.castShadow = true; // Ensure cloned object casts shadows too
  scene.add(playerAircraft);
  console.log("Player aircraft added to scene at", playerAircraft.position);

  // Initialize physics vectors *after* mesh exists
  playerVelocity = new THREE.Vector3();
  playerAngularVelocity = new THREE.Vector3();

  // Get UI elements
  speedElement = document.getElementById("speed");
  altitudeElement = document.getElementById("altitude");

  return playerAircraft; // Return reference if needed
}

function setupPlayerControls() {
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);
}

function removePlayerControls() {
  document.removeEventListener("keydown", handleKeyDown);
  document.removeEventListener("keyup", handleKeyUp);
}

function handleKeyDown(event) {
  switch (event.code) {
    case "KeyW":
    case "ArrowUp":
      controls.forward = 1;
      break;
    case "KeyS":
    case "ArrowDown":
      controls.backward = 1;
      break;
    case "KeyA":
    case "ArrowLeft":
      controls.left = 1;
      break;
    case "KeyD":
    case "ArrowRight":
      controls.right = 1;
      break;
    case "KeyQ":
      controls.rollLeft = 1;
      break;
    case "KeyE":
      controls.rollRight = 1;
      break;
    case "ShiftLeft":
    case "ShiftRight":
      controls.boost = 1;
      break;
    case "ControlLeft":
    case "ControlRight":
      controls.down = 1;
      break;
    case "Space":
      controls.up = 1;
      break;
  }
}

function handleKeyUp(event) {
  switch (event.code) {
    case "KeyW":
    case "ArrowUp":
      controls.forward = 0;
      break;
    case "KeyS":
    case "ArrowDown":
      controls.backward = 0;
      break;
    case "KeyA":
    case "ArrowLeft":
      controls.left = 0;
      break;
    case "KeyD":
    case "ArrowRight":
      controls.right = 0;
      break;
    case "KeyQ":
      controls.rollLeft = 0;
      break;
    case "KeyE":
      controls.rollRight = 0;
      break;
    case "ShiftLeft":
    case "ShiftRight":
      controls.boost = 0;
      break;
    case "ControlLeft":
    case "ControlRight":
      controls.down = 0;
      break;
    case "Space":
      controls.up = 0;
      break;
  }
}

function updatePlayer(deltaTime) {
  if (!playerAircraft) return;

  updatePlayerMovement(deltaTime);
  checkCollisions(); // Check collisions after movement
  updateInfoPanel(); // Update UI based on new state
}

function updatePlayerMovement(deltaTime) {
  const aircraftConfig = getCurrentAircraft();
  const currentSpeed = playerVelocity.length();
  const maxSpeed =
    aircraftConfig.maxSpeed *
    (controls.boost ? CONFIG.AFTERBURNER_MULTIPLIER : 1.0);

  // --- Angular Velocity ---
  const handlingFactor = aircraftConfig.handling || 1.0;
  let targetPitch =
    (controls.up ? CONFIG.PITCH_SPEED * handlingFactor : 0) -
    (controls.down ? CONFIG.PITCH_SPEED * handlingFactor : 0);
  let targetYaw =
    (controls.left ? CONFIG.YAW_SPEED * handlingFactor : 0) -
    (controls.right ? CONFIG.YAW_SPEED * handlingFactor : 0);
  let targetRoll =
    (controls.rollLeft ? CONFIG.ROLL_SPEED * handlingFactor : 0) -
    (controls.rollRight ? CONFIG.ROLL_SPEED * handlingFactor : 0);

  playerAngularVelocity.x +=
    (targetPitch - playerAngularVelocity.x) * deltaTime * 5.0;
  playerAngularVelocity.y +=
    (targetYaw - playerAngularVelocity.y) * deltaTime * 5.0;
  playerAngularVelocity.z +=
    (targetRoll - playerAngularVelocity.z) * deltaTime * 5.0;
  playerAngularVelocity.multiplyScalar(CONFIG.DAMPING);

  // --- Apply Rotation ---
  const deltaRotation = playerAngularVelocity.clone().multiplyScalar(deltaTime);
  const qx = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    deltaRotation.x
  );
  const qy = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    deltaRotation.y
  );
  const qz = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 1),
    deltaRotation.z
  );
  playerAircraft.quaternion.multiply(qx).multiply(qy).multiply(qz).normalize();

  // --- Linear Velocity ---
  const accelerationFactor = aircraftConfig.acceleration || 1.0;
  let thrust = controls.forward
    ? CONFIG.PLAYER_SPEED * 5.0 * accelerationFactor
    : 0;
  thrust = thrust * (controls.boost ? CONFIG.AFTERBURNER_MULTIPLIER : 1.0);
  // Assuming model's forward is -Z after initial rotation setup
  const forwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(
    playerAircraft.quaternion
  );
  const acceleration = forwardVector.multiplyScalar(thrust * deltaTime);
  playerVelocity.add(acceleration);

  // Apply damping/drag
  const dragFactor = 1.0 - 0.5 * deltaTime;
  playerVelocity.multiplyScalar(dragFactor);

  // Clamp speed
  if (playerVelocity.lengthSq() > maxSpeed * maxSpeed) {
    playerVelocity.normalize().multiplyScalar(maxSpeed);
  }

  // Minimum speed / faster stop
  const MIN_SPEED = 5.0;
  if (currentSpeed < MIN_SPEED && thrust === 0) {
    playerVelocity.multiplyScalar(0.9);
    if (currentSpeed < 0.1) playerVelocity.set(0, 0, 0);
  }

  // --- Update Position ---
  const deltaPosition = playerVelocity.clone().multiplyScalar(deltaTime);
  playerAircraft.position.add(deltaPosition);

  // --- Ground Collision (Basic - Prevent falling through absolute 0) ---
  // More accurate check should use getTerrainHeight from world.js
  const approximateGroundLevel = 1; // Small buffer above 0
  if (playerAircraft.position.y < approximateGroundLevel) {
    playerAircraft.position.y = approximateGroundLevel;
    playerVelocity.y = Math.max(0, playerVelocity.y * -0.5); // Simple bounce
  }
}

function checkCollisions() {
  if (
    !playerAircraft ||
    !playerAircraft.children ||
    playerAircraft.children.length === 0
  ) {
    return; // Not ready
  }

  const playerBox = new THREE.Box3().setFromObject(playerAircraft);
  let collisionDetectedThisFrame = false;

  for (const buildingBox of buildingBoundingBoxes) {
    if (playerBox.intersectsBox(buildingBox)) {
      collisionDetectedThisFrame = true;

      // Simple response: Reflect velocity, reduce speed, push out
      const playerCenter = new THREE.Vector3();
      playerBox.getCenter(playerCenter);
      const buildingCenter = new THREE.Vector3();
      buildingBox.getCenter(buildingCenter);
      const collisionNormal = playerCenter.sub(buildingCenter).normalize();

      if (playerVelocity.lengthSq() > 1.0) {
        playerVelocity.reflect(collisionNormal).multiplyScalar(0.5);
      } else {
        playerVelocity.set(0, 0, 0);
      }
      const pushOut = collisionNormal.multiplyScalar(0.5); // Smaller push
      playerAircraft.position.add(pushOut);

      break; // Stop after first collision
    }
  }

  // Update visual collision indicator only if state changed
  if (collisionDetectedThisFrame !== isColliding) {
    isColliding = collisionDetectedThisFrame;
    setPlayerEmissive(isColliding ? 0xaa0000 : 0x000000);
  }
}

// Helper to set emissive color on player model materials
function setPlayerEmissive(hexColor) {
  playerAircraft.traverse((child) => {
    if (child.isMesh && child.material) {
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      materials.forEach((mat) => {
        if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
          mat.emissive.setHex(hexColor);
        }
      });
    }
  });
}

function updateInfoPanel() {
  if (!playerAircraft || !speedElement || !altitudeElement) return;
  const speedKmh = playerVelocity.length() * 3.6;
  const altitude = playerAircraft.position.y;
  speedElement.textContent = speedKmh.toFixed(0);
  altitudeElement.textContent = altitude.toFixed(1);
}

function getPlayerStateForNetwork() {
  if (!playerAircraft) return null;
  return {
    position: playerAircraft.position.toArray(),
    quaternion: playerAircraft.quaternion.toArray(),
    // velocity: playerVelocity.toArray(), // Optional
    // boosting: controls.boost === 1      // Optional
  };
}

export {
  initializePlayer,
  setupPlayerControls,
  removePlayerControls,
  updatePlayer,
  getPlayerStateForNetwork,
  playerAircraft, // Export for camera control
  playerVelocity, // Export for camera control (FOV)
};
