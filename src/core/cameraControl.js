import * as THREE from "three";
import * as CONFIG from "./config.js";
import { camera } from "./sceneSetup.js";
import { playerAircraft, playerVelocity } from "./player.js";

const relativeCameraOffset = new THREE.Vector3(0, 2, 10);
const lookAtOffset = new THREE.Vector3(0, 1, 0);

function updateCamera(deltaTime) {
  if (!playerAircraft || !camera) return;

  const speedRatio =
    playerVelocity.length() /
    (CONFIG.PLAYER_SPEED * CONFIG.AFTERBURNER_MULTIPLIER);
  const targetFOV =
    CONFIG.CAMERA_BASE_FOV + speedRatio * CONFIG.CAMERA_MAX_FOV_BOOST;
  camera.fov += (targetFOV - camera.fov) * 0.1;
  camera.updateProjectionMatrix();

  const cameraOffset = relativeCameraOffset
    .clone()
    .applyQuaternion(playerAircraft.quaternion);
  const desiredCameraPosition = playerAircraft.position
    .clone()
    .add(cameraOffset);

  camera.position.lerp(desiredCameraPosition, 0.1);
  const lookAtTarget = playerAircraft.position.clone().add(lookAtOffset);
  camera.lookAt(lookAtTarget);
}

export { updateCamera };
