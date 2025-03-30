import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  GROUND_SIZE,
  GROUND_SEGMENTS,
  TERRAIN_AMPLITUDE,
  TERRAIN_FREQUENCY,
  BUILDING_COUNT,
  MAX_BUILDING_HEIGHT,
  MIN_BUILDING_HEIGHT,
  HOUSE_CLUSTERS,
  POND_COUNT,
  LANDMARK_COUNT,
  TREE_COUNT,
  TRUNK_HEIGHT,
  TRUNK_RADIUS,
  FOLIAGE_HEIGHT,
  FOLIAGE_RADIUS,
  CLOUD_COUNT,
  CLOUD_SIZE,
  CLOUD_ALTITUDE_MIN,
  CLOUD_ALTITUDE_MAX,
  CLOUD_AREA_XZ,
  ROAD_COUNT,
  ROAD_WIDTH,
  ROAD_MIN_LENGTH,
  ROAD_MAX_LENGTH,
  ROAD_SEGMENT_LENGTH,
  ROAD_THICKNESS_OFFSET,
  STAR_COUNT,
  STAR_FIELD_RADIUS,
  ASSETS_DIR,
  GRASS_TEXTURE_URL,
  CLOUD_TEXTURE_URL,
  ROAD_TEXTURE_URL,
} from "./config.js";

let groundMesh = null;
let buildingBoundingBoxes = [];
let treeInstancedMeshes = { trunk: null, foliage: null };
let clouds = null;
let roadTexture = null;
let grassTexture = null;

let sceneRef = null;

export function getTerrainHeight(worldX, worldZ) {
  const clampedX = Math.max(
    -GROUND_SIZE / 2,
    Math.min(GROUND_SIZE / 2, worldX)
  );
  const clampedZ = Math.max(
    -GROUND_SIZE / 2,
    Math.min(GROUND_SIZE / 2, worldZ)
  );
  const height =
    Math.sin(clampedX * TERRAIN_FREQUENCY) *
    Math.cos(clampedZ * TERRAIN_FREQUENCY) *
    TERRAIN_AMPLITUDE;
  return height;
}

// --- Ground Creation (with Terrain) ---
function createGround() {
  if (!sceneRef || !grassTexture) {
    console.warn(
      "Scene reference or grass texture not available for ground creation."
    );
    return;
  }
  console.log("Creating ground mesh...");

  const groundGeometry = new THREE.PlaneGeometry(
    GROUND_SIZE,
    GROUND_SIZE,
    GROUND_SEGMENTS,
    GROUND_SEGMENTS
  );
  const positionAttribute = groundGeometry.attributes.position;
  const vertex = new THREE.Vector3();

  console.log("Generating terrain geometry...");
  for (let i = 0; i < positionAttribute.count; i++) {
    vertex.fromBufferAttribute(positionAttribute, i); 
    const height = getTerrainHeight(vertex.x, vertex.y);
    positionAttribute.setZ(i, height);
  }
  positionAttribute.needsUpdate = true;
  groundGeometry.computeVertexNormals();
  console.log("Terrain geometry generated.");

  const groundMaterial = new THREE.MeshStandardMaterial({
    map: grassTexture,
    side: THREE.FrontSide,
    roughness: 0.95,
    metalness: 0.05,
  });

  groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  sceneRef.add(groundMesh);
  console.log("Ground mesh created and added.");
  return groundMesh;
}

// --- Building/Landmark Creation Functions---

function createSkyscrapers(count) {
  if (!sceneRef) return;
  console.log("Creating skyscrapers...");
  const buildingMaterial = new THREE.MeshStandardMaterial({
    color: 0xaaaaaa,
    roughness: 0.8,
    metalness: 0.2,
  });
  const buildingGeometry = new THREE.BoxGeometry(1, 1, 1);

  for (let i = 0; i < count; i++) {
    const height =
      MIN_BUILDING_HEIGHT +
      Math.random() * (MAX_BUILDING_HEIGHT - MIN_BUILDING_HEIGHT);
    const width = 20 + Math.random() * 50;
    const depth = 20 + Math.random() * 50;

    const materialInstance = buildingMaterial.clone();
    materialInstance.color.setHSL(0, 0, 0.5 + Math.random() * 0.3);

    const building = new THREE.Mesh(buildingGeometry, materialInstance);
    building.scale.set(width, height, depth);

    let x,
      z,
      y,
      attempts = 0;
    do {
      x = (Math.random() - 0.5) * (GROUND_SIZE * 0.9);
      z = (Math.random() - 0.5) * (GROUND_SIZE * 0.9);
      y = getTerrainHeight(x, z) + height / 2;
      attempts++;
    } while (y - height / 2 < 0 && attempts < 10);

    if (attempts >= 10) continue;

    building.position.set(x, y, z);
    building.castShadow = true;
    building.receiveShadow = true;
    sceneRef.add(building);

    const box = new THREE.Box3().setFromObject(building);
    buildingBoundingBoxes.push(box);
  }
  console.log("Skyscrapers created.");
}

function createHouses(clusterCount) {
  if (!sceneRef) return;
  console.log("Creating house clusters...");
  const houseMaterial = new THREE.MeshStandardMaterial({
    color: 0xcc6633,
    roughness: 0.9,
  });
  const houseGeometry = new THREE.BoxGeometry(1, 1, 1);
  const housesPerCluster = 10 + Math.floor(Math.random() * 15);
  const clusterRadius = 150;

  for (let c = 0; c < clusterCount; c++) {
    let clusterX,
      clusterZ,
      clusterY,
      attempts = 0;
    do {
      clusterX = (Math.random() - 0.5) * (GROUND_SIZE * 0.8);
      clusterZ = (Math.random() - 0.5) * (GROUND_SIZE * 0.8);
      clusterY = getTerrainHeight(clusterX, clusterZ);
      attempts++;
    } while (
      (clusterY < 5 || clusterY > TERRAIN_AMPLITUDE * 0.6) &&
      attempts < 10
    );

    if (attempts >= 10) continue;

    for (let i = 0; i < housesPerCluster; i++) {
      const height = 5 + Math.random() * 5;
      const width = 8 + Math.random() * 8;
      const depth = 8 + Math.random() * 8;

      const house = new THREE.Mesh(houseGeometry, houseMaterial);
      house.scale.set(width, height, depth);

      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * clusterRadius;
      const x = clusterX + Math.cos(angle) * radius;
      const z = clusterZ + Math.sin(angle) * radius;
      const y = getTerrainHeight(x, z) + height / 2;

      if (Math.abs(y - height / 2 - clusterY) > 25) continue; // Avoid steep slopes within cluster

      house.position.set(x, y, z);
      house.rotation.y = Math.random() * Math.PI;
      house.castShadow = true;
      house.receiveShadow = true;
      sceneRef.add(house);

      const box = new THREE.Box3().setFromObject(house);
      buildingBoundingBoxes.push(box);
    }
  }
  console.log("House clusters created.");
}

function createPonds(count) {
  if (!sceneRef) return;
  console.log("Creating ponds...");
  const pondMaterial = new THREE.MeshStandardMaterial({
    color: 0x3366aa,
    roughness: 0.2,
    metalness: 0.1,
    transparent: true,
    opacity: 0.75,
  });
  const pondSegments = 32;

  for (let i = 0; i < count; i++) {
    const radius = 40 + Math.random() * 80;
    const pondGeometry = new THREE.CircleGeometry(radius, pondSegments);

    let x,
      z,
      y,
      attempts = 0;
    do {
      x = (Math.random() - 0.5) * (GROUND_SIZE * 0.9);
      z = (Math.random() - 0.5) * (GROUND_SIZE * 0.9);
      y = getTerrainHeight(x, z);
      attempts++;
    } while (y > TERRAIN_AMPLITUDE * 0.2 && attempts < 10);

    if (attempts >= 10) continue;

    const pond = new THREE.Mesh(pondGeometry, pondMaterial);
    pond.position.set(x, y + 0.1, z);
    pond.rotation.x = -Math.PI / 2;
    pond.receiveShadow = true;
    sceneRef.add(pond);
  }
  console.log("Ponds created.");
}

function createLandmarks(count) {
  console.log("Landmarks created (placeholder).");
}

// --- Trees (Instanced) ---
function createTrees(count) {
  if (!sceneRef) return;
  console.log(`Creating ${count} trees (instanced)...`);

  const trunkGeometry = new THREE.CylinderGeometry(
    TRUNK_RADIUS,
    TRUNK_RADIUS,
    TRUNK_HEIGHT,
    8
  );
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
    roughness: 0.9,
  });

  const foliageGeometry = new THREE.ConeGeometry(
    FOLIAGE_RADIUS,
    FOLIAGE_HEIGHT,
    8
  );
  const foliageMaterial = new THREE.MeshStandardMaterial({
    color: 0x228b22,
    roughness: 0.9,
  });

  const trunkInstancedMesh = new THREE.InstancedMesh(
    trunkGeometry,
    trunkMaterial,
    count
  );
  const foliageInstancedMesh = new THREE.InstancedMesh(
    foliageGeometry,
    foliageMaterial,
    count
  );

  trunkInstancedMesh.castShadow = true;
  trunkInstancedMesh.receiveShadow = true;
  foliageInstancedMesh.castShadow = true;

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  let actualTreeCount = 0;

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * GROUND_SIZE * 0.95;
    const z = (Math.random() - 0.5) * GROUND_SIZE * 0.95;
    const y = getTerrainHeight(x, z);

    const minTreeHeight = -5;
    const maxTreeHeight = TERRAIN_AMPLITUDE * 0.8; // Avoid highest peaks

    // Basic check against existing building bounding boxes
    let intersectsBuilding = false;
    const treeBasePos = new THREE.Vector3(x, y, z);
    for (const box of buildingBoundingBoxes) {
      if (box.containsPoint(treeBasePos)) {

        intersectsBuilding = true;
        break;
      }
    }

    if (y > minTreeHeight && y < maxTreeHeight && !intersectsBuilding) {
      position.set(x, y + TRUNK_HEIGHT / 2, z);
      quaternion.setFromEuler(
        new THREE.Euler(0, Math.random() * Math.PI * 2, 0)
      );
      scale.setScalar(0.8 + Math.random() * 0.4);
      matrix.compose(position, quaternion, scale);
      trunkInstancedMesh.setMatrixAt(actualTreeCount, matrix);

      position.set(x, y + TRUNK_HEIGHT + FOLIAGE_HEIGHT / 2 - 1.5, z);
      matrix.compose(position, quaternion, scale);
      foliageInstancedMesh.setMatrixAt(actualTreeCount, matrix);

      actualTreeCount++;
    }
  }

  trunkInstancedMesh.count = actualTreeCount;
  foliageInstancedMesh.count = actualTreeCount;
  trunkInstancedMesh.instanceMatrix.needsUpdate = true;
  foliageInstancedMesh.instanceMatrix.needsUpdate = true;

  sceneRef.add(trunkInstancedMesh);
  sceneRef.add(foliageInstancedMesh);
  treeInstancedMeshes = {
    trunk: trunkInstancedMesh,
    foliage: foliageInstancedMesh,
  };
  console.log(`Successfully created ${actualTreeCount} trees.`);
  return treeInstancedMeshes;
}

// --- Clouds (Points) ---
function createClouds() {
  if (!sceneRef) return;
  console.log("Creating clouds...");
  const textureLoader = new THREE.TextureLoader();

  textureLoader.load(
    CLOUD_TEXTURE_URL,
    (cloudTexture) => {
      console.log("Cloud texture loaded.");
      const cloudGeometry = new THREE.BufferGeometry();
      const positions = [];
      for (let i = 0; i < CLOUD_COUNT; i++) {
        const x = (Math.random() - 0.5) * CLOUD_AREA_XZ;
        const y =
          CLOUD_ALTITUDE_MIN +
          Math.random() * (CLOUD_ALTITUDE_MAX - CLOUD_ALTITUDE_MIN);
        const z = (Math.random() - 0.5) * CLOUD_AREA_XZ;
        positions.push(x, y, z);
      }
      cloudGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      );

      const cloudMaterial = new THREE.PointsMaterial({
        size: CLOUD_SIZE,
        map: cloudTexture,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.55,
        sizeAttenuation: true,
        color: 0xeeeeff,
      });

      clouds = new THREE.Points(cloudGeometry, cloudMaterial);
      sceneRef.add(clouds);
      console.log("Clouds created.");
    },
    undefined,
    (error) => console.error("Failed to load cloud texture:", error)
  );
  return clouds;
}

// --- Roads ---
function createRoads() {
  if (!sceneRef || !roadTexture) {
    console.warn("Scene ref or road texture missing, skipping roads.");
    return;
  }
  console.log(`Creating ${ROAD_COUNT} roads...`);

  const roadMaterialBase = new THREE.MeshStandardMaterial({
    map: roadTexture,
    side: THREE.FrontSide,
    roughness: 0.95,
    metalness: 0.0,
    polygonOffset: true,
    polygonOffsetFactor: -1.0,
    polygonOffsetUnits: -4.0,
  });

  for (let i = 0; i < ROAD_COUNT; i++) {
    const x1 = (Math.random() - 0.5) * GROUND_SIZE * 0.9;
    const z1 = (Math.random() - 0.5) * GROUND_SIZE * 0.9;
    const angle = Math.random() * Math.PI * 2;
    const length =
      ROAD_MIN_LENGTH + Math.random() * (ROAD_MAX_LENGTH - ROAD_MIN_LENGTH);
    const x2 = x1 + Math.cos(angle) * length;
    const z2 = z1 + Math.sin(angle) * length;

    const x2c = Math.max(
      (-GROUND_SIZE / 2) * 0.95,
      Math.min((GROUND_SIZE / 2) * 0.95, x2)
    );
    const z2c = Math.max(
      (-GROUND_SIZE / 2) * 0.95,
      Math.min((GROUND_SIZE / 2) * 0.95, z2)
    );

    const dx = x2c - x1;
    const dz = z2c - z1;
    const pathLength = Math.sqrt(dx * dx + dz * dz);

    if (pathLength < ROAD_MIN_LENGTH / 2) continue;

    const lengthSegments = Math.max(
      2,
      Math.ceil(pathLength / ROAD_SEGMENT_LENGTH)
    );

    const roadGeometry = new THREE.PlaneGeometry(
      ROAD_WIDTH,
      pathLength,
      1,
      lengthSegments
    );
    const positionAttribute = roadGeometry.attributes.position;
    const tempVertex = new THREE.Vector3();

    for (let j = 0; j < positionAttribute.count; j++) {
      tempVertex.fromBufferAttribute(positionAttribute, j);
      const t = (tempVertex.y + pathLength / 2) / pathLength;
      const w = tempVertex.x / ROAD_WIDTH;

      const worldX = x1 + dx * t;
      const worldZ = z1 + dz * t;
      const terrainY = getTerrainHeight(worldX, worldZ);
      const roadY = terrainY + ROAD_THICKNESS_OFFSET;

      // Road direction normal (perpendicular)
      const nx = -dz / pathLength; // Perpendicular vector component
      const nz = dx / pathLength;
      const offsetX = nx * w * ROAD_WIDTH;
      const offsetZ = nz * w * ROAD_WIDTH;

      // Update buffer: Store world positions relative to the UNROTATED plane's axes
      positionAttribute.setX(j, worldX + offsetX); 
      positionAttribute.setY(j, worldZ + offsetZ);
      positionAttribute.setZ(j, roadY);
    }

    positionAttribute.needsUpdate = true;
    roadGeometry.computeVertexNormals();

    const materialInstance = roadMaterialBase.clone();
    materialInstance.map = roadTexture.clone();
    materialInstance.map.needsUpdate = true;
    materialInstance.map.wrapS = THREE.RepeatWrapping;
    materialInstance.map.wrapT = THREE.RepeatWrapping;

    materialInstance.map.repeat.set(
      1,
      Math.max(1, Math.round(pathLength / ROAD_WIDTH / 4))
    ); 

    const roadMesh = new THREE.Mesh(roadGeometry, materialInstance);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, 0, 0);
    roadMesh.receiveShadow = true;
    sceneRef.add(roadMesh);
  }
  console.log("Roads created.");
}

// --- Stars ---
function createStars() {
  if (!sceneRef) return;
  console.log("Creating stars...");
  const starGeometry = new THREE.BufferGeometry();
  const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 2.0,
    sizeAttenuation: true,
  });
  const starVertices = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    const r = STAR_FIELD_RADIUS * (0.5 + Math.random() * 0.5);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.cos(phi);
    const z = r * Math.sin(phi) * Math.sin(theta);

    if (r > 1000 && y > -STAR_FIELD_RADIUS * 0.1) {
      starVertices.push(x, y, z);
    } else {
      i--;
    }
  }
  starGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(starVertices, 3)
  );
  const stars = new THREE.Points(starGeometry, starMaterial);
  sceneRef.add(stars);
  console.log("Stars created.");
  return stars;
}

// --- World Population Function ---
function populateLandscape() {
  if (!sceneRef) {
    console.error("Cannot populate landscape, scene not set.");
    return;
  }
  console.log("Populating landscape...");
  buildingBoundingBoxes = [];

  createSkyscrapers(BUILDING_COUNT);
  createHouses(HOUSE_CLUSTERS);
  createPonds(POND_COUNT);
  // createLandmarks(LANDMARK_COUNT); // Add if using generic landmarks

  // Specific Landmarks from example (ensure functions exist or are added)
  // If these functions load models, they need to be integrated with the LoadingManager
  // createCastle();
  // createBigHouse(50); // Example function name
  // createGiantRobot();
  // createMountain();
  // createUFO();
  // createBlimp();

  // Create trees AFTER buildings/landmarks to avoid placing trees inside them
  createTrees(TREE_COUNT);
  createRoads();

  console.log("Landscape population complete.");
}

// --- Load Assets ---
export function loadWorldAssets(manager) {
  const textureLoader = new THREE.TextureLoader(manager);

  return new Promise((resolve, reject) => {
    let texturesLoaded = 0;
    const totalTextures = 2; 

    const checkCompletion = () => {
      if (texturesLoaded === totalTextures) {
        console.log("Essential world textures loaded.");
        resolve({ roadTexture, grassTexture });
      }
    };

    console.log("Loading world textures...");
    textureLoader.load(
      GRASS_TEXTURE_URL,
      (texture) => {
        console.log("Grass texture loaded.");
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        const repeats = GROUND_SIZE / 150;
        texture.repeat.set(repeats, repeats);
        grassTexture = texture;
        texturesLoaded++;
        checkCompletion();
      },
      undefined,
      (err) => {
        console.error("Failed to load grass texture", err);
        reject(err);
      }
    );

    textureLoader.load(
      ROAD_TEXTURE_URL,
      (texture) => {
        console.log("Road texture loaded.");
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        roadTexture = texture;
        texturesLoaded++;
        checkCompletion();
      },
      undefined,
      (err) => {
        console.error("Failed to load road texture", err);
        reject(err);
      }
    );

  });
}

export function initializeWorld(scene) {
  sceneRef = scene;

  createGround();

  populateLandscape(); 

  createStars();
  createClouds(); 

  return {
    buildingBoundingBoxes: buildingBoundingBoxes,
    clouds: clouds,
  };
}

export function updateWorld(deltaTime) {
  if (clouds) {
    clouds.position.x += CLOUD_DRIFT_SPEED * deltaTime;
    if (clouds.position.x > CLOUD_AREA_XZ) {
      clouds.position.x -= CLOUD_AREA_XZ * 2;
    }
  }

}
