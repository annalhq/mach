import {
  getAvailableAircraft,
  selectAircraft,
  getCurrentAircraft,
} from "./aircraftConfig.js";

let aircraftSelectorElement = null;
let aircraftModalElement = null;
let selectButtonElement = null;

const AIRCRAFT_ICONS = {
  shenyang_j11: "fa-fighter-jet",
  f35_lightning: "fa-plane",
  eurofighter_typhoon: "fa-jet-fighter",
};

/**
 * Initialize the aircraft selection UI
 */
export function initializeAircraftUI() {
  // Get references to existing elements
  aircraftSelectorElement = document.getElementById("aircraft-selector");
  aircraftModalElement = document.getElementById("aircraft-modal");
  selectButtonElement = document.getElementById("aircraft-select-button");

  if (
    !aircraftSelectorElement ||
    !aircraftModalElement ||
    !selectButtonElement
  ) {
    console.error("Aircraft UI elements not found in the DOM");
    return;
  }

  selectButtonElement.classList.remove("hidden");

  selectButtonElement.addEventListener("click", () => {
    updateAircraftSelectorUI();
    aircraftModalElement.classList.remove("hidden");
  });

  aircraftModalElement.addEventListener("click", (event) => {
    if (event.target === aircraftModalElement) {
      aircraftModalElement.classList.add("hidden");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      !aircraftModalElement.classList.contains("hidden")
    ) {
      aircraftModalElement.classList.add("hidden");
    }
  });
}

/**
 * Update the aircraft selector UI
 */
function updateAircraftSelectorUI() {
  if (!aircraftSelectorElement) return;

  const aircraft = getAvailableAircraft();
  const currentAircraft = getCurrentAircraft();

  let html = `
    <div class="flex justify-between items-center border-b border-green-500 pb-3 mb-4">
      <div class="text-green-400 font-bold text-xl flex items-center">
        <i class="fas fa-fighter-jet mr-2"></i>
        Aircraft Selection
      </div>
      <button id="close-aircraft-modal" class="text-green-400 hover:text-green-200">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
  `;

  aircraft.forEach((ac) => {
    const isSelected = ac.modelUrl === currentAircraft.modelUrl;
    const icon = AIRCRAFT_ICONS[ac.id] || "fa-plane";

    html += `
      <div class="aircraft-card ${
        isSelected ? "border-green-400" : "border-green-800"
      } border-2 rounded-lg p-4 relative hover:border-green-500 transition-all duration-300 cursor-pointer" data-aircraft="${
      ac.id
    }">
        ${
          isSelected
            ? '<div class="absolute top-2 right-2 text-green-400"><i class="fas fa-check-circle"></i></div>'
            : ""
        }
        <div class="text-center text-4xl mb-4 text-green-400">
          <i class="fas ${icon}"></i>
        </div>
        <div class="text-center mb-2">
          <h3 class="text-green-200 text-lg font-bold">${ac.name}</h3>
          <p class="text-green-600 text-xs">${ac.description}</p>
        </div>
        <div class="grid grid-cols-2 gap-2 mt-4 text-xs">
          <div class="text-green-500">
            <div class="font-bold">SPEED</div>
            <div class="flex mt-1">
              ${generateStatBars(ac.maxSpeed / 200, 5)}
            </div>
          </div>
          <div class="text-green-500">
            <div class="font-bold">HANDLING</div>
            <div class="flex mt-1">
              ${generateStatBars(ac.handling, 5)}
            </div>
          </div>
        </div>
        <button class="mt-3 w-full py-2 bg-green-900 bg-opacity-50 text-green-400 hover:bg-green-800 transition-all rounded text-sm font-bold uppercase">
          ${isSelected ? "Selected" : "Select"}
        </button>
      </div>
    `;
  });

  html += `
    </div>
    <div class="mt-6 text-center text-green-600 text-xs">
      <p>Changes will apply after game restart</p>
    </div>
  `;

  aircraftSelectorElement.innerHTML = html;

  document
    .getElementById("close-aircraft-modal")
    .addEventListener("click", () => {
      aircraftModalElement.classList.add("hidden");
    });

  document.querySelectorAll(".aircraft-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      const aircraftId = card.getAttribute("data-aircraft");
      handleAircraftSelection(aircraftId);
    });
  });
}

/**
 * Generate stat bars for visual display of aircraft stats
 */
function generateStatBars(statValue, maxBars) {
  const normalizedValue = Math.max(0, Math.min(1, statValue));
  const filledBars = Math.round(normalizedValue * maxBars);
  let html = "";

  for (let i = 0; i < maxBars; i++) {
    if (i < filledBars) {
      html += '<div class="h-1 w-3 bg-green-400 mr-1"></div>';
    } else {
      html += '<div class="h-1 w-3 bg-green-800 mr-1"></div>';
    }
  }

  return html;
}

/**
 * Handle aircraft selection
 * @param {string} aircraftId The ID of the selected aircraft
 */
function handleAircraftSelection(aircraftId) {
  if (selectAircraft(aircraftId)) {
    updateAircraftSelectorUI();

    const notification = document.createElement("div");
    notification.className =
      "fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-green-900 text-green-200 px-4 py-2 rounded-md shadow-lg flex items-center";
    notification.innerHTML = `
      <i class="fas fa-info-circle mr-2"></i>
      <span>${
        getCurrentAircraft().name
      } selected. Changes will apply after game restart.</span>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add("opacity-0");
      notification.style.transition = "opacity 0.5s";
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 500);
    }, 3000);
  }
}

export { updateAircraftSelectorUI };
