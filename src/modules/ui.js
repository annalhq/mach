// Cache DOM element references for performance
const speedDisplay = document.getElementById("speedDisplay");
const altitudeDisplay = document.getElementById("altitudeDisplay");
const playerCountDisplay = document.getElementById("playerCount");
const connectionStatusDisplay = document.getElementById("connectionStatus");
const debugInfoDisplay = document.getElementById("debugInfo");

// Update speed and altitude display
export function updateGameUI(speed = 0, altitude = 0) {
  if (speedDisplay) {
    // Convert speed (units/s) to km/h (example factor, adjust as needed)
    speedDisplay.textContent = Math.round(speed * 3.6);
  }
  if (altitudeDisplay) {
    altitudeDisplay.textContent = Math.round(altitude);
  }
}

// Update player count display
export function updatePlayerCountUI(count) {
  if (playerCountDisplay) {
    playerCountDisplay.textContent = count;
  }
}

// Update connection status display
export function updateConnectionStatus(statusText, color = "white") {
  if (connectionStatusDisplay) {
    connectionStatusDisplay.textContent = statusText;
    connectionStatusDisplay.style.color = color;
  }
}

// New function to update debug info
export function updateDebugInfo(message) {
  if (debugInfoDisplay) {
    debugInfoDisplay.textContent = message;
  }
  // Also log to console for debugging
  console.log("DEBUG:", message);
}
