import * as THREE from "three";
import * as CONFIG from "./config.js";

let scene, camera, renderer, clock, skyLight, sunLight;
let sunAngle = Math.PI / 4; // Start in morning/afternoon
let stars;

function initializeScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    CONFIG.CAMERA_BASE_FOV,
    window.innerWidth / window.innerHeight,
    0.1,
    20000
  );
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);
  clock = new THREE.Clock();

  // Lighting (Day/Night)
  skyLight = new THREE.HemisphereLight(0x87ceeb, 0x000000, 0.6);
  scene.add(skyLight);

  sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
  sunLight.position.set(0, 1000, 1000); // Initial position
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 100;
  sunLight.shadow.camera.far = 5000;
  sunLight.shadow.camera.left = -CONFIG.GROUND_SIZE / 2;
  sunLight.shadow.camera.right = CONFIG.GROUND_SIZE / 2;
  sunLight.shadow.camera.top = CONFIG.GROUND_SIZE / 2;
  sunLight.shadow.camera.bottom = -CONFIG.GROUND_SIZE / 2;
  scene.add(sunLight);
  scene.add(sunLight.target);

  // Fog
  scene.fog = new THREE.Fog(0xcccccc, 1000, 15000);

  createStars();

  window.addEventListener("resize", onWindowResize, false);

  // Return core components needed elsewhere
  return { scene, camera, renderer, clock };
}

function createStars() {
  const starGeometry = new THREE.BufferGeometry();
  const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.5,
    sizeAttenuation: true,
  });
  const starVertices = [];
  for (let i = 0; i < CONFIG.STAR_COUNT; i++) {
    const x = (Math.random() - 0.5) * 15000;
    const y = Math.random() * 5000 + 500;
    const z = (Math.random() - 0.5) * 15000;
    if (Math.sqrt(x * x + y * y + z * z) > 1000) {
      starVertices.push(x, y, z);
    } else {
      i--; // retry
    }
  }
  starGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(starVertices, 3)
  );
  stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);
}

function updateDayNightCycle(deltaTime) {
  const cycleSpeed = (2 * Math.PI) / (CONFIG.DAY_NIGHT_CYCLE_MINUTES * 60);
  sunAngle += cycleSpeed * deltaTime;
  sunAngle %= 2 * Math.PI;

  const sunY = Math.sin(sunAngle);
  const sunX = Math.cos(sunAngle);

  sunLight.position.set(sunX * 1500, sunY * 1000, 1000);
  sunLight.target.position.set(0, 0, 0);

  if (sunY > 0) {
    // Daytime
    const intensity = Math.max(0.1, sunY) * 1.5;
    sunLight.intensity = intensity;
    skyLight.intensity = Math.max(0.2, sunY * 0.6);
    sunLight.color.setHSL(0.1, 1, Math.max(0.5, sunY));
    skyLight.color.setHSL(0.6, 0.6, Math.max(0.3, sunY * 0.7));
    scene.fog.color.setHSL(0.6, 0.3, Math.max(0.6, sunY * 0.8));
    scene.fog.near = 1000 + (1 - sunY) * 2000;
    scene.fog.far = 15000 - (1 - sunY) * 5000;
    if (renderer) renderer.setClearColor(skyLight.color);
  } else {
    // Nighttime
    sunLight.intensity = 0;
    skyLight.intensity = 0.1 + Math.abs(sunY) * 0.1;
    skyLight.color.setHSL(0.6, 0.3, 0.1);
    scene.fog.color.setHSL(0.6, 0.1, 0.05);
    scene.fog.near = 500;
    scene.fog.far = 8000;
    if (renderer) renderer.setClearColor(0x000011);
  }
}

function onWindowResize() {
  if (camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

// Export necessary functions and variables
export {
  initializeScene,
  updateDayNightCycle,
  scene, // Export scene if other modules need to add objects directly
  camera,
  renderer,
  clock,
};
