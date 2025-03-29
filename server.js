import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";

// --- Configuration ---
const PORT = 8080;
const PLAYER_TIMEOUT = 20000; // ms (20 seconds) - Increased timeout
const CLEANUP_INTERVAL = 10000; // ms (10 seconds) - How often to check for timeouts

// --- Server State ---
const wss = new WebSocketServer({ port: PORT });
// Map<WebSocket, { id: string, lastSeen: number }> - Use WebSocket object as key directly
const clients = new Map();
// Store last known state { playerId: { position, quaternion, speed } } - for late joiners
let playerStates = {};

console.log(`WebSocket server started on port ${PORT}`);
console.log(`Player timeout: ${PLAYER_TIMEOUT}ms`);
console.log(`Cleanup interval: ${CLEANUP_INTERVAL}ms`);

// --- Helper Functions ---

// Broadcast message to all clients *except* the senderWS (optional)
function broadcast(message, senderWS = null) {
  const messageString = JSON.stringify(message);
  wss.clients.forEach((client) => {
    // Check if client is different from sender and is ready
    if (client !== senderWS && client.readyState === WebSocket.OPEN) {
      try {
        client.send(messageString);
      } catch (error) {
        console.error(`Failed to send message to client:`, error);
        // Consider terminating client if send fails repeatedly
        // client.terminate();
      }
    }
  });
}

// Send message to a specific client
function sendToClient(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Failed to send direct message:`, error);
    }
  }
}

function broadcastPlayerCount() {
  const playerCount = clients.size;
  console.log(`Broadcasting player count: ${playerCount}`);
  broadcast({ type: "server_info", playerCount: playerCount });
}

// Cleanup inactive/disconnected players based on timeout
function cleanupDisconnectedPlayers() {
  const now = Date.now();
  let changed = false;
  // console.log("Running cleanup check..."); // Debug log

  clients.forEach((clientData, ws) => {
    if (now - clientData.lastSeen > PLAYER_TIMEOUT) {
      console.log(`Player ${clientData.id} timed out. Terminating connection.`);
      // Don't need to delete from map here, 'close' handler does it
      ws.terminate(); // Force close the connection, triggers 'close' event
      changed = true; // Flag that cleanup happened
    }
  });

  // Note: broadcastPlayerCount() is called by the 'close' handler
}

// --- WebSocket Server Event Handlers ---
wss.on("connection", (ws) => {
  const playerId = uuidv4(); // Generate unique ID
  const now = Date.now();
  console.log(`Client connected, assigning ID: ${playerId}`);

  // Store client info using WebSocket object as key
  clients.set(ws, { id: playerId, lastSeen: now });

  // 1. Send the assigned ID back to the newly connected client
  sendToClient(ws, { type: "assign_id", id: playerId });

  // 2. Send current state of *all other* players to the new client
  clients.forEach((otherClientData, otherWS) => {
    if (ws !== otherWS && playerStates[otherClientData.id]) {
      sendToClient(ws, {
        type: "player_update",
        id: otherClientData.id,
        data: playerStates[otherClientData.id],
      });
    }
  });

  // 3. Broadcast the new player's initial state (empty or default) to others?
  // Not strictly necessary if relying on first 'update_state' message
  // broadcast({ type: 'player_join', id: playerId, data: {} }, ws); // Optional

  // 4. Update player count for everyone
  broadcastPlayerCount();

  // --- Message Handling for this Connection ---
  ws.on("message", (messageBuffer) => {
    const clientData = clients.get(ws);
    if (!clientData) {
      // Should not happen if connection is established
      console.warn("Received message from unknown client (WS not in map)");
      ws.terminate(); // Close connection if state is inconsistent
      return;
    }

    // Update last seen timestamp on any message activity
    clientData.lastSeen = Date.now();

    try {
      const messageString = messageBuffer.toString();
      // Basic security: Limit message size
      if (messageString.length > 1024) {
        console.warn(
          `Player ${clientData.id} sent overly large message (${messageString.length} bytes). Ignoring.`
        );
        // Consider adding rate limiting or disconnection logic here
        return;
      }

      const message = JSON.parse(messageString);

      // Basic security: Validate message structure
      if (typeof message !== "object" || !message.type || !message.payload) {
        console.warn(
          `Player ${clientData.id} sent malformed message. Ignoring:`,
          messageString
        );
        return;
      }

      // Process valid message types
      switch (message.type) {
        case "update_state":
          // Input validation (basic check if payload looks reasonable)
          if (message.payload.position && message.payload.quaternion) {
            // Store the latest state for this player
            playerStates[clientData.id] = message.payload;

            // Broadcast the update to all *other* clients
            broadcast(
              {
                type: "player_update",
                id: clientData.id,
                data: message.payload,
              },
              ws
            ); // Exclude the original sender
          } else {
            console.warn(
              `Player ${clientData.id} sent invalid state payload. Ignoring.`
            );
          }
          break;

        // Handle other potential message types (chat, actions, etc.)
        // case 'chat_message':
        //     broadcast({ type: 'chat_broadcast', id: clientData.id, text: message.payload.text });
        //     break;

        default:
          console.warn(
            `Received unknown message type from ${clientData.id}: ${message.type}`
          );
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error(
          `Failed to parse JSON message from ${clientData.id}:`,
          messageBuffer.toString(),
          error
        );
      } else {
        console.error(`Error processing message from ${clientData.id}:`, error);
      }
      // Consider disconnecting client if they send invalid data repeatedly
    }
  });

  // --- Close Handling for this Connection ---
  ws.on("close", () => {
    const clientData = clients.get(ws);
    if (clientData) {
      const closedPlayerId = clientData.id;
      console.log(`Client ${closedPlayerId} disconnected.`);
      // Remove from state tracking
      delete playerStates[closedPlayerId];
      // Remove from active clients map
      clients.delete(ws);

      // Notify remaining players about the disconnection
      broadcast({ type: "player_disconnect", id: closedPlayerId });

      // Update player count for everyone
      broadcastPlayerCount();
    } else {
      // Closed connection was not properly tracked
      console.warn("Untracked client disconnected.");
    }
  });

  // --- Error Handling for this Connection ---
  ws.on("error", (error) => {
    const clientData = clients.get(ws);
    const logId = clientData ? clientData.id : "unknown client";
    console.error(`WebSocket error for ${logId}:`, error);
    // The 'close' event will usually be triggered after an error,
    // so cleanup is handled there. If not, the timeout will catch it.
    // Ensure connection is terminated on error.
    if (ws.readyState !== WebSocket.CLOSED) {
      ws.terminate();
    }
  });
});

// --- Periodic Tasks ---
// Set interval to run the cleanup function periodically
setInterval(cleanupDisconnectedPlayers, CLEANUP_INTERVAL);

console.log("Server setup complete. Waiting for connections...");
