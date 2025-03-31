import { WebSocket, WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

const clients = new Map(); // Map<ws, { id: string, lastUpdate: number, data: object | null }>
const playerStates = new Map(); // Map<playerId, data: object> - Persist state slightly even if client map entry removed briefly

const TICK_RATE = 10;
const UPDATE_INTERVAL = 1000 / TICK_RATE;
const MESSAGE_RATE_LIMIT = 15;
const CLIENT_TIMEOUT_MS = 10000;

console.log(`WebSocket server started on port ${PORT}`);

wss.on("connection", (ws) => {
  const clientId = uuidv4();
  const clientInfo = {
    id: clientId,
    lastMessageTime: Date.now(),
    messageCount: 0,
    lastUpdate: Date.now(),
    data: null,
  };
  clients.set(ws, clientInfo);
  console.log(`Client connected: ${clientId} (Total: ${clients.size})`);

  ws.send(JSON.stringify({ type: "assign_id", id: clientId }));

  const allPlayersData = [];
  playerStates.forEach((data, id) => {
    if (id !== clientId) {
      allPlayersData.push({ id, data });
    }
  });
  if (allPlayersData.length > 0) {
    ws.send(JSON.stringify({ type: "world_state", players: allPlayersData }));
    console.log(`Sent world state to ${clientId}`);
  }

  broadcast({ type: "player_join", id: clientId, data: null }, ws);

  ws.on("message", (message) => {
    const now = Date.now();
    const clientData = clients.get(ws);

    if (!clientData) return;

    if (now - clientData.lastMessageTime < 1000) {
      clientData.messageCount++;
      if (clientData.messageCount > MESSAGE_RATE_LIMIT) {
        console.warn(
          `Client ${clientData.id} exceeded rate limit. Disconnecting.`
        );
        ws.terminate();
        return;
      }
    } else {
      clientData.lastMessageTime = now;
      clientData.messageCount = 1;
    }
    clientData.lastUpdate = now;

    try {
      const parsedMessage = JSON.parse(message);
      // Basic validation
      if (
        typeof parsedMessage !== "object" ||
        !parsedMessage.type ||
        parsedMessage.id !== clientData.id
      ) {
        console.warn(
          `Invalid message format or ID mismatch from ${clientData.id}`
        );
        return;
      }

      switch (parsedMessage.type) {
        case "player_update":
          if (
            parsedMessage.data &&
            typeof parsedMessage.data.position === "object" &&
            typeof parsedMessage.data.quaternion === "object"
          ) {
            playerStates.set(clientData.id, parsedMessage.data);
          } else {
            console.warn(`Invalid player_update data from ${clientData.id}`);
          }
          break;

        default:
          console.log(
            `Received unhandled message type ${parsedMessage.type} from ${clientData.id}`
          );
      }
    } catch (error) {
      console.error(`Failed to parse message from ${clientData.id}:`, error);
    }
  });

  ws.on("close", () => {
    handleDisconnect(ws);
  });

  ws.on("error", (error) => {
    console.error(
      `WebSocket error for client ${clients.get(ws)?.id || "unknown"}:`,
      error
    );
    handleDisconnect(ws);
  });
});

function handleDisconnect(ws) {
  const clientInfo = clients.get(ws);
  if (clientInfo) {
    console.log(
      `Client disconnected: ${clientInfo.id} (Total: ${clients.size - 1})`
    );
    broadcast({ type: "player_leave", id: clientInfo.id }, ws);
    clients.delete(ws);
    playerStates.delete(clientInfo.id);
  }
}

setInterval(() => {
  const updates = [];
  playerStates.forEach((data, id) => {
    if (data) {
      updates.push({ type: "player_update", id: id, data: data });
    }
  });

  if (updates.length > 0) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        const clientInfo = clients.get(client);
        if (clientInfo) {
          updates.forEach((update) => {
            if (update.id !== clientInfo.id) {
              client.send(JSON.stringify(update));
            }
          });
        }
      }
    });
  }
}, UPDATE_INTERVAL);

setInterval(() => {
  const now = Date.now();
  clients.forEach((clientInfo, ws) => {
    if (now - clientInfo.lastUpdate > CLIENT_TIMEOUT_MS) {
      console.log(`Client ${clientInfo.id} timed out. Disconnecting.`);
      ws.terminate();
      handleDisconnect(ws);
    }
  });
}, CLIENT_TIMEOUT_MS / 2);

function broadcast(message, senderWs) {
  const messageString = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client !== senderWs && client.readyState === WebSocket.OPEN) {
      client.send(messageString);
    }
  });
}
