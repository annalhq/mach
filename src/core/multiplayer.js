import * as THREE from "three";
import * as CONFIG from "./config.js";
import { scene } from "./sceneSetup.js";

let ws;
let playerId = null;
let otherPlayers = new Map(); // Map<playerId, { mesh: THREE.Mesh, lastUpdate: number }>
let lastUpdateTime = 0;
let loadedModelTemplate = null; // Store reference passed during initialization

// DOM Element
let playersCountElement;
let errorDisplayElement = null; // Optional: Element to show errors persistently

function initializeMultiplayer(modelTemplate) {
  loadedModelTemplate = modelTemplate; // Receive the loaded model
  playersCountElement = document.getElementById("players-count");
  if (!playersCountElement) {
    console.error("Player count UI element not found!");
  }
  setupWebSocket();
}

function setupWebSocket() {
  // Clear previous error messages if any
  clearErrorDisplay();

  ws = new WebSocket(CONFIG.WEBSOCKET_URL);

  ws.onopen = () => {
    console.log("WebSocket connection established");
    // Connection successful, can hide loading/error messages potentially
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      handleServerMessage(message);
    } catch (error) {
      console.error("Failed to parse message or process:", error);
    }
    updatePlayerCount(); // Update count after any message potentially changes it
  };

  ws.onerror = (error) => {
    console.error("WebSocket Error:", error);
    displayError("Connection error. Please refresh.");
    cleanupMultiplayer();
  };

  ws.onclose = (event) => {
    console.log("WebSocket connection closed.", event.code, event.reason);
    if (playerId) {
      // Only show error if we were actually connected
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
        addOtherPlayer(message.id, message.data); // Pass data for initial placement
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

  // Clone the template
  const otherAircraftMesh = loadedModelTemplate.clone(); // Use SkeletonUtils if needed
  otherAircraftMesh.castShadow = true; // Ensure shadow casting

  // Apply a visual difference if needed (e.g., tint - simplified)
  // otherAircraftMesh.traverse(child => { ... }); // See original code for tinting example

  // Set initial state from data if available
  if (data && data.position && data.quaternion) {
    try {
      otherAircraftMesh.position.fromArray(data.position);
      otherAircraftMesh.quaternion.fromArray(data.quaternion);
    } catch (e) {
      console.error(`Error setting initial state for player ${id}:`, e, data);
      otherAircraftMesh.position.set(0, 50, 0); // Fallback position
    }
  } else {
    otherAircraftMesh.position.set(0, 50, 0); // Default spawn if no data
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
    // Apply position and rotation smoothing (interpolation) later if needed
    try {
      if (data.position) player.mesh.position.fromArray(data.position);
      if (data.quaternion) player.mesh.quaternion.fromArray(data.quaternion);
      player.lastUpdate = Date.now();
    } catch (e) {
      console.error(`Error updating player ${id}:`, e, data);
    }
  } else {
    // If update received for unknown player, add them
    console.log(`Received update for unknown player ${id}, adding them.`);
    addOtherPlayer(id, data);
  }
}

function removeOtherPlayer(id) {
  const player = otherPlayers.get(id);
  if (player) {
    scene.remove(player.mesh);
    // Properly dispose of geometry/material if necessary, especially if cloned materials were used
    // player.mesh.traverse(child => { ... dispose ... });
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
      // Consider attempting reconnect or notifying user
    }
  }
}

function updatePlayerCount() {
  if (playersCountElement) {
    playersCountElement.textContent = otherPlayers.size + (playerId ? 1 : 0); // Only count self if connected
  }
}

function displayError(message) {
  console.error("Displaying Error:", message); // Log it too
  // Use a dedicated div or modify the loading indicator
  const indicator = document.getElementById("loading-indicator");
  if (indicator) {
    indicator.textContent = `Error: ${message}`;
    indicator.style.color = "red";
    indicator.style.display = "block";
    indicator.style.backgroundColor = "rgba(50,0,0,0.8)";
  }
  // Alternatively, create/use a specific error div
  if (!errorDisplayElement) {
    errorDisplayElement = document.createElement("div");
    // Style it appropriately (absolute position, red text, etc.)
    // document.body.appendChild(errorDisplayElement);
  }
  // errorDisplayElement.textContent = message;
  // errorDisplayElement.style.display = 'block';
}

function clearErrorDisplay() {
  const indicator = document.getElementById("loading-indicator");
  if (indicator && indicator.textContent.startsWith("Error:")) {
    // Reset or hide if it was showing an error
    // indicator.style.display = 'none'; // Or reset text/style
  }
  if (errorDisplayElement) {
    // errorDisplayElement.style.display = 'none';
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
    // Dispose geometry/material if needed
  });
  otherPlayers.clear();
  lastUpdateTime = 0;
  updatePlayerCount(); // Update count to 0 or 1 (if local player still exists conceptually)
}

export {
  initializeMultiplayer,
  sendUpdateToServerIfReady,
  updatePlayerCount, // Export if needed externally
  displayError,
  playerId, // Export if needed by other modules (rarely)
};
