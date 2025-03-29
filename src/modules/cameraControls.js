import {
  CAMERA_BASE_FOV,
  CAMERA_MAX_FOV_INCREASE,
  MAX_BASE_SPEED,
  AFTERBURNER_MULTIPLIER,
  CAMERA_LERP_FACTOR,
} from "./config.js";

export function updateCamera(
  camera,
  playerAircraft,
  cameraTarget,
  currentSpeed,
  isAfterburner
) {
  if (!camera || !playerAircraft || !cameraTarget) {
    // console.warn("Camera update skipped, objects not ready"); // gotta show this later on the screen, but too lazy rn lol 
    return;
  }

  // --- Calculate FOV based on Speed ---
  const maxSpeedForFov =
    MAX_BASE_SPEED * (isAfterburner ? AFTERBURNER_MULTIPLIER : 1);
  // Use smootherstep or similar for a nicer transition, or clamp the ratio
  const speedRatio = THREE.MathUtils.smoothstep(
    currentSpeed,
    0,
    maxSpeedForFov
  ); // 0 at min speed, 1 at max
  // const speedRatio = Math.min(currentSpeed / maxSpeedForFov, 1.0); // Linear clamp

  const targetFov = CAMERA_BASE_FOV + speedRatio * CAMERA_MAX_FOV_INCREASE;
  // Smoothly interpolate FOV towards the target FOV
  camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.1); // Adjust lerp factor (0.1) for FOV change speed
  camera.updateProjectionMatrix(); // Must be called after changing FOV or aspect ratio

  // --- Update Camera Position ---
  // Get the desired camera position (the world position of the cameraTarget object)
  const desiredPosition = new THREE.Vector3();
  cameraTarget.getWorldPosition(desiredPosition);

  // Smoothly interpolate the camera's current position towards the desired position
  camera.position.lerp(desiredPosition, CAMERA_LERP_FACTOR);

  // --- Update Camera LookAt ---
  // Make the camera look slightly *ahead* of the aircraft for a better sense of direction
  const lookAtOffset = new THREE.Vector3(0, 1.5, 10); // Look target offset: slightly above and ahead (local space)
  const lookAtPosition = playerAircraft.localToWorld(lookAtOffset); // Convert local offset to world position
  // const lookAtPosition = playerAircraft.position.clone().add(new THREE.Vector3(0, 1, 0)); // Simpler: look at aircraft center + small offset

  camera.lookAt(lookAtPosition);
}
