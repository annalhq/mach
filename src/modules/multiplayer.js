// src/modules/multiplayer.js
import * as THREE from "three";
import { WEBSOCKET_URL, PLAYER_UPDATE_INTERVAL } from "./config.js";
import { getPlayerState } from "./player.js"; // Function to get local player's state
import { updatePlayerCountUI, updateConnectionStatus } from "./ui.js"; // UI update functions

// --- Module Scope Variables ---
let ws = null;
let playerId = null;
let otherPlayers = {}; // Map: { id: { mesh: THREE.Mesh, lastUpdate: number } }
let sceneRef = null; // Reference to the main scene object
let lastUpdateTime = 0;
let connectAttemptInterval = null; // To manage reconnection attempts

const PLAYER_MESH_CACHE = {}; // Simple cache for geometries/materials

// --- Helper for creating player meshes ---
function getOtherPlayerMesh() {
  const key = "otherPlayer";
  if (!PLAYER_MESH_CACHE[key]) {
    // Use a slightly different shape/color for other players
    const geometry = new THREE.ConeGeometry(2.2, 8, 6); // Slightly wider cone, fewer segments
    geometry.rotateX(Math.PI / 2);
    const material = new THREE.MeshStandardMaterial({
      color: 0x00ff00, // Green
      metalness: 0.4,
      roughness: 0.7,
      emissive: 0x003300, // Slight green glow
    });
    PLAYER_MESH_CACHE[key] = { geometry, material };
  }
  const cache = PLAYER_MESH_CACHE[key];
  const mesh = new THREE.Mesh(cache.geometry, cache.material); // Use cached geo/mat
  mesh.castShadow = true;
  return mesh;
}

// --- WebSocket Connection Logic ---
export function connectWebSocket(scene) {
  if (
    ws &&
    (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)
  ) {
    console.log("WebSocket connection already open or connecting.");
    return;
  }

  sceneRef = scene; // Store scene reference
  console.log(`Attempting to connect to WebSocket: ${WEBSOCKET_URL}`);
  updateConnectionStatus("Connecting...", "yellow");

  // Clear previous interval if exists
  if (connectAttemptInterval) {
    clearInterval(connectAttemptInterval);
    connectAttemptInterval = null;
  }

  ws = new WebSocket(WEBSOCKET_URL);

  ws.onopen = () => {
    console.log("WebSocket connected");
    updateConnectionStatus("Connected", "lime");
    lastUpdateTime = Date.now(); // Reset update timer
    // Stop reconnection attempts if any were running
    if (connectAttemptInterval) {
      clearInterval(connectAttemptInterval);
      connectAttemptInterval = null;
    }
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      handleServerMessage(message); // Process the message
    } catch (error) {
      console.error("Failed to parse server message:", event.data, error);
    }
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
    updateConnectionStatus("Error", "red");
    // The 'onclose' event will likely follow, triggering reconnection logic
  };

  ws.onclose = (event) => {
    console.log(
      `WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason}`
    );
    updateConnectionStatus("Disconnected", "orange");
    playerId = null; // Reset player ID

    // Clean up all existing other player models
    Object.keys(otherPlayers).forEach((id) => removeOtherPlayerMesh(id));
    otherPlayers = {};
    updatePlayerCountUI(0); // Update UI (only self is potentially left, but disconnected)

    ws = null; // Ensure ws is nullified

    // Attempt to reconnect after a delay, avoid spamming attempts
    if (!connectAttemptInterval) {
      console.log("Attempting to reconnect in 5 seconds...");
      connectAttemptInterval = setInterval(() => {
        if (!ws || ws.readyState === WebSocket.CLOSED) {
          connectWebSocket(sceneRef); // Try connecting again with the stored scene ref
        } else {
          // If connection succeeded elsewhere, clear interval
          clearInterval(connectAttemptInterval);
          connectAttemptInterval = null;
        }
      }, 5000); // Try every 5 seconds
    }
  };
}

// --- Message Handling ---
function handleServerMessage(message) {
  if (!message || !message.type) {
    console.warn("Received invalid message format:", message);
    return;
  }

  switch (message.type) {
    case "assign_id":
      playerId = message.id;
      console.log("Assigned Player ID:", playerId);
      updatePlayerCountUI(1); // Initial count (self)
      break;

    case "player_update":
      // Update another player's state if it's not our own ID
      if (message.id && message.id !== playerId && message.data) {
        updateOtherPlayer(message.id, message.data);
      }
      break;

    case "player_disconnect":
      // Remove another player if it's not our own ID
      if (message.id && message.id !== playerId) {
        console.log(`Player ${message.id} disconnected`);
        removeOtherPlayerMesh(message.id);
      }
      break;

    case "server_info":
      // Handle general server info, like updated total player count
      if (typeof message.playerCount === "number") {
        updatePlayerCountUI(message.playerCount);
      }
      break;

    default:
      console.warn("Unknown message type received:", message.type);
  }
}

// --- State Sending ---
export function sendStateIfNeeded() {
  const now = Date.now();
  // Check if connected, have an ID, and enough time has passed
  if (
    ws &&
    ws.readyState === WebSocket.OPEN &&
    playerId &&
    now - lastUpdateTime > PLAYER_UPDATE_INTERVAL
  ) {
    const statePayload = getPlayerState(); // Get current state from player module
    if (statePayload) {
      const stateMessage = {
        type: "update_state",
        payload: statePayload,
      };
      try {
        ws.send(JSON.stringify(stateMessage));
        lastUpdateTime = now; // Update timestamp only after successful send
      } catch (error) {
        console.error("Error sending player state:", error);
        // Consider closing connection if send fails repeatedly
      }
    }
  }
}

// --- Other Player Management ---
function updateOtherPlayer(id, data) {
  if (!sceneRef) return; // Cannot add meshes without scene reference

  let player = otherPlayers[id];

  // If player doesn't exist, create their mesh
  if (!player) {
    const mesh = getOtherPlayerMesh(); // Create/reuse mesh
    sceneRef.add(mesh);
    player = { mesh: mesh, lastUpdate: Date.now() };
    otherPlayers[id] = player;
    console.log(`Added mesh for player ${id}`);
    // No need to update count here, server_info message should handle total count
  }

  // Update position and orientation smoothly (using lerp for smoother visuals)
  if (data.position && player.mesh) {
    const targetPos = new THREE.Vector3().fromArray(data.position);
    player.mesh.position.lerp(targetPos, 0.2); // Adjust lerp factor (0.2) for smoothness
  }
  if (data.quaternion && player.mesh) {
    const targetQuat = new THREE.Quaternion().fromArray(data.quaternion);
    player.mesh.quaternion.slerp(targetQuat, 0.2); // Use slerp for quaternion interpolation
  }
  player.lastUpdate = Date.now();
}

// Remove mesh from scene and memory
function removeOtherPlayerMesh(id) {
  const player = otherPlayers[id];
  if (player && player.mesh) {
    if (sceneRef) {
      sceneRef.remove(player.mesh);
    }
    // Geometry and Material are cached, no need to dispose here if using cache
    // If not caching:
    // player.mesh.geometry.dispose();
    // player.mesh.material.dispose();
    delete otherPlayers[id];
    console.log(`Removed mesh for player ${id}`);
    // Let server_info message handle the count update
  }
}

// --- Cleanup Inactive Players (Client-side fallback) ---
export function cleanupInactivePlayers() {
  const now = Date.now();
  const timeout = 15000; // 15 seconds threshold for inactivity

  Object.keys(otherPlayers).forEach((id) => {
    const player = otherPlayers[id];
    if (now - player.lastUpdate > timeout) {
      console.warn(
        `Player ${id} seems inactive (no updates > ${timeout}ms). Removing mesh.`
      );
      removeOtherPlayerMesh(id);
    }
  });
}
