import * as THREE from "three";
import * as CONFIG from "./config.js";
import { camera } from "./sceneSetup.js"; // Import camera
import { playerAircraft, playerVelocity } from "./player.js"; // Import player data

const relativeCameraOffset = new THREE.Vector3(0, 2, 10); // Behind (+Z) and above
const lookAtOffset = new THREE.Vector3(0, 1, 0); // Look slightly above player origin

function updateCamera(deltaTime) {
  if (!playerAircraft || !camera) return;

  // --- Update FOV ---
  const speedRatio =
    playerVelocity.length() /
    (CONFIG.PLAYER_SPEED * CONFIG.AFTERBURNER_MULTIPLIER);
  const targetFOV =
    CONFIG.CAMERA_BASE_FOV + speedRatio * CONFIG.CAMERA_MAX_FOV_BOOST;
  camera.fov += (targetFOV - camera.fov) * 0.1; // Smooth FOV change
  camera.updateProjectionMatrix();

  // --- Update Position (Follow Cam) ---
  const cameraOffset = relativeCameraOffset
    .clone()
    .applyQuaternion(playerAircraft.quaternion);
  const desiredCameraPosition = playerAircraft.position
    .clone()
    .add(cameraOffset);

  // Smoothly move the camera (lerp)
  camera.position.lerp(desiredCameraPosition, 0.1); // Adjust lerp factor for smoothness (0.1 = smooth, 1.0 = instant)

  // --- Update LookAt ---
  const lookAtTarget = playerAircraft.position.clone().add(lookAtOffset);
  camera.lookAt(lookAtTarget);
}

export { updateCamera };
