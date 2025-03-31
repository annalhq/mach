import * as THREE from "three";
import * as CONFIG from "./config.js";
import { scene } from "./sceneSetup.js";

let buildingBoundingBoxes = [];
let clouds = null;
let roadTexture = null;
let grassTexture = null;
let mountainSignTextTexture = null;

function getTerrainHeight(worldX, worldZ) {
  return (
    Math.sin(worldX * CONFIG.TERRAIN_FREQUENCY) *
    Math.cos(worldZ * CONFIG.TERRAIN_FREQUENCY) *
    CONFIG.TERRAIN_AMPLITUDE
  );
}

function createGround() {
  if (!grassTexture) {
    console.warn("Grass texture not loaded, creating fallback ground.");
    const groundGeometry = new THREE.PlaneGeometry(
      CONFIG.GROUND_SIZE,
      CONFIG.GROUND_SIZE
    );
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x555555,
      side: THREE.DoubleSide,
    });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);
    return;
  }

  console.log("Generating terrain geometry...");
  const groundGeometry = new THREE.PlaneGeometry(
    CONFIG.GROUND_SIZE,
    CONFIG.GROUND_SIZE,
    CONFIG.GROUND_SEGMENTS,
    CONFIG.GROUND_SEGMENTS
  );
  const positionAttribute = groundGeometry.attributes.position;
  const vertex = new THREE.Vector3();

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
    side: THREE.DoubleSide,
    roughness: 0.9,
    metalness: 0.1,
  });

  const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);
  console.log("Ground mesh created and added to scene.");
}

function createSkyscrapers(count) {
  console.log("Creating skyscrapers...");
  const buildingMaterial = new THREE.MeshStandardMaterial({
    color: 0xaaaaaa,
    roughness: 0.8,
    metalness: 0.2,
  });
  const buildingGeometry = new THREE.BoxGeometry(1, 1, 1);

  for (let i = 0; i < count; i++) {
    const height =
      CONFIG.MIN_BUILDING_HEIGHT +
      Math.random() * (CONFIG.MAX_BUILDING_HEIGHT - CONFIG.MIN_BUILDING_HEIGHT);
    const width = Math.random() * 50 + 20;
    const depth = Math.random() * 50 + 20;

    const materialInstance = buildingMaterial.clone();
    materialInstance.color.setHSL(0, 0, 0.5 + Math.random() * 0.3);

    const building = new THREE.Mesh(buildingGeometry, materialInstance);
    building.scale.set(width, height, depth);

    const x = (Math.random() - 0.5) * (CONFIG.GROUND_SIZE * 0.9);
    const z = (Math.random() - 0.5) * (CONFIG.GROUND_SIZE * 0.9);
    const y = getTerrainHeight(x, z) + height / 2;

    if (y - height / 2 < 0) continue;

    building.position.set(x, y, z);
    building.castShadow = true;
    building.receiveShadow = true;
    scene.add(building);

    const box = new THREE.Box3().setFromObject(building);
    buildingBoundingBoxes.push(box);
  }
  console.log("Skyscrapers created.");
}

function createHouses(clusterCount) {
  console.log("Creating house clusters...");
  const houseMaterial = new THREE.MeshStandardMaterial({
    color: 0xcc6633,
    roughness: 0.9,
  });
  const houseGeometry = new THREE.BoxGeometry(1, 1, 1);
  const housesPerCluster = 10 + Math.floor(Math.random() * 15);
  const clusterRadius = 150;

  for (let c = 0; c < clusterCount; c++) {
    let clusterX, clusterZ, clusterY;
    do {
      clusterX = (Math.random() - 0.5) * (CONFIG.GROUND_SIZE * 0.8);
      clusterZ = (Math.random() - 0.5) * (CONFIG.GROUND_SIZE * 0.8);
      clusterY = getTerrainHeight(clusterX, clusterZ);
    } while (clusterY < 5 || clusterY > CONFIG.TERRAIN_AMPLITUDE * 0.5);

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

      if (Math.abs(y - height / 2 - clusterY) > 20) continue;

      house.position.set(x, y, z);
      house.rotation.y = Math.random() * Math.PI;
      house.castShadow = true;
      house.receiveShadow = true;
      scene.add(house);

      const box = new THREE.Box3().setFromObject(house);
      buildingBoundingBoxes.push(box);
    }
  }
  console.log("House clusters created.");
}

function createPonds(count) {
  console.log("Creating ponds...");
  const pondMaterial = new THREE.MeshStandardMaterial({
    color: 0x3366aa,
    roughness: 0.2,
    metalness: 0.1,
    transparent: true,
    opacity: 0.8,
  });
  const pondSegments = 32;

  for (let i = 0; i < count; i++) {
    const radius = 50 + Math.random() * 100;
    const pondGeometry = new THREE.CircleGeometry(radius, pondSegments);

    let x, z, y;
    do {
      x = (Math.random() - 0.5) * (CONFIG.GROUND_SIZE * 0.9);
      z = (Math.random() - 0.5) * (CONFIG.GROUND_SIZE * 0.9);
      y = getTerrainHeight(x, z);
    } while (y > CONFIG.TERRAIN_AMPLITUDE * 0.3);

    const pond = new THREE.Mesh(pondGeometry, pondMaterial);
    pond.position.set(x, y - 0.5, z);
    pond.rotation.x = -Math.PI / 2;
    pond.receiveShadow = true;
    scene.add(pond);
  }
  console.log("Ponds created.");
}

function createCastleTextTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = "bold 36px system-ui";
  context.fillStyle = "white";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("CEDRIC.AI", canvas.width / 2, canvas.height / 3);
  context.fillText("CASTLE", canvas.width / 2, (canvas.height * 2) / 3);
  return new THREE.CanvasTexture(canvas);
}

function Castle() {
  const castleGroup = new THREE.Group();
  const stoneMaterial = new THREE.MeshPhongMaterial({
    color: 0x808080,
    flatShading: true,
  });

  const keep = new THREE.Mesh(new THREE.BoxGeometry(40, 60, 40), stoneMaterial);
  keep.position.y = 30;
  castleGroup.add(keep);

  const castleBannerGeometry = new THREE.PlaneGeometry(30, 15);
  const castleBannerMaterial = new THREE.MeshBasicMaterial({
    map: createCastleTextTexture(),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    fog: false,
  });
  const castleBanner = new THREE.Mesh(
    castleBannerGeometry,
    castleBannerMaterial
  );
  castleBanner.position.set(0, 40, 20.1);
  castleGroup.add(castleBanner);

  // Towers
  const towerGeometry = new THREE.CylinderGeometry(6, 8, 70, 8);
  const towerPositions = [
    [-22, 35, -22],
    [22, 35, -22],
    [-22, 35, 22],
    [22, 35, 22],
  ];
  const roofGeometry = new THREE.ConeGeometry(8, 15, 8);
  const roofMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
  towerPositions.forEach((pos) => {
    const tower = new THREE.Mesh(towerGeometry, stoneMaterial);
    tower.position.set(...pos);
    castleGroup.add(tower);
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(pos[0], pos[1] + 42, pos[2]);
    castleGroup.add(roof);
  });

  // Crenellations
  for (let x = -18; x <= 18; x += 4) {
    for (let z = -18; z <= 18; z += 4) {
      if (x === -18 || x === 18 || z === -18 || z === 18) {
        const merlon = new THREE.Mesh(
          new THREE.BoxGeometry(3, 4, 3),
          stoneMaterial
        );
        merlon.position.set(x, 62, z);
        castleGroup.add(merlon);
      }
    }
  }

  castleGroup.scale.set(3.0, 3.0, 3.0);
  castleGroup.position.set(2000, 10, 1000);
  castleGroup.position.y =
    getTerrainHeight(castleGroup.position.x, castleGroup.position.z) + 30 * 3.0;
  return castleGroup;
}

function createCastle() {
  console.log("Creating castle...");
  const castle = Castle();
  scene.add(castle);

  const castleBox = new THREE.Box3().setFromObject(castle);
  buildingBoundingBoxes.push(castleBox);
  console.log("Castle created.");
}

function BigHouse() {
  const houseGroup = new THREE.Group();
  const scale = 10;
  const width = 4 * scale + Math.random() * 4;
  const height = 6 * scale + Math.random() * 8;
  const depth = 4 * scale + Math.random() * 4;
  const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
  const buildingMaterial = new THREE.MeshPhongMaterial({
    color: new THREE.Color(
      0.7 + Math.random() * 0.3,
      0.7 + Math.random() * 0.3,
      0.7 + Math.random() * 0.3
    ),
  });
  const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
  building.position.y = height / 2;
  building.castShadow = true;
  building.receiveShadow = true;
  houseGroup.add(building);

  return houseGroup;
}

function createBigHouse(count) {
  console.log("Creating big houses...");
  for (let i = 0; i < count; i++) {
    const house = BigHouse();
    const x = (Math.random() - 0.5) * (CONFIG.GROUND_SIZE * 0.9);
    const z = (Math.random() - 0.5) * (CONFIG.GROUND_SIZE * 0.9);
    const y = getTerrainHeight(x, z);
    house.position.set(x, y, z);
    house.rotation.y = Math.random() * Math.PI * 2;
    scene.add(house);
    const box = new THREE.Box3().setFromObject(house);
    buildingBoundingBoxes.push(box);
  }
  console.log("Big houses created.");
}

// --- Giant Robot ---
function createGiantRobot() {
  console.log("Creating giant robot...");
  const robotGroup = new THREE.Group();
  const bodyMaterial = new THREE.MeshPhongMaterial({
    color: 0xb894db,
    shininess: 70,
    fog: false,
  });
  const headMaterial = new THREE.MeshPhongMaterial({
    color: 0x935dc9,
    shininess: 70,
    fog: false,
  });
  const eyeMaterial = new THREE.MeshPhongMaterial({
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 0.8,
    fog: false,
  });
  const armMaterial = new THREE.MeshPhongMaterial({
    color: 0xb894db,
    shininess: 70,
    fog: false,
  });
  const legMaterial = new THREE.MeshPhongMaterial({
    color: 0x935dc9,
    shininess: 70,
    fog: false,
  });

  const robotBody = new THREE.Mesh(
    new THREE.BoxGeometry(10, 14, 6),
    bodyMaterial
  );
  robotGroup.add(robotBody);
  const robotHead = new THREE.Mesh(
    new THREE.BoxGeometry(8, 6, 6),
    headMaterial
  );
  robotHead.position.y = 10;
  robotGroup.add(robotHead);
  const leftEye = new THREE.Mesh(
    new THREE.SphereGeometry(1, 16, 16),
    eyeMaterial
  );
  leftEye.position.set(-2, 10, 3);
  robotGroup.add(leftEye);
  const rightEye = new THREE.Mesh(
    new THREE.SphereGeometry(1, 16, 16),
    eyeMaterial
  );
  rightEye.position.set(2, 10, 3);
  robotGroup.add(rightEye);
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(2, 8, 2), armMaterial);
  leftArm.position.set(-6, 0, 0);
  robotGroup.add(leftArm);
  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(2, 8, 2), armMaterial);
  rightArm.position.set(6, 0, 0);
  robotGroup.add(rightArm);
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(3, 8, 3), legMaterial);
  leftLeg.position.set(-3, -11, 0);
  robotGroup.add(leftLeg);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(3, 8, 3), legMaterial);
  rightLeg.position.set(3, -11, 0);
  robotGroup.add(rightLeg);

  const bannerCanvas = document.createElement("canvas");
  bannerCanvas.width = 512;
  bannerCanvas.height = 128;
  const bannerContext = bannerCanvas.getContext("2d");
  bannerContext.fillStyle = "#935dc9";
  bannerContext.fillRect(0, 0, bannerCanvas.width, bannerCanvas.height);
  bannerContext.font = "bold 60px system-ui";
  bannerContext.textAlign = "center";
  bannerContext.textBaseline = "middle";
  bannerContext.fillStyle = "white";
  bannerContext.fillText(
    "NEO.AI",
    bannerCanvas.width / 2,
    bannerCanvas.height / 2
  );
  const bannerTexture = new THREE.CanvasTexture(bannerCanvas);
  const bannerMaterial = new THREE.MeshBasicMaterial({
    map: bannerTexture,
    transparent: true,
    side: THREE.DoubleSide,
    fog: false,
  });
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(16, 4), bannerMaterial);
  banner.position.y = 18;
  robotGroup.add(banner);

  robotGroup.scale.set(8.0, 8.0, 8.0);
  const x = -800;
  const z = 2000 > CONFIG.GROUND_SIZE ? CONFIG.GROUND_SIZE * 0.9 : 2000;

  const robotBaseY = 11 * 8.0;
  const y = getTerrainHeight(x, z) + robotBaseY + 20;
  robotGroup.position.set(x, y, z);
  robotGroup.rotation.y = 15.0;

  scene.add(robotGroup);

  const robotBox = new THREE.Box3().setFromObject(robotGroup);
  buildingBoundingBoxes.push(robotBox);
  console.log("Giant robot created.");
}

// --- Mountain ---
function createMountainSignTextTexture(fontLoadedPromise) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const context = canvas.getContext("2d");

  return fontLoadedPromise
    .then(() => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.font = 'bold 60px "SF Hollywood Hills"';
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.strokeStyle = "#000000";
      context.lineWidth = 2;
      context.fillStyle = "#FFFFFF";
      context.strokeText("CEDRICCHEE.COM", canvas.width / 2, canvas.height / 2);
      context.fillText("CEDRICCHEE.COM", canvas.width / 2, canvas.height / 2);
      return new THREE.CanvasTexture(canvas);
    })
    .catch((err) => {
      console.error("Font loading failed, using default for sign:", err);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.font = "bold 60px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "#FFFFFF";
      context.fillText("CEDRICCHEE.COM", canvas.width / 2, canvas.height / 2);
      return new THREE.CanvasTexture(canvas);
    });
}

let fontLoadPromise = null;

function loadMountainFont() {
  if (!fontLoadPromise) {
    console.log("Loading Hollywood font...");
    const fontFace = new FontFace(
      "SF Hollywood Hills",
      `url(${CONFIG.HOLLYWOOD_FONT_URL})`
    );
    fontLoadPromise = fontFace
      .load()
      .then((loadedFont) => {
        document.fonts.add(loadedFont);
        console.log("Hollywood font loaded.");
        return true;
      })
      .catch((err) => {
        console.error("Failed to load Hollywood font:", err);
        return false;
      });
  }
  return fontLoadPromise;
}

async function Mountain() {
  console.log("Creating mountain...");
  const mountainGroup = new THREE.Group();
  const mountainMaterial = new THREE.MeshPhongMaterial({
    color: 0x8b4513,
    flatShading: true,
  });
  const snowMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    flatShading: true,
  });

  const mountainGeometry = new THREE.ConeGeometry(100, 200, 6);
  const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
  mountain.position.y = 100;
  mountain.castShadow = true;
  mountain.receiveShadow = true;
  mountainGroup.add(mountain);

  const signTexture = await createMountainSignTextTexture(loadMountainFont());
  const mountainSignGeometry = new THREE.PlaneGeometry(120, 30);
  const mountainSignMaterial = new THREE.MeshBasicMaterial({
    map: signTexture,
    transparent: true,
    side: THREE.DoubleSide,
    fog: false,
  });
  const mountainSign = new THREE.Mesh(
    mountainSignGeometry,
    mountainSignMaterial
  );
  mountainSign.position.set(-60, 70, 40);
  mountainSign.rotation.y = -1.1;
  mountain.add(mountainSign);

  // Snow cap
  const snowCapGeometry = new THREE.ConeGeometry(40, 50, 6);
  const snowCap = new THREE.Mesh(snowCapGeometry, snowMaterial);
  snowCap.position.y = 175;
  mountain.add(snowCap);

  mountainGroup.position.set(-2000, 0, -800);
  mountainGroup.position.y = getTerrainHeight(
    mountainGroup.position.x,
    mountainGroup.position.z
  );
  mountainGroup.scale.set(2.0, 2.0, 2.0);
  mountainGroup.rotation.y = 15.0;

  return mountainGroup;
}

async function createMountain() {
  const mountain = await Mountain();
  scene.add(mountain);
  const mountainBox = new THREE.Box3().setFromObject(mountain);
  buildingBoundingBoxes.push(mountainBox);
  console.log("Mountain created.");
}

// --- UFO ---
function UFO() {
  console.log("Creating UFO ...");
  const ufoGroup = new THREE.Group();
  const ufoBodyMaterial = new THREE.MeshPhongMaterial({
    color: 0xc0c0c0,
    shininess: 80,
    fog: false,
  });
  const ufoBottomMaterial = new THREE.MeshPhongMaterial({
    color: 0xc0c0c0,
    shininess: 60,
    fog: false,
  });
  const ufoCockpitMaterial = new THREE.MeshPhongMaterial({
    color: 0x88ddff,
    transparent: true,
    opacity: 0.7,
    shininess: 100,
    fog: false,
  }); // Example blue cockpit
  const ufoTopBottomPlateMaterial = new THREE.MeshPhongMaterial({
    color: 0xc0c0c0,
    shininess: 60,
    side: THREE.DoubleSide,
    fog: false,
  });
  const ufoLightMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    fog: false,
  });

  const ufoBody = new THREE.Mesh(
    new THREE.SphereGeometry(10, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    ufoBodyMaterial
  );
  ufoBody.scale.y = 0.3;
  ufoGroup.add(ufoBody);
  const ufoBottom = new THREE.Mesh(
    new THREE.SphereGeometry(
      7,
      32,
      16,
      0,
      Math.PI * 2,
      Math.PI / 2,
      Math.PI / 4
    ),
    ufoBottomMaterial
  );
  ufoBottom.scale.y = 0.5;
  ufoGroup.add(ufoBottom);
  const ufoCockpit = new THREE.Mesh(
    new THREE.SphereGeometry(4, 32, 32),
    ufoCockpitMaterial
  );
  ufoCockpit.position.y = 3;
  ufoGroup.add(ufoCockpit);
  const ufoTopBottomPlate = new THREE.Mesh(
    new THREE.CircleGeometry(10, 32),
    ufoTopBottomPlateMaterial
  );
  ufoTopBottomPlate.rotation.x = Math.PI / 2;
  ufoGroup.add(ufoTopBottomPlate);

  // Lights
  const ufoLightPositions = [
    [5, -2, 0],
    [-5, -2, 0],
    [0, -2, 5],
    [0, -2, -5],
  ];
  ufoLightPositions.forEach((pos) => {
    const ufoLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 16, 16),
      ufoLightMaterial
    );
    ufoLight.position.set(...pos);
    ufoGroup.add(ufoLight);
  });

  ufoGroup.position.set(0, 40, 70);
  return ufoGroup;
}

function createUFO() {
  const ufoGroup = UFO();
  ufoGroup.scale.set(2.0, 2.0, 2.0);
  scene.add(ufoGroup);

  const ufoAnimation = () => {
    if (!ufoGroup) return;
    const ufoTime = Date.now() * 0.001;
    ufoGroup.position.x = 0 + Math.sin(ufoTime * 0.2) * 500;
    ufoGroup.position.z = -70 + Math.cos(ufoTime * 0.2) * 500;
    ufoGroup.position.y = 200 + Math.sin(ufoTime * 0.5) * 10;
    ufoGroup.rotation.z = Math.sin(ufoTime * 0.2) * 0.1;
    ufoGroup.rotation.x = Math.cos(ufoTime * 0.2) * 0.1;
    requestAnimationFrame(ufoAnimation);
  };
  ufoAnimation();
  console.log("UFO created.");
}

// --- Blimp ---
function Blimp(mainBodyColor, tailColor, finColor) {
  const blimpGroup = new THREE.Group();
  const blimpMainBodyMaterial = new THREE.MeshPhongMaterial({
    color: mainBodyColor,
  });
  const blimpTailMaterial = new THREE.MeshPhongMaterial({ color: tailColor });
  const blimpGondolaMaterial = new THREE.MeshPhongMaterial({ color: 0x404040 });
  const blimpFinMaterial = new THREE.MeshPhongMaterial({ color: finColor });

  const blimpMainBodyGeometry = new THREE.SphereGeometry(20, 32, 32);
  blimpMainBodyGeometry.scale(1, 1, 2.7);
  const blimpMainBody = new THREE.Mesh(
    blimpMainBodyGeometry,
    blimpMainBodyMaterial
  );
  blimpGroup.add(blimpMainBody);

  const blimpTailGeometry = new THREE.ConeGeometry(15, 20, 32);
  blimpTailGeometry.rotateX(Math.PI / 2);
  blimpTailGeometry.translate(0, 0, 45);
  const blimpTail = new THREE.Mesh(blimpTailGeometry, blimpTailMaterial);
  blimpGroup.add(blimpTail);

  const blimpGondola = new THREE.Mesh(
    new THREE.BoxGeometry(10, 5, 7),
    blimpGondolaMaterial
  );
  blimpGondola.position.y = -20;
  blimpGroup.add(blimpGondola);

  const blimpFinGeometry = new THREE.ConeGeometry(8, 15, 4);
  blimpFinGeometry.rotateX(Math.PI / 2);
  const blimpVerticalFin = new THREE.Mesh(blimpFinGeometry, blimpFinMaterial);
  blimpVerticalFin.position.set(0, 0, 50);
  blimpVerticalFin.rotation.x = Math.PI / 2;
  blimpGroup.add(blimpVerticalFin);
  const blimpHorizontalFin = new THREE.Mesh(blimpFinGeometry, blimpFinMaterial);
  blimpHorizontalFin.position.set(0, 0, 50);
  blimpHorizontalFin.rotation.z = Math.PI / 2;
  blimpGroup.add(blimpHorizontalFin);

  blimpGroup.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return blimpGroup;
}

function createBlimp() {
  console.log("Creating blimps ...");
  const blimp1 = Blimp(0xffff00, 0x00008b, 0xff0000);
  blimp1.position.set(-550, 500, -800);
  blimp1.rotation.y = -1.5;
  scene.add(blimp1);

  const blimp2 = Blimp(0xff0000, 0x008000, 0x0000ff);
  blimp2.position.set(1000, 1000, -2000);
  blimp2.rotation.y = 1.5;
  scene.add(blimp2);

  const blimp3 = Blimp(0xff007f, 0xffd700, 0x00ff00);
  blimp3.position.set(500, 600, 1000);
  blimp3.rotation.y = 2.0;
  scene.add(blimp3);
  console.log("Blimps created");
}

function createTrees(count) {
  console.log(`Creating ${count} trees...`);
  const trunkGeometry = new THREE.CylinderGeometry(
    CONFIG.TRUNK_RADIUS,
    CONFIG.TRUNK_RADIUS,
    CONFIG.TRUNK_HEIGHT,
    8
  );
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b4513,
    roughness: 0.9,
  });
  const foliageGeometry = new THREE.ConeGeometry(
    CONFIG.FOLIAGE_RADIUS,
    CONFIG.FOLIAGE_HEIGHT,
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
  const scale = new THREE.Vector3();
  let actualTreeCount = 0;

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * CONFIG.GROUND_SIZE * 0.95;
    const z = (Math.random() - 0.5) * CONFIG.GROUND_SIZE * 0.95;
    const y = getTerrainHeight(x, z);

    const minTreeHeight = -10;
    const maxTreeHeight = CONFIG.TERRAIN_AMPLITUDE * 0.8;
    let buildingCollision = false;
    const treeBox = new THREE.Box3(
      new THREE.Vector3(
        x - CONFIG.FOLIAGE_RADIUS,
        y,
        z - CONFIG.FOLIAGE_RADIUS
      ),
      new THREE.Vector3(
        x + CONFIG.FOLIAGE_RADIUS,
        y + CONFIG.TRUNK_HEIGHT + CONFIG.FOLIAGE_HEIGHT,
        z + CONFIG.FOLIAGE_RADIUS
      )
    );
    for (const buildingBox of buildingBoundingBoxes) {
      if (treeBox.intersectsBox(buildingBox)) {
        buildingCollision = true;
        break;
      }
    }

    if (y > minTreeHeight && y < maxTreeHeight && !buildingCollision) {
      // Trunk
      position.set(x, y + CONFIG.TRUNK_HEIGHT / 2, z);
      quaternion.setFromEuler(
        new THREE.Euler(0, Math.random() * Math.PI * 2, 0)
      );
      scale.setScalar(0.8 + Math.random() * 0.4);
      matrix.compose(position, quaternion, scale);
      trunkInstancedMesh.setMatrixAt(actualTreeCount, matrix);

      // Foliage
      position.set(
        x,
        y + CONFIG.TRUNK_HEIGHT + CONFIG.FOLIAGE_HEIGHT / 2 - 1,
        z
      );
      matrix.compose(position, quaternion, scale);
      foliageInstancedMesh.setMatrixAt(actualTreeCount, matrix);

      actualTreeCount++;
    }
  }

  trunkInstancedMesh.count = actualTreeCount;
  foliageInstancedMesh.count = actualTreeCount;
  trunkInstancedMesh.instanceMatrix.needsUpdate = true;
  foliageInstancedMesh.instanceMatrix.needsUpdate = true;

  scene.add(trunkInstancedMesh);
  scene.add(foliageInstancedMesh);
  console.log(`Successfully created ${actualTreeCount} trees.`);
}

function createClouds(cloudTexture) {
  if (!cloudTexture) {
    console.warn("Cloud texture not loaded, skipping cloud creation.");
    return;
  }
  console.log("Creating clouds...");
  const cloudGeometry = new THREE.BufferGeometry();
  const positions = [];

  for (let i = 0; i < CONFIG.CLOUD_COUNT; i++) {
    const x = (Math.random() - 0.5) * CONFIG.CLOUD_AREA_XZ;
    const y =
      Math.random() * (CONFIG.CLOUD_ALTITUDE_MAX - CONFIG.CLOUD_ALTITUDE_MIN) +
      CONFIG.CLOUD_ALTITUDE_MIN;
    const z = (Math.random() - 0.5) * CONFIG.CLOUD_AREA_XZ;
    positions.push(x, y, z);
  }
  cloudGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );

  const cloudMaterial = new THREE.PointsMaterial({
    size: CONFIG.CLOUD_SIZE,
    map: cloudTexture,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.6,
    sizeAttenuation: true,
    color: 0xeeeeff,
  });

  clouds = new THREE.Points(cloudGeometry, cloudMaterial);
  scene.add(clouds);
  console.log("Clouds created and added to scene.");
}

function createRoads() {
  if (!roadTexture) {
    console.warn("Road texture not loaded, skipping road creation.");
    return;
  }
  console.log(`Creating ${CONFIG.ROAD_COUNT} road segments...`);

  const roadMaterial = new THREE.MeshStandardMaterial({
    map: roadTexture,
    side: THREE.FrontSide,
    roughness: 0.9,
    metalness: 0.0,
    polygonOffset: true,
    polygonOffsetFactor: -1.0,
    polygonOffsetUnits: -1.0,
  });

  for (let i = 0; i < CONFIG.ROAD_COUNT; i++) {
    const x1 = (Math.random() - 0.5) * CONFIG.GROUND_SIZE;
    const z1 = (Math.random() - 0.5) * CONFIG.GROUND_SIZE;
    const angle = Math.random() * Math.PI * 2;
    const length =
      CONFIG.ROAD_MIN_LENGTH +
      Math.random() * (CONFIG.ROAD_MAX_LENGTH - CONFIG.ROAD_MIN_LENGTH);
    const x2 = x1 + Math.sin(angle) * length;
    const z2 = z1 + Math.cos(angle) * length;
    const x2c = Math.max(
      -CONFIG.GROUND_SIZE / 2,
      Math.min(CONFIG.GROUND_SIZE / 2, x2)
    );
    const z2c = Math.max(
      -CONFIG.GROUND_SIZE / 2,
      Math.min(CONFIG.GROUND_SIZE / 2, z2)
    );
    const dx = x2c - x1;
    const dz = z2c - z1;
    const pathLength = Math.sqrt(dx * dx + dz * dz);

    if (pathLength < CONFIG.ROAD_MIN_LENGTH) continue;

    const lengthSegments = Math.max(
      1,
      Math.ceil(pathLength / CONFIG.ROAD_SEGMENT_LENGTH)
    );
    const roadGeometry = new THREE.PlaneGeometry(
      CONFIG.ROAD_WIDTH,
      pathLength,
      1,
      lengthSegments
    );
    const positionAttribute = roadGeometry.attributes.position;
    const tempVertex = new THREE.Vector3();

    for (let j = 0; j < positionAttribute.count; j++) {
      tempVertex.fromBufferAttribute(positionAttribute, j);
      const t = (tempVertex.y + pathLength / 2) / pathLength;
      const w = tempVertex.x / CONFIG.ROAD_WIDTH;
      const worldX = x1 + dx * t;
      const worldZ = z1 + dz * t;
      const terrainY = getTerrainHeight(worldX, worldZ);
      const roadY = terrainY + CONFIG.ROAD_THICKNESS_OFFSET;
      const nx = dz / pathLength;
      const nz = -dx / pathLength;
      const offsetX = nx * w * CONFIG.ROAD_WIDTH;
      const offsetZ = nz * w * CONFIG.ROAD_WIDTH;

      positionAttribute.setZ(j, roadY);
      positionAttribute.setX(j, worldX + offsetX);
      positionAttribute.setY(j, worldZ + offsetZ);
    }
    positionAttribute.needsUpdate = true;
    roadGeometry.computeVertexNormals();

    const materialInstance = roadMaterial.clone();
    materialInstance.map = roadTexture.clone();
    materialInstance.map.needsUpdate = true;
    materialInstance.map.repeat.set(1, pathLength / CONFIG.ROAD_WIDTH);

    const roadMesh = new THREE.Mesh(roadGeometry, materialInstance);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, 0, 0);
    roadMesh.receiveShadow = true;
    scene.add(roadMesh);
  }
  console.log("Roads created.");
}

// --- Main World Creation Function ---
async function initializeWorld(textures) {
  console.log("Initializing world...");
  buildingBoundingBoxes = [];
  roadTexture = textures.road;
  grassTexture = textures.grass;

  createGround();

  createSkyscrapers(CONFIG.BUILDING_COUNT);
  createHouses(20);
  createPonds(30);
  createCastle();
  createBigHouse(50);
  createGiantRobot();
  await createMountain();
  createUFO();
  createBlimp();
  // createLandmarks(10);

  createTrees(CONFIG.TREE_COUNT);
  createClouds(textures.cloud);
  createRoads();

  console.log("World initialization complete.");
}

function updateWorld(deltaTime) {
  if (clouds) {
    clouds.position.x += CONFIG.CLOUD_DRIFT_SPEED * deltaTime;
    if (clouds.position.x > CONFIG.CLOUD_AREA_XZ / 2) {
      clouds.position.x -= CONFIG.CLOUD_AREA_XZ;
    }
  }
}

export {
  initializeWorld,
  updateWorld,
  getTerrainHeight,
  buildingBoundingBoxes,
};
