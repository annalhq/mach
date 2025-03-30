import * as THREE from "three";
import { CAMERA_BASE_FOV, STAR_FIELD_RADIUS, GROUND_SIZE } from "./config.js";

export function initializeScene() {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    CAMERA_BASE_FOV,
    window.innerWidth / window.innerHeight,
    0.1,
    STAR_FIELD_RADIUS * 1.5
  );
  camera.position.set(0, 50, 100);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  // --- Lighting  ---
  const skyLight = new THREE.HemisphereLight(0x87ceeb, 0x000000, 0.6); // Sky, Ground, Intensity
  scene.add(skyLight);

  const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
  sunLight.position.set(0, 1000, 1000);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 100;
  sunLight.shadow.camera.far = 5000;

  // Adjust shadow frustum based on ground size
  const shadowCamSize = GROUND_SIZE * 0.7;
  sunLight.shadow.camera.left = -shadowCamSize;
  sunLight.shadow.camera.right = shadowCamSize;
  sunLight.shadow.camera.top = shadowCamSize;
  sunLight.shadow.camera.bottom = -shadowCamSize;
  scene.add(sunLight);
  scene.add(sunLight.target); // directional light targeting

  // --- Fog  ---
  scene.fog = new THREE.Fog(0xcccccc, 1000, 15000);

  // Ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
  scene.add(ambientLight);

  return { scene, camera, renderer, skyLight, sunLight, ambientLight };
}

export function handleResize(camera, renderer) {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
