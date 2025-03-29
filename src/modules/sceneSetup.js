// src/modules/sceneSetup.js
import * as THREE from "three";
import { CITY_SIZE, CAMERA_BASE_FOV } from "./config.js";

export function initializeScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000); // Start with black background

  const camera = new THREE.PerspectiveCamera(
    CAMERA_BASE_FOV,
    window.innerWidth / window.innerHeight,
    0.1,
    STAR_FIELD_RADIUS * 1.5
  ); // Increased far plane for stars

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement); // Append canvas to body

  // --- Lighting ---
  // Hemisphere Light (Sky/Ground)
  const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x001f3f, 0.8); // Initial day values
  scene.add(hemisphereLight);

  // Directional Light (Sun)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(
    CITY_SIZE * 0.5,
    CITY_SIZE * 0.5,
    CITY_SIZE * 0.3
  ); // Initial sun position
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  // Adjust shadow camera frustum based on city size for better shadow coverage
  const shadowCamSize = CITY_SIZE * 0.8;
  directionalLight.shadow.camera.near = 100;
  directionalLight.shadow.camera.far = CITY_SIZE * 2.5;
  directionalLight.shadow.camera.left = -shadowCamSize;
  directionalLight.shadow.camera.right = shadowCamSize;
  directionalLight.shadow.camera.top = shadowCamSize;
  directionalLight.shadow.camera.bottom = -shadowCamSize;
  scene.add(directionalLight);
  scene.add(directionalLight.target); // Important: Add target to scene

  // Ambient Light (adds general illumination, softens shadows)
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.15); // Slightly higher base ambient
  scene.add(ambientLight);

  return {
    scene,
    camera,
    renderer,
    directionalLight,
    hemisphereLight,
    ambientLight,
  };
}

export function handleResize(camera, renderer) {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
