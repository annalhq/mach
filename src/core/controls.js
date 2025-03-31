export const controls = {
  forward: 0,
  backward: 0,
  left: 0,
  right: 0,
  up: 0,
  down: 0,
  rollLeft: 0,
  rollRight: 0,
  boost: 0,
};

function handleKeyDown(event) {
  switch (event.code) {
    case "KeyW":
      controls.forward = 1;
      break;
    case "KeyS":
      controls.backward = 1;
      break;
    case "KeyA":
      controls.rollLeft = 1;
      break;
    case "KeyD":
      controls.rollRight = 1;
      break;
    case "ArrowUp":
      controls.up = 1;
      break;
    case "ArrowDown":
      controls.down = 1;
      break;
    case "ArrowLeft":
      controls.left = 1;
      break;
    case "ArrowRight":
      controls.right = 1;
      break;
    case "ShiftLeft":
      controls.boost = 1;
      break;
  }
}

function handleKeyUp(event) {
  switch (event.code) {
    case "KeyW":
      controls.forward = 0;
      break;
    case "KeyS":
      controls.backward = 0;
      break;
    case "KeyA":
      controls.rollLeft = 0;
      break;
    case "KeyD":
      controls.rollRight = 0;
      break;
    case "ArrowUp":
      controls.up = 0;
      break;
    case "ArrowDown":
      controls.down = 0;
      break;
    case "ArrowLeft":
      controls.left = 0;
      break;
    case "ArrowRight":
      controls.right = 0;
      break;
    case "ShiftLeft":
      controls.boost = 0;
      break;
  }
}

export function setupControls() {
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);
}

export function removeControls() {
  document.removeEventListener("keydown", handleKeyDown);
  document.removeEventListener("keyup", handleKeyUp);
}
