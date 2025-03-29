// src/modules/player.js
import * as THREE from "three";
import {
  BASE_SPEED,
  MAX_BASE_SPEED,
  AFTERBURNER_MULTIPLIER,
  ACCELERATION,
  BRAKING,
  ROLL_SPEED,
  PITCH_SPEED,
  YAW_SPEED,
  DAMPENING,
  CAMERA_FOLLOW_HEIGHT,
  CAMERA_FOLLOW_DISTANCE,
  CITY_SIZE,
  COLLISION_CHECKS_PER_FRAME,
  COLLISION_DISTANCE_BUFFER,
  COLLISION_SPEED_FACTOR,
} from "./config.js";

// --- Module Scope Variables ---
let playerAircraft = null;
let cameraTarget = null; // Invisible object the camera follows

let currentSpeed = 0;
let targetSpeed = BASE_SPEED;
let isAfterburner = false;
let rollVelocity = 0,
  pitchVelocity = 0,
  yawVelocity = 0;

const keys = {}; // Keyboard state tracker

const collisionRaycaster = new THREE.Raycaster(); // Reuse raycaster for performance

// --- Initialization ---
export function createPlayerAircraft(scene) {
  // Simple cone for the aircraft body
  const playerGeo = new THREE.ConeGeometry(2, 8, 8);
  playerGeo.rotateX(Math.PI / 2); // Point forward along +Z in local space

  // Red material
  const playerMat = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    metalness: 0.5,
    roughness: 0.6,
    emissive: 0x330000, // Slight red glow
  });

  playerAircraft = new THREE.Mesh(playerGeo, playerMat);
  playerAircraft.position.set(0, 150, 0); // Start higher up
  playerAircraft.castShadow = true;
  scene.add(playerAircraft);

  // Invisible target for the camera to follow smoothly
  cameraTarget = new THREE.Object3D();
  playerAircraft.add(cameraTarget); // Attach to player
  // Position behind and slightly above the aircraft (relative to player)
  cameraTarget.position.set(0, CAMERA_FOLLOW_HEIGHT, -CAMERA_FOLLOW_DISTANCE);

  // Setup keyboard listeners
  document.addEventListener(
    "keydown",
    (e) => {
      keys[e.code] = true;
    },
    false
  );
  document.addEventListener(
    "keyup",
    (e) => {
      keys[e.code] = false;
    },
    false
  );

  console.log("Player aircraft created");
  return { playerAircraft, cameraTarget };
}

// --- Collision Detection ---
function checkBuildingCollision(deltaTime, buildingMeshInstance) {
  if (!playerAircraft || !buildingMeshInstance) return false;

  const aircraftPos = playerAircraft.position;
  // Get local forward and down vectors, convert to world space
  const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(
    playerAircraft.quaternion
  );
  const down = new THREE.Vector3(0, -1, 0).applyQuaternion(
    playerAircraft.quaternion
  );

  // Dynamic collision distance based on speed
  const checkDistance =
    COLLISION_DISTANCE_BUFFER +
    currentSpeed * deltaTime * COLLISION_SPEED_FACTOR;

  // Directions to check (relative to aircraft orientation)
  const directions = [
    forward, // Directly forward
    down.clone().multiplyScalar(0.3).add(forward).normalize(), // Slightly forward-down
    // Add more rays for better coverage (e.g., left, right, up-forward) if needed
    // new THREE.Vector3(1, 0, 0).applyQuaternion(playerAircraft.quaternion), // Right
    // new THREE.Vector3(-1, 0, 0).applyQuaternion(playerAircraft.quaternion), // Left
  ];

  let collided = false;

  for (
    let i = 0;
    i < Math.min(directions.length, COLLISION_CHECKS_PER_FRAME);
    i++
  ) {
    collisionRaycaster.set(aircraftPos, directions[i]);
    collisionRaycaster.far = checkDistance; // Set max check distance

    // Check intersection with the instanced buildings mesh
    const intersects = collisionRaycaster.intersectObject(buildingMeshInstance);

    // Filter intersects to only consider those within the dynamic checkDistance
    // (intersectObject might return hits slightly beyond 'far' sometimes)
    if (intersects.length > 0 && intersects[0].distance <= checkDistance) {
      collided = true;
      break; // Collision detected, no need to check other rays
    }
  }

  if (collided) {
    console.log("Collision detected!");
    // --- Collision Response ---
    currentSpeed = 0; // Stop movement
    // Apply a small pushback impulse (opposite to forward direction)
    const pushBack = forward.clone().multiplyScalar(-5); // Adjust magnitude as needed
    playerAircraft.position.add(pushBack);

    // Reset rotational velocity to stop spinning wildly after crash
    rollVelocity = 0;
    pitchVelocity = 0;
    yawVelocity = 0;

    // Optional: Add screen shake, sound effect, damage indicator here
    return true; // Indicate collision happened
  }
  return false; // No collision
}

// --- Player Update Logic ---
export function updatePlayer(deltaTime, buildingMesh) {
  if (!playerAircraft) return null; // Player not initialized yet

  // --- Speed Control ---
  const maxSpeed = isAfterburner
    ? MAX_BASE_SPEED * AFTERBURNER_MULTIPLIER
    : MAX_BASE_SPEED;

  if (keys["KeyW"] || keys["ArrowUp"]) {
    // Accelerate
    targetSpeed = maxSpeed; // Target max speed when accelerating
    currentSpeed = Math.min(maxSpeed, currentSpeed + ACCELERATION * deltaTime);
  } else if (keys["KeyS"] || keys["ArrowDown"]) {
    // Decelerate / Brake
    targetSpeed = 0; // Target speed is 0 when braking
    currentSpeed = Math.max(0, currentSpeed - BRAKING * deltaTime);
  } else {
    // If no input, gradually return towards base speed (or stay at 0 if already stopped)
    if (currentSpeed > BASE_SPEED) {
      currentSpeed = Math.max(
        BASE_SPEED,
        currentSpeed - BRAKING * deltaTime * 0.3
      ); // Slower return
    } else if (currentSpeed < BASE_SPEED && currentSpeed > 0) {
      currentSpeed = Math.min(
        BASE_SPEED,
        currentSpeed + ACCELERATION * deltaTime * 0.3
      ); // Slow accel to base
    }
    targetSpeed = BASE_SPEED; // Default target speed if no input
  }

  // Afterburner Toggle (Hold Shift)
  isAfterburner = keys["ShiftLeft"] || keys["ShiftRight"];

  // --- Rotational Input ---
  let targetRoll = 0,
    targetPitch = 0,
    targetYaw = 0;
  if (keys["KeyA"] || keys["ArrowLeft"]) targetRoll = ROLL_SPEED; // Roll Left (+)
  if (keys["KeyD"] || keys["ArrowRight"]) targetRoll = -ROLL_SPEED; // Roll Right (-)
  // Using I/K for pitch matches some flight sims (I=Nose Down, K=Nose Up relative to horizon)
  if (keys["KeyK"] || keys["Numpad2"] || keys["Numpad5"])
    targetPitch = PITCH_SPEED; // Pitch Up (+)
  if (keys["KeyI"] || keys["Numpad8"]) targetPitch = -PITCH_SPEED; // Pitch Down (-)
  // J/L for Yaw
  if (keys["KeyJ"] || keys["Numpad4"]) targetYaw = YAW_SPEED; // Yaw Left (+)
  if (keys["KeyL"] || keys["Numpad6"]) targetYaw = -YAW_SPEED; // Yaw Right (-)

  // Smoothly adjust velocity towards target rotational speed
  const rotLerpFactor = deltaTime * 8.0; // How quickly controls respond
  rollVelocity += (targetRoll - rollVelocity) * rotLerpFactor;
  pitchVelocity += (targetPitch - pitchVelocity) * rotLerpFactor;
  yawVelocity += (targetYaw - yawVelocity) * rotLerpFactor;

  // Apply Dampening (simulates air resistance on rotation)
  // Use exponential decay based on deltaTime for frame rate independence
  const dampFactor = Math.pow(DAMPENING, deltaTime * 60); // Adjust 60 if base DAMPENING assumes 60fps
  rollVelocity *= dampFactor;
  pitchVelocity *= dampFactor;
  yawVelocity *= dampFactor;

  // --- Apply Rotation ---
  // Calculate rotation change based on velocity and delta time
  const deltaRotationQuaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      pitchVelocity * deltaTime,
      yawVelocity * deltaTime,
      rollVelocity * deltaTime,
      "ZYX" // Order of operations: Roll, then Pitch, then Yaw (local axes) - adjust if needed
    )
  );

  // Apply the rotation delta to the aircraft's current orientation
  playerAircraft.quaternion.multiplyQuaternions(
    playerAircraft.quaternion,
    deltaRotationQuaternion
  );
  playerAircraft.quaternion.normalize(); // Prevent quaternion drift

  // --- Apply Forward Movement ---
  const forwardVector = new THREE.Vector3(0, 0, 1); // Local forward Z axis
  forwardVector.applyQuaternion(playerAircraft.quaternion); // Transform to world direction
  playerAircraft.position.addScaledVector(
    forwardVector,
    currentSpeed * deltaTime
  );

  // --- Collision Check ---
  const collisionOccurred = checkBuildingCollision(deltaTime, buildingMesh);
  // If collision happened, speed/velocity is already reset inside checkBuildingCollision

  // --- Boundaries and Ground ---
  // Simple ground collision / minimum altitude
  if (!collisionOccurred && playerAircraft.position.y < 1) {
    playerAircraft.position.y = 1;
    // Optional: Apply small bounce or speed reduction
    currentSpeed *= 0.9;
    pitchVelocity *= -0.5; // Small pitch bounce effect
  }

  // World boundary (simple wrap-around - can feel jarring)
  const boundary = CITY_SIZE * 1.2; // A bit outside the main city area
  if (Math.abs(playerAircraft.position.x) > boundary)
    playerAircraft.position.x *= -0.98; // Move towards center slightly
  if (Math.abs(playerAircraft.position.z) > boundary)
    playerAircraft.position.z *= -0.98;
  // Height ceiling
  const maxHeight = 10000; // e.g., 10km
  if (playerAircraft.position.y > maxHeight) {
    playerAircraft.position.y = maxHeight;
    currentSpeed *= 0.95; // Lose some speed at ceiling
  }

  // --- Return State ---
  // Return the current state needed by other modules (camera, UI, multiplayer)
  return {
    position: playerAircraft.position,
    quaternion: playerAircraft.quaternion,
    speed: currentSpeed,
    isAfterburner: isAfterburner,
  };
}

// Function to get the simplified state for sending over network
export function getPlayerState() {
  if (!playerAircraft) return null;
  return {
    position: playerAircraft.position.toArray(),
    quaternion: playerAircraft.quaternion.toArray(),
    speed: currentSpeed, // Include speed if needed by server/other clients
  };
}
