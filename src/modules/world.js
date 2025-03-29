import * as THREE from "three";
import {
  CITY_SIZE,
  BUILDING_COUNT,
  MAX_BUILDING_HEIGHT,
  MIN_BUILDING_HEIGHT,
  BUILDING_SIZE_MIN,
  BUILDING_SIZE_MAX,
  STAR_COUNT,
  STAR_FIELD_RADIUS,
} from "./config.js";

let buildingMesh = null; // Module-level reference for collision detection
let starField = null; // Module-level reference for day/night cycle
let moon = null; // Module-level reference for day/night cycle

function createGround(scene) {
  console.log("Creating ground with city size:", CITY_SIZE);
  const groundGeo = new THREE.PlaneGeometry(CITY_SIZE * 2.5, CITY_SIZE * 2.5);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x556b2f, // Dark Greenish
    roughness: 0.95,
    metalness: 0.1,
  });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = -0.1; // Place slightly below 0 to avoid z-fighting if player hits y=0
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);
  return groundMesh; // Return the mesh for reference
}

function createCityscape(scene) {
  console.log(`Creating cityscape with ${BUILDING_COUNT} buildings...`);
  const buildingGeo = new THREE.BoxGeometry(1, 1, 1); // Unit cube
  // More varied building colors (example)
  const buildingColors = [0xaaaaaa, 0x888888, 0xbbbbbb, 0x999999, 0xcccccc];
  // Use a single material for performance with InstancedMesh - color variation via vertex colors or textures would be better
  const buildingMat = new THREE.MeshStandardMaterial({
    color: 0xaaaaaa, // Base color
    metalness: 0.3,
    roughness: 0.7,
  });

  buildingMesh = new THREE.InstancedMesh(
    buildingGeo,
    buildingMat,
    BUILDING_COUNT
  );
  buildingMesh.castShadow = true;
  buildingMesh.receiveShadow = true;

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion(); // No rotation needed for boxes
  const scale = new THREE.Vector3();
  const color = new THREE.Color(); // For potential instanced color variation (more advanced)

  for (let i = 0; i < BUILDING_COUNT; i++) {
    const height = THREE.MathUtils.randFloat(
      MIN_BUILDING_HEIGHT,
      MAX_BUILDING_HEIGHT
    );
    const sizeX = THREE.MathUtils.randFloat(
      BUILDING_SIZE_MIN,
      BUILDING_SIZE_MAX
    );
    const sizeZ = THREE.MathUtils.randFloat(
      BUILDING_SIZE_MIN,
      BUILDING_SIZE_MAX
    );

    // Distribute buildings within the city limits, avoiding exact center spawn
    position.x = THREE.MathUtils.randFloatSpread(CITY_SIZE - BUILDING_SIZE_MAX);
    position.z = THREE.MathUtils.randFloatSpread(CITY_SIZE - BUILDING_SIZE_MAX);
    position.y = height / 2; // Position center at half height

    quaternion.identity(); // Reset quaternion (working with quaternions, but i gotta study it in more depth, but when?)

    scale.set(sizeX, height, sizeZ);

    matrix.compose(position, quaternion, scale);
    buildingMesh.setMatrixAt(i, matrix);

    // --- Advanced: Instance Color Variation (Optional) ---
    // Uncomment if you modify the material to use vertex colors (`vertexColors: true`)
    // const buildingColor = buildingColors[Math.floor(Math.random() * buildingColors.length)];
    // buildingMesh.setColorAt(i, color.setHex(buildingColor));
  }
  buildingMesh.instanceMatrix.needsUpdate = true; // Crucial for InstancedMesh
  // buildingMesh.instanceColor.needsUpdate = true; // Needed if using setColorAt

  scene.add(buildingMesh);
  return buildingMesh;
}

function createStars(scene) {
  const starsGeometry = new THREE.BufferGeometry();
  const starsCount = STAR_COUNT;
  const posArray = new Float32Array(starsCount * 3);

  for (let i = 0; i < starsCount; i++) {
    // Distribute stars within a large sphere
    const theta = 2 * Math.PI * Math.random(); // Random angle
    const phi = Math.acos(2 * Math.random() - 1); // Random elevation angle
    const radius = STAR_FIELD_RADIUS * (0.8 + Math.random() * 0.2); // Vary distance slightly

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi); // Ensure Y is calculated correctly for sphere
    const z = radius * Math.sin(phi) * Math.sin(theta);

    // Ensure most stars are above the horizon visually from origin
    if (y < 100) {
      // If star is below or near horizon level
      posArray[i * 3 + 0] = x;
      posArray[i * 3 + 1] =
        Math.abs(y) + THREE.MathUtils.randFloat(100, STAR_FIELD_RADIUS / 2);
      posArray[i * 3 + 2] = z;
    } else {
      posArray[i * 3 + 0] = x;
      posArray[i * 3 + 1] = y;
      posArray[i * 3 + 2] = z;
    }
  }

  starsGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(posArray, 3)
  );
  const starsMaterial = new THREE.PointsMaterial({
    size: 8, // Adjust size as needed
    color: 0xffffff,
    transparent: true,
    opacity: 0, // Start invisible, fade in at night
    blending: THREE.AdditiveBlending,
    depthWrite: false, // Prevent stars from blocking closer transparent objects
  });
  starField = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(starField);

  // --- Moon ---
  const moonGeo = new THREE.SphereGeometry(200, 32, 32);
  // Basic yellow-white, non-emissive moon
  const moonMat = new THREE.MeshBasicMaterial({ color: 0xe0e0b0 }); // Use BasicMaterial so it's visible without direct light
  moon = new THREE.Mesh(moonGeo, moonMat);
  // Place moon far away and somewhat hehe
  moon.position.set(
    -STAR_FIELD_RADIUS * 0.4,
    STAR_FIELD_RADIUS * 0.3,
    -STAR_FIELD_RADIUS * 0.6
  );
  moon.visible = false; // Start invisible
  scene.add(moon);

  return { starField, moon };
}

export function createWorldElements(scene) {
  if (!scene) {
    console.error("Scene is undefined in createWorldElements");
    return { buildingMesh: null, starField: null, moon: null };
  }

  console.log("Creating world elements with scene:", scene);
  const ground = createGround(scene);
  const buildings = createCityscape(scene); // Get buildingMesh reference
  const skyElements = createStars(scene); // Get starField and moon references

  return {
    ground,
    buildingMesh: buildings,
    starField: skyElements.starField,
    moon: skyElements.moon,
  };
}
