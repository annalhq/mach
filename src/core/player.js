import * as THREE from "three";
import * as CONFIG from "./config.js";
import { scene, camera } from "./sceneSetup.js";
import { buildingBoundingBoxes } from "./world.js";
import { getCurrentAircraft } from "./aircraftConfig.js";
import { controls, setupControls, removeControls } from "./controls.js";

let playerAircraft = null;
let playerVelocity = new THREE.Vector3();
let playerAngularVelocity = new THREE.Vector3();
let isColliding = false;

let speedElement, altitudeElement;

function initializePlayer(loadedModelTemplate) {
  if (!loadedModelTemplate) {
    console.error(
      "Cannot create player aircraft, model template not provided."
    );
    const geometry = new THREE.ConeGeometry(2, 8, 8);
    geometry.rotateX(Math.PI / 2);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0x330000,
    });
    playerAircraft = new THREE.Mesh(geometry, material);
  } else {
    console.log("Creating player aircraft from template...");
    playerAircraft = loadedModelTemplate.clone();
    const aircraftConfig = getCurrentAircraft();
  }

  playerAircraft.position.set(0, 50, 0);
  playerAircraft.castShadow = true;
  scene.add(playerAircraft);
  console.log("Player aircraft added to scene at", playerAircraft.position);

  playerVelocity = new THREE.Vector3();
  playerAngularVelocity = new THREE.Vector3();

  speedElement = document.getElementById("speed");
  altitudeElement = document.getElementById("altitude");

  return playerAircraft;
}

function setupPlayerControls() {
  setupControls();
}

function removePlayerControls() {
  removeControls();
}

function updatePlayer(deltaTime) {
  if (!playerAircraft) return;

  updatePlayerMovement(deltaTime);
  checkCollisions();
  updateInfoPanel();
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

  const forwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(
    playerAircraft.quaternion
  );
  const acceleration = forwardVector.multiplyScalar(thrust * deltaTime);
  playerVelocity.add(acceleration);

  // damping/drag
  const dragFactor = 1.0 - 0.5 * deltaTime;
  playerVelocity.multiplyScalar(dragFactor);

  // Clamp speed
  if (playerVelocity.lengthSq() > maxSpeed * maxSpeed) {
    playerVelocity.normalize().multiplyScalar(maxSpeed);
  }

  const MIN_SPEED = 5.0;
  if (currentSpeed < MIN_SPEED && thrust === 0) {
    playerVelocity.multiplyScalar(0.9);
    if (currentSpeed < 0.1) playerVelocity.set(0, 0, 0);
  }

  // --- Update Position ---
  const deltaPosition = playerVelocity.clone().multiplyScalar(deltaTime);
  playerAircraft.position.add(deltaPosition);

  // --- Ground Collision (Basic - Prevent falling through absolute 0) ---
  const approximateGroundLevel = 1;
  if (playerAircraft.position.y < approximateGroundLevel) {
    playerAircraft.position.y = approximateGroundLevel;
    playerVelocity.y = Math.max(0, playerVelocity.y * -0.5);
  }
}

function checkCollisions() {
  if (
    !playerAircraft ||
    !playerAircraft.children ||
    playerAircraft.children.length === 0
  ) {
    return;
  }

  const playerBox = new THREE.Box3().setFromObject(playerAircraft);
  let collisionDetectedThisFrame = false;

  for (const buildingBox of buildingBoundingBoxes) {
    if (playerBox.intersectsBox(buildingBox)) {
      collisionDetectedThisFrame = true;

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
      const pushOut = collisionNormal.multiplyScalar(0.5);
      playerAircraft.position.add(pushOut);

      break;
    }
  }

  if (collisionDetectedThisFrame !== isColliding) {
    isColliding = collisionDetectedThisFrame;
    setPlayerEmissive(isColliding ? 0xaa0000 : 0x000000);
  }
}

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
  };
}

export {
  initializePlayer,
  setupPlayerControls,
  removePlayerControls,
  updatePlayer,
  getPlayerStateForNetwork,
  playerAircraft,
  playerVelocity,
};
