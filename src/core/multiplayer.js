import * as THREE from "three";
import * as CONFIG from "./config.js";
import { scene } from "./sceneSetup.js";

let ws;
let playerId = null;
let otherPlayers = new Map(); // Map<playerId, { mesh: THREE.Mesh, lastUpdate: number }>
let lastUpdateTime = 0;
let loadedModelTemplate = null;

let playersCountElement;
let errorDisplayElement = null;

function initializeMultiplayer(modelTemplate) {
  loadedModelTemplate = modelTemplate;
  playersCountElement = document.getElementById("players-count");
  if (!playersCountElement) {
    console.error("Player count UI element not found!");
  }
  setupWebSocket();
}

function setupWebSocket() {
  clearErrorDisplay();

  ws = new WebSocket(CONFIG.WEBSOCKET_URL);

  ws.onopen = () => {
    console.log("WebSocket connection established");
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      handleServerMessage(message);
    } catch (error) {
      console.error("Failed to parse message or process:", error);
    }
    updatePlayerCount();
  };

  ws.onerror = (error) => {
    console.error("WebSocket Error:", error);
    displayError("Server not connected, please refresh.");
    cleanupMultiplayer();
  };

  ws.onclose = (event) => {
    console.log("WebSocket connection closed.", event.code, event.reason);
    if (playerId) {
      displayError("Disconnected. Please refresh.");
    }
    cleanupMultiplayer();
  };
}

function handleServerMessage(message) {
  switch (message.type) {
    case "assign_id":
      playerId = message.id;
      console.log("Assigned player ID:", playerId);
      break;
    case "player_update":
      if (message.id !== playerId) {
        updateOtherPlayer(message.id, message.data);
      }
      break;
    case "player_join":
      if (message.id !== playerId) {
        console.log("Player joined:", message.id);
        addOtherPlayer(message.id, message.data);
      }
      break;
    case "player_leave":
      if (otherPlayers.has(message.id)) {
        console.log("Player left:", message.id);
        removeOtherPlayer(message.id);
      }
      break;
    case "world_state":
      console.log(
        `Received world state with ${message.players.length} players.`
      );
      message.players.forEach((playerData) => {
        if (playerData.id !== playerId) {
          addOtherPlayer(playerData.id, playerData.data);
        }
      });
      break;
    default:
      console.log("Unknown message type:", message.type);
  }
}

function addOtherPlayer(id, data) {
  if (otherPlayers.has(id) || !loadedModelTemplate) {
    console.warn(
      `Skipping addOtherPlayer for ${id}: Already exists or template not ready.`
    );
    return;
  }
  console.log(`Adding other player ${id}...`);

  const otherAircraftMesh = loadedModelTemplate.clone();
  otherAircraftMesh.castShadow = true;

  if (data && data.position && data.quaternion) {
    try {
      otherAircraftMesh.position.fromArray(data.position);
      otherAircraftMesh.quaternion.fromArray(data.quaternion);
    } catch (e) {
      console.error(`Error setting initial state for player ${id}:`, e, data);
      otherAircraftMesh.position.set(0, 50, 0);
    }
  } else {
    otherAircraftMesh.position.set(0, 50, 0);
    console.log(
      `Player ${id} joined with no initial data, placing at default.`
    );
  }

  scene.add(otherAircraftMesh);
  otherPlayers.set(id, { mesh: otherAircraftMesh, lastUpdate: Date.now() });
  console.log(`Added player ${id} to scene.`);
}

function updateOtherPlayer(id, data) {
  const player = otherPlayers.get(id);
  if (player) {
    try {
      if (data.position) player.mesh.position.fromArray(data.position);
      if (data.quaternion) player.mesh.quaternion.fromArray(data.quaternion);
      player.lastUpdate = Date.now();
    } catch (e) {
      console.error(`Error updating player ${id}:`, e, data);
    }
  } else {
    console.log(`Received update for unknown player ${id}, adding them.`);
    addOtherPlayer(id, data);
  }
}

function removeOtherPlayer(id) {
  const player = otherPlayers.get(id);
  if (player) {
    scene.remove(player.mesh);

    otherPlayers.delete(id);
    console.log(`Removed player ${id} from scene.`);
  }
}

function sendUpdateToServerIfReady(playerData) {
  const now = Date.now();
  if (
    ws &&
    ws.readyState === WebSocket.OPEN &&
    playerId &&
    playerData &&
    now - lastUpdateTime > CONFIG.UPDATE_INTERVAL_MS
  ) {
    const message = {
      type: "player_update",
      id: playerId,
      data: playerData,
    };
    try {
      ws.send(JSON.stringify(message));
      lastUpdateTime = now;
    } catch (error) {
      console.error("Failed to send update:", error);
    }
  }
}

function updatePlayerCount() {
  if (playersCountElement) {
    playersCountElement.textContent = otherPlayers.size + (playerId ? 1 : 0);
  }
}

function displayError(message) {
  console.error("Displaying Error:", message);

  const errorDisplay = document.getElementById("error-display");
  const errorMessage = document.getElementById("error-message");

  if (errorDisplay && errorMessage) {
    errorMessage.textContent = message;
    errorDisplay.classList.remove("hidden");
  }

  const indicator = document.getElementById("loading-indicator");
  if (indicator && (!errorDisplay || !errorMessage)) {
    indicator.textContent = `Error: ${message}`;
    indicator.style.color = "red";
    indicator.style.display = "block";
    indicator.style.backgroundColor = "rgba(50,0,0,0.8)";
  }
}

function clearErrorDisplay() {
  const errorDisplay = document.getElementById("error-display");
  if (errorDisplay) {
    errorDisplay.classList.add("hidden");
  }

  const indicator = document.getElementById("loading-indicator");
  if (indicator && indicator.textContent.startsWith("Error:")) {
    indicator.style.display = "none";
  }
}

function cleanupMultiplayer() {
  console.log("Cleaning up multiplayer state...");
  if (ws) {
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;
    if (
      ws.readyState === WebSocket.OPEN ||
      ws.readyState === WebSocket.CONNECTING
    ) {
      ws.close();
    }
    ws = null;
  }
  playerId = null;
  otherPlayers.forEach((player) => {
    scene.remove(player.mesh);
  });
  otherPlayers.clear();
  lastUpdateTime = 0;
  updatePlayerCount();
}

export {
  initializeMultiplayer,
  sendUpdateToServerIfReady,
  updatePlayerCount,
  displayError,
  playerId,
};
