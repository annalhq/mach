# Project folder structure

```md
machX-repository/
├── public/             # Static assets (models, textures)
│ 
├── src/                # Source code directory
│   ├── modules/        # JavaScript modules for different features
│   │   ├── config.js         # Game configuration constants
│   │   ├── sceneSetup.js     # Three.js scene, camera, renderer, lights setup
│   │   ├── world.js          # Ground, buildings, stars creation
│   │   ├── player.js         # Local player aircraft logic (movement, controls)
│   │   ├── cameraControls.js # Camera logic (following, FOV)
│   │   ├── multiplayer.js    # WebSocket and other player management
│   │   └── ui.js             # Updating HTML UI elements
│   └── main.js         # Main application entry point
├── index.html          # Main HTML file (entry point for Vite)
├── package.json
├── style.css           
└── vite.config.js      
```

idk will add more detailed struct later on