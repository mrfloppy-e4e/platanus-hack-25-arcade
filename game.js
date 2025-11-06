// Platanus Hack 25: Circuit Composer
// Build tiny digital circuits to solve logic puzzles!

const config = {
  type: Phaser.AUTO,
  width: 850,
  height: 650,
  backgroundColor: '#001122',
  scene: {
    create: create,
    update: update
  }
};

const game = new Phaser.Game(config);

// Arcade Control Mapping - Optimized for Real Arcade Cabinet
const ARCADE_CONTROLS = {
  // Player 1 Joystick
  P1L: ['ArrowLeft', 'KeyA'],
  P1R: ['ArrowRight', 'KeyD'], 
  P1U: ['ArrowUp', 'KeyW'],
  P1D: ['ArrowDown', 'KeyS'],
  
  // Player 1 Action Buttons (Top Row)
  P1A: ['Space', 'KeyU'],      // Primary action (place component)
  P1B: ['KeyI', 'KeyQ'],       // Secondary action (change tool/help)
  P1C: ['KeyO', 'KeyE'],       // Tertiary action (simulation toggle)
  
  // Player 1 Action Buttons (Bottom Row) - Alternative mappings
  P1X: ['KeyJ', 'KeyZ'],       // Alt primary
  P1Y: ['KeyK', 'KeyX'],       // Alt secondary  
  P1Z: ['KeyL', 'KeyC'],       // Alt tertiary
  
  // Player 1 Start Button
  START1: ['Enter', 'KeyP'],
  
  // Player 2 Controls (for potential 2-player features)
  P2L: ['Numpad4', 'KeyF'],
  P2R: ['Numpad6', 'KeyH'], 
  P2U: ['Numpad8', 'KeyT'],
  P2D: ['Numpad2', 'KeyG'],
  P2A: ['Numpad0', 'KeyR'],
  P2B: ['NumpadEnter', 'KeyY'],
  START2: ['ShiftRight', 'Backquote']
};

// Game states
const GAME_STATES = {
  SPLASH: 0,
  TUTORIAL: 1,
  PLAYING: 2
};

// Game variables
let gameState = GAME_STATES.SPLASH;
let tutorialPage = 0;
let grid = {};
let gridSize = 48; // Increased from 32 to 48 for bigger squares
let cursor = { x: 2, y: 2 };
let selectedTool = 0;
let currentLevel = 0;
let simTime = 0;
let isSimulating = false;
let levelComplete = false;
let graphics;
let keys = {};
let keysJustPressed = {};
let uiTexts = [];
let showingHelp = false;

// Circuit components and constants
const TOOLS = ['WIRE', 'AND', 'OR', 'NOT'];
const GRID_WIDTH = 16; // Reduced to fit bigger squares
const GRID_HEIGHT = 10; // Reduced to fit bigger squares

// Level definitions with detailed explanations for kids
const LEVELS = [
  {
    inputs: [1], outputs: [1], 
    title: "¡Tu Primera Conexión!",
    objective: "Conecta la luz verde (INPUT) con la luz roja (OUTPUT) usando un WIRE (cable)",
    explanation: "Los CABLES llevan la electricidad de un lugar a otro. ¡Es como una manguera para la electricidad!",
    tip: "Usa el JOYSTICK para moverte, BOTÓN A para colocar cables, y START para probar tu circuito"
  },
  {
    inputs: [1, 0], outputs: [1],
    title: "¡Elige la Luz Correcta!",
    objective: "Solo conecta la luz que está ENCENDIDA (verde) al OUTPUT",
    explanation: "A veces hay luces apagadas (grises). Solo conecta las que están encendidas (verdes).",
    tip: "Mira bien: ¿cuál luz está encendida? ¡Esa es la que debes conectar!"
  },
  {
    inputs: [1, 1], outputs: [1],
    title: "La Puerta Mágica AND",
    objective: "Conecta AMBAS luces a una puerta AND, luego conecta la AND al OUTPUT",
    explanation: "La puerta AND es como un guardia estricto: solo deja pasar electricidad si AMBAS luces están encendidas.",
    tip: "Primero conecta ambos INPUTs a la puerta AND, luego conecta la AND al OUTPUT"
  },
  {
    inputs: [1, 0], outputs: [1],
    title: "La Puerta Amigable OR",
    objective: "Conecta ambas luces a una puerta OR, luego al OUTPUT",
    explanation: "La puerta OR es como un guardia amigable: deja pasar electricidad si AL MENOS UNA luz está encendida.",
    tip: "La OR se enciende si cualquiera de sus entradas está encendida. ¡Perfecta para este nivel!"
  },
  {
    inputs: [0], outputs: [1],
    title: "¡La Puerta Rebelde NOT!",
    objective: "Usa una puerta NOT para cambiar la luz apagada en encendida",
    explanation: "La puerta NOT es rebelde: si recibe LUZ la apaga, si recibe OSCURIDAD la enciende. ¡Hace lo contrario!",
    tip: "Conecta la luz apagada (gris) a la NOT, y la NOT al OUTPUT. ¡Verás la magia!"
  },
  {
    inputs: [1, 1], outputs: [0],
    title: "El Desafío NAND",
    objective: "Combina AND + NOT para crear una puerta NAND",
    explanation: "NAND significa 'NOT AND'. Primero las luces pasan por AND, luego por NOT. ¡Es como hacer lo contrario de AND!",
    tip: "Conecta ambos INPUTs a AND, luego AND a NOT, y finalmente NOT al OUTPUT"
  },
  {
    inputs: [1, 0], outputs: [0],
    title: "El Truco NOR",
    objective: "Combina OR + NOT para crear una puerta NOR",
    explanation: "NOR significa 'NOT OR'. Si cualquier entrada está encendida, NOR la apaga. ¡Solo se enciende si TODAS están apagadas!",
    tip: "Conecta ambos INPUTs a OR, luego OR a NOT, y finalmente NOT al OUTPUT"
  },
  {
    inputs: [1, 0], outputs: [1],
    title: "El Misterio XOR",
    objective: "Crea una puerta XOR usando AND, OR y NOT",
    explanation: "XOR significa 'eXclusive OR'. Se enciende solo cuando las entradas son DIFERENTES (una encendida, otra apagada).",
    tip: "¡Pista! XOR = (A AND (NOT B)) OR ((NOT A) AND B). ¡Es un rompecabezas!"
  },
  {
    inputs: [1, 1, 0], outputs: [1],
    title: "Triple Conexión OR",
    objective: "Conecta TRES entradas usando puertas OR",
    explanation: "¡Ahora tienes 3 luces! Usa dos puertas OR: conecta dos luces a la primera OR, luego esa OR y la tercera luz a otra OR.",
    tip: "Piensa en cascada: OR1 recibe 2 luces, OR2 recibe OR1 + la tercera luz"
  },
  {
    inputs: [1, 1, 1], outputs: [1],
    title: "Triple Conexión AND",
    objective: "Conecta TRES entradas usando puertas AND",
    explanation: "Para que 3 luces pasen por AND, necesitas conectar dos AND en cascada. ¡Todas deben estar encendidas!",
    tip: "AND1 recibe 2 luces, AND2 recibe AND1 + la tercera luz. ¡Todas deben ser verdes!"
  },
  {
    inputs: [1, 0, 1], outputs: [0],
    title: "El Gran Desafío",
    objective: "Crea un circuito que se encienda solo cuando EXACTAMENTE 2 de las 3 luces estén encendidas",
    explanation: "¡El desafío final! Necesitas detectar cuando hay exactamente 2 luces encendidas. Usa tu creatividad con AND, OR y NOT.",
    tip: "Pista: Puedes crear 3 condiciones (A AND B, A AND C, B AND C) y conectarlas con OR"
  },
  {
    inputs: [1, 1, 0, 1], outputs: [1],
    title: "¡Maestro de Circuitos!",
    objective: "Diseña un circuito complejo con 4 entradas",
    explanation: "¡Eres casi un experto! Con 4 luces, crea un circuito que se encienda cuando al menos 2 estén encendidas.",
    tip: "¡Combina todo lo aprendido! AND, OR, NOT... ¡el límite es tu imaginación!"
  }
];

// Circuit logic functions
const LOGIC = {
  AND: (inputs) => inputs.every(x => x),
  OR: (inputs) => inputs.some(x => x),
  NOT: (inputs) => !inputs[0],
  WIRE: (inputs) => inputs[0] || false
};

// Game scoring and attempts system
const LEVEL_POINTS = [100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000]; // Points per level
let playerScore = 0;
let attemptsLeft = 3;
let currentLevelScore = 0;
let gameOverState = false;

// High scores system
let highScores = JSON.parse(localStorage.getItem('electroMiniHighScores') || '[]');
let showingHighScores = false;
let enteringInitials = false;
let playerInitials = '';
let currentInitialIndex = 0;

function create() {
  console.log('🔌 ElectroMini starting...');
  const scene = this;
  graphics = this.add.graphics();

  // Start with splash screen
  gameState = GAME_STATES.SPLASH;
  setupInput(scene);
  updateUI(scene);

  console.log('🔌 ElectroMini ready!');
}

function initGrid() {
  grid = {};
  for (let x = 0; x < GRID_WIDTH; x++) {
    for (let y = 0; y < GRID_HEIGHT; y++) {
      grid[`${x},${y}`] = {
        type: null,
        state: false,
        isInput: false,
        isOutput: false,
        expectedOutput: false,
        inputPattern: null,
        inputIndex: -1
      };
    }
  }
}

function loadLevel(levelIndex) {
  if (levelIndex >= LEVELS.length) return;
  
  // Reset level state
  levelComplete = false;
  gameOverState = false;
  attemptsLeft = 3;
  currentLevelScore = 0;
  isSimulating = false;
  
  initGrid();
  const level = LEVELS[levelIndex];
  const inputs = level.inputs;
  const outputs = level.outputs;
  
  // Place inputs on left side
  for (let i = 0; i < inputs.length; i++) {
    const y = Math.floor(GRID_HEIGHT / 2) - Math.floor(inputs.length / 2) + i;
    const key = `1,${y}`;
    grid[key] = {
      type: 'INPUT',
      state: inputs[i] === 1,
      isInput: true,
      isOutput: false,
      inputPattern: inputs,
      inputIndex: i
    };
  }
  
  // Place outputs on right side
  for (let i = 0; i < outputs.length; i++) {
    const y = Math.floor(GRID_HEIGHT / 2) - Math.floor(outputs.length / 2) + i;
    const key = `${GRID_WIDTH-2},${y}`;
    grid[key] = {
      type: 'OUTPUT',
      state: false,
      isInput: false,
      isOutput: true,
      expectedOutput: outputs[i] === 1
    };
  }
  
  levelComplete = false;
  isSimulating = false;
  simTime = 0;
}

function setupInput(scene) {
  scene.input.keyboard.on('keydown', (event) => {
    if (keys[event.code]) return; // Prevent key repeat
    keys[event.code] = true;
    
    if (gameState === GAME_STATES.SPLASH) {
      // Splash screen - wait for START to continue
      if (isKeyPressed('START1')) {
        gameState = GAME_STATES.TUTORIAL;
        tutorialPage = 0;
        updateUI(scene);
        playSound(600, 0.3);
      }
      return;
    }
    
    if (gameState === GAME_STATES.TUTORIAL) {
      // Tutorial navigation
      if (isKeyPressed('START1') || isKeyPressed('P1A')) {
        tutorialPage++;
        if (tutorialPage >= 4) { // 4 tutorial pages
          gameState = GAME_STATES.PLAYING;
          initGrid();
          loadLevel(currentLevel);
        }
        updateUI(scene);
        playSound(500, 0.2);
      }
      return;
    }
    
    // High scores screen
    if (showingHighScores) {
      if (isKeyPressed('START1')) {
        resetGame();
        gameState = GAME_STATES.PLAYING;
        updateUI(scene);
        playSound(600, 0.3);
      }
      return;
    }
    
    // Handle entering initials for high score (global state)
    if (enteringInitials) {
      handleInitialEntry(scene);
      return;
    }
    
    // Game playing state
    if (gameState === GAME_STATES.PLAYING) {
      // Handle game over state
      if (gameOverState) {
        if (isKeyPressed('START1')) {
          // Check if score qualifies for high score
          if (qualifiesForHighScore(playerScore)) {
            enteringInitials = true;
            playerInitials = 'AAA';
            currentInitialIndex = 0;
          } else {
            resetGame();
          }
          updateUI(scene);
        }
        return;
      }
      
      // Handle level complete state
      if (levelComplete) {
        if (isKeyPressed('P1A')) {
          if (currentLevel < LEVELS.length - 1) {
            currentLevel++;
            loadLevel(currentLevel);
          } else {
            // Game completed! Check for high score
            if (qualifiesForHighScore(playerScore)) {
              enteringInitials = true;
              playerInitials = 'AAA';
              currentInitialIndex = 0;
            } else {
              showingHighScores = true;
            }
          }
          updateUI(scene);
        }
        return;
      }

      // Toggle help screen or tool selection (B button or Y button)
      if (isKeyPressed('P1B') || isKeyPressed('P1Y')) {
        if (showingHelp) {
          showingHelp = false;
        } else {
          if (keys['ShiftLeft'] || keys['ShiftRight']) {
            // Show help with Shift+Q
            showingHelp = true;
          } else {
            // Change tool normally
            selectedTool = (selectedTool + 1) % TOOLS.length;
          }
        }
        updateUI(scene);
        return;
      }

      // Skip other controls if showing help
      if (showingHelp) return;

      // Movement
      if (isKeyPressed('P1L') && cursor.x > 0) cursor.x--;
      if (isKeyPressed('P1R') && cursor.x < GRID_WIDTH - 1) cursor.x++;
      if (isKeyPressed('P1U') && cursor.y > 0) cursor.y--;
      if (isKeyPressed('P1D') && cursor.y < GRID_HEIGHT - 1) cursor.y++;
      
      // Place component (A button or X button)
      if (isKeyPressed('P1A') || isKeyPressed('P1X')) {
        placeComponent();
      }
      
      // Toggle simulation (START button or C button)
      if (isKeyPressed('START1') || isKeyPressed('P1C')) {
        toggleSimulation();
      }
    }
  });

  scene.input.keyboard.on('keyup', (event) => {
    keys[event.code] = false;
  });
}

function isKeyPressed(key) {
  const mappedKeys = ARCADE_CONTROLS[key];
  return mappedKeys && mappedKeys.some(k => keys[k]);
}

function qualifiesForHighScore(score) {
  if (highScores.length < 10) return true;
  return score > highScores[highScores.length - 1].score;
}

function addHighScore(initials, score) {
  highScores.push({ initials, score, date: new Date().toLocaleDateString() });
  highScores.sort((a, b) => b.score - a.score);
  highScores = highScores.slice(0, 10); // Keep only top 10
  localStorage.setItem('electroMiniHighScores', JSON.stringify(highScores));
}

function resetGame() {
  currentLevel = 0;
  playerScore = 0;
  attemptsLeft = 3;
  currentLevelScore = 0;
  gameOverState = false;
  enteringInitials = false;
  showingHighScores = false;
  loadLevel(currentLevel);
}

function handleInitialEntry(scene) {
  // This function is called from the keydown event, so we know a key was pressed
  
  if (isKeyPressed('P1U')) {
    let charCode = playerInitials.charCodeAt(currentInitialIndex);
    charCode = charCode === 90 ? 65 : charCode + 1; // A-Z wrap
    playerInitials = playerInitials.substring(0, currentInitialIndex) + 
                    String.fromCharCode(charCode) + 
                    playerInitials.substring(currentInitialIndex + 1);
    updateUI(scene);
    playSound(800, 0.1);
    return;
  }
  
  if (isKeyPressed('P1D')) {
    let charCode = playerInitials.charCodeAt(currentInitialIndex);
    charCode = charCode === 65 ? 90 : charCode - 1; // Z-A wrap
    playerInitials = playerInitials.substring(0, currentInitialIndex) + 
                    String.fromCharCode(charCode) + 
                    playerInitials.substring(currentInitialIndex + 1);
    updateUI(scene);
    playSound(800, 0.1);
    return;
  }
  
  if (isKeyPressed('P1R') && currentInitialIndex < 2) {
    currentInitialIndex++;
    updateUI(scene);
    playSound(600, 0.1);
    return;
  }
  
  if (isKeyPressed('P1L') && currentInitialIndex > 0) {
    currentInitialIndex--;
    updateUI(scene);
    playSound(600, 0.1);
    return;
  }
  
  if (isKeyPressed('START1')) {
    addHighScore(playerInitials, playerScore);
    enteringInitials = false;
    showingHighScores = true;
    updateUI(scene);
    playSound(1000, 0.3);
    return;
  }
}

function update(time, delta) {
  // Only run simulation in playing state
  if (gameState === GAME_STATES.PLAYING && isSimulating) {
    simTime++;
    if (simTime % 60 === 0) { // Every second at 60fps
      simulateCircuit();
      checkWinCondition();
    }
  }
  
  drawGame();
}

function placeComponent() {
  const key = `${cursor.x},${cursor.y}`;
  const cell = grid[key];
  
  // Don't place on inputs/outputs
  if (cell.isInput || cell.isOutput) return;
  
  const tool = TOOLS[selectedTool];
  
  // Toggle component placement
  if (cell.type === tool) {
    cell.type = null;
  } else {
    cell.type = tool;
  }
  
  cell.state = false;
  playSound(800, 0.1);
}

function toggleSimulation() {
  isSimulating = !isSimulating;
  if (isSimulating) {
    simTime = 0;
    playSound(600, 0.2);
  } else {
    playSound(400, 0.2);
  }
}

function simulateCircuit() {
  // Reset all non-input states
  for (let key in grid) {
    const cell = grid[key];
    if (!cell.isInput) {
      cell.state = false;
    }
  }
  
  // Propagate signals through circuit (multiple passes for complex circuits)
  for (let pass = 0; pass < 5; pass++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      for (let y = 0; y < GRID_HEIGHT; y++) {
        const cell = grid[`${x},${y}`];
        if (!cell.type || cell.isInput) continue;
        
        const inputs = getInputSignals(x, y);
        
        if (cell.type === 'WIRE') {
          cell.state = inputs.some(i => i);
        } else if (LOGIC[cell.type]) {
          cell.state = LOGIC[cell.type](inputs);
        } else if (cell.isOutput) {
          cell.state = inputs.some(i => i);
        }
      }
    }
  }
}

function getInputSignals(x, y) {
  const inputs = [];
  const neighbors = [
    [x-1, y], [x, y-1] // Left and above
  ];
  
  for (let [nx, ny] of neighbors) {
    if (nx >= 0 && ny >= 0 && nx < GRID_WIDTH && ny < GRID_HEIGHT) {
      const neighbor = grid[`${nx},${ny}`];
      if (neighbor.type || neighbor.isInput) {
        inputs.push(neighbor.state);
      }
    }
  }
  
  return inputs.length > 0 ? inputs : [false];
}

function checkWinCondition() {
  let allCorrect = true;
  
  for (let key in grid) {
    const cell = grid[key];
    if (cell.isOutput) {
      if (cell.state !== cell.expectedOutput) {
        allCorrect = false;
        break;
      }
    }
  }
  
  if (allCorrect && !levelComplete) {
    // Level completed successfully!
    levelComplete = true;
    isSimulating = false;
    
    // Calculate score for this level
    currentLevelScore = LEVEL_POINTS[currentLevel] || 100;
    // Bonus points for attempts remaining
    const attemptsBonus = (attemptsLeft - 1) * 50;
    currentLevelScore += attemptsBonus;
    playerScore += currentLevelScore;
    
    // Reset attempts for next level
    attemptsLeft = 3;
    
    playSound(880, 0.5);
    updateUI(game.scene.getScene('default'));
    
  } else if (!allCorrect && isSimulating) {
    // Wrong solution - reduce attempts
    attemptsLeft--;
    isSimulating = false;
    
    if (attemptsLeft <= 0) {
      // Game Over
      gameOverState = true;
      playSound(200, 1.0); // Low game over sound
    } else {
      playSound(300, 0.3); // Error sound
    }
    
    updateUI(game.scene.getScene('default'));
  }
}

function updateUI(scene) {
  // Clear existing UI
  uiTexts.forEach(text => {
    if (text && text.destroy) text.destroy();
  });
  uiTexts = [];
  
  if (gameState === GAME_STATES.SPLASH) {
    drawSplashScreen(scene);
    return;
  }
  
  if (gameState === GAME_STATES.TUTORIAL) {
    drawTutorial(scene);
    return;
  }
  
  // Show high scores screen
  if (showingHighScores) {
    drawHighScores(scene);
    return;
  }
  
  // Show initial entry screen
  if (enteringInitials) {
    drawInitialEntry(scene);
    return;
  }
  
  // Show game over screen
  if (gameOverState) {
    drawGameOver(scene);
    return;
  }
  
  if (showingHelp) {
    // Help screen
    const level = LEVELS[currentLevel];
    
    // Background for help
    const helpBg = scene.add.graphics();
    helpBg.fillStyle(0x000066, 0.9);
    helpBg.fillRect(50, 50, 700, 500);
    helpBg.lineStyle(3, 0x00ffff, 1);
    helpBg.strokeRect(50, 50, 700, 500);
    uiTexts.push(helpBg);
    
    // Help title
    uiTexts.push(scene.add.text(400, 80, level.title, {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#00ffff',
      align: 'center'
    }).setOrigin(0.5));
    
    // Objective
    uiTexts.push(scene.add.text(400, 120, '🎯 OBJETIVO:', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ffff00',
      align: 'center'
    }).setOrigin(0.5));
    
    uiTexts.push(scene.add.text(400, 150, level.objective, {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 600 }
    }).setOrigin(0.5));
    
    // Explanation
    uiTexts.push(scene.add.text(400, 200, '💡 EXPLICACIÓN:', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ffff00',
      align: 'center'
    }).setOrigin(0.5));
    
    uiTexts.push(scene.add.text(400, 230, level.explanation, {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 600 }
    }).setOrigin(0.5));
    
    // Component guide
    uiTexts.push(scene.add.text(400, 290, '🔧 COMPONENTES:', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ffff00',
      align: 'center'
    }).setOrigin(0.5));
    
    const components = [
      '🟢 INPUT: Luz que puede estar encendida (verde) o apagada (gris)',
      '🔴 OUTPUT: Donde debe llegar la electricidad',
      '➖ WIRE: Cable que transporta electricidad',
      '🚪 AND: Solo se enciende si AMBAS entradas están encendidas',
      '🚪 OR: Se enciende si AL MENOS UNA entrada está encendida',
      '🚪 NOT: Hace lo contrario: enciende→apaga, apaga→enciende'
    ];
    
    for (let i = 0; i < components.length; i++) {
      uiTexts.push(scene.add.text(70, 320 + i * 25, components[i], {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#cccccc'
      }));
    }
    
    // Tip
    uiTexts.push(scene.add.text(400, 480, `💭 CONSEJO: ${level.tip}`, {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#00ff88',
      align: 'center',
      wordWrap: { width: 600 }
    }).setOrigin(0.5));
    
    // Close help instruction
    uiTexts.push(scene.add.text(400, 520, 'Presiona cualquier tecla para cerrar la ayuda y empezar a jugar', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#888888',
      align: 'center'
    }).setOrigin(0.5));
    
  } else if (gameState === GAME_STATES.PLAYING) {
    // Normal game UI
    const level = LEVELS[currentLevel];
    
    // Level info
    uiTexts.push(scene.add.text(16, 16, `NIVEL ${currentLevel + 1}/${LEVELS.length}: ${level.title}`, {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#00ffff'
    }));

    // Score and attempts
    uiTexts.push(scene.add.text(16, 42, `PUNTOS: ${playerScore}`, {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#00ff00'
    }));
    
    uiTexts.push(scene.add.text(16, 60, `INTENTOS: ${attemptsLeft}/3`, {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: attemptsLeft === 1 ? '#ff4444' : '#ffff00'
    }));

    // Tool selector
    uiTexts.push(scene.add.text(16, 78, `HERRAMIENTA: ${TOOLS[selectedTool]}`, {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#ffff00'
    }));
    
    // Simulation status
    const simText = isSimulating ? 'PROBANDO' : 'PAUSADO';
    const simColor = isSimulating ? '#00ff00' : '#ff6600';
    uiTexts.push(scene.add.text(16, 94, `ESTADO: ${simText}`, {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: simColor
    }));
    
    // Objective box
    const objBg = scene.add.graphics();
    objBg.fillStyle(0x001133, 0.8);
    objBg.fillRect(450, 16, 340, 80);
    objBg.lineStyle(2, 0x00ffff, 1);
    objBg.strokeRect(450, 16, 340, 80);
    uiTexts.push(objBg);
    
    uiTexts.push(scene.add.text(620, 28, '🎯 OBJETIVO:', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffff00',
      align: 'center'
    }).setOrigin(0.5));
    
    uiTexts.push(scene.add.text(620, 58, level.objective, {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 320 }
    }).setOrigin(0.5));
    
    // Level complete message
    if (levelComplete) {
      const completeBg = scene.add.graphics();
      completeBg.fillStyle(0x004400, 0.9);
      completeBg.fillRect(200, 160, 400, 160);
      completeBg.lineStyle(3, 0x00ff00, 1);
      completeBg.strokeRect(200, 160, 400, 160);
      uiTexts.push(completeBg);
      
      uiTexts.push(scene.add.text(400, 190, '🎉 ¡NIVEL COMPLETADO!', {
        fontSize: '20px',
        fontFamily: 'monospace',
        color: '#00ff00',
        align: 'center'
      }).setOrigin(0.5));
      
      uiTexts.push(scene.add.text(400, 220, `Puntos obtenidos: ${currentLevelScore}`, {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#ffff00',
        align: 'center'
      }).setOrigin(0.5));
      
      uiTexts.push(scene.add.text(400, 245, `Puntuación total: ${playerScore}`, {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ffffff',
        align: 'center'
      }).setOrigin(0.5));
      
      if (currentLevel < LEVELS.length - 1) {
        uiTexts.push(scene.add.text(400, 280, 'Presiona ESPACIO para el siguiente nivel', {
          fontSize: '14px',
          fontFamily: 'monospace',
          color: '#ffff00',
          align: 'center'
        }).setOrigin(0.5));
      } else {
        uiTexts.push(scene.add.text(400, 270, '🏆 ¡HAS COMPLETADO TODOS LOS NIVELES! 🏆', {
          fontSize: '16px',
          fontFamily: 'monospace',
          color: '#ffff00',  
          align: 'center'
        }).setOrigin(0.5));
        
        uiTexts.push(scene.add.text(400, 295, 'Presiona ESPACIO para ver las puntuaciones', {
          fontSize: '12px',
          fontFamily: 'monospace',
          color: '#ffffff',
          align: 'center'
        }).setOrigin(0.5));
      }
    }

    // Logic Gates Legend - Fixed on screen
    const legendBg = scene.add.graphics();
    legendBg.fillStyle(0x000033, 0.85);
    legendBg.fillRect(16, 480, 420, 130);
    legendBg.lineStyle(2, 0x0066aa, 1);
    legendBg.strokeRect(16, 480, 420, 130);
    uiTexts.push(legendBg);
    
    uiTexts.push(scene.add.text(20, 485, '🔧 GUÍA RÁPIDA DE COMPONENTES:', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#00aaff',
      fontStyle: 'bold'
    }));
    
    const legendItems = [
      '🔌 CABLE: Conecta componentes (dorado cuando activo)',
      '🔘 SWITCH: Interruptor verde=ON, rojo=OFF',
      '💡 LED: Bombilla verde=correcto, roja=error',
      '� AND: Chip que necesita AMBAS entradas ON',
      '� OR: Chip que necesita AL MENOS UNA entrada ON', 
      '� NOT: Chip que invierte la señal (ON↔OFF)'
    ];
    
    for (let i = 0; i < legendItems.length; i++) {
      uiTexts.push(scene.add.text(20, 505 + i * 16, legendItems[i], {
        fontSize: '9px',
        fontFamily: 'monospace',
        color: '#ccddff'
      }));
    }

    // Arcade Controls
    uiTexts.push(scene.add.text(16, 620, '🕹️ JOYSTICK: Mover | A: Colocar | B: Cambiar herramienta | START: Probar circuito', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#888888'
    }));
  }
}

function drawSplashScreen(scene) {
  // Animated background
  const bg = scene.add.graphics();
  bg.fillGradientStyle(0x001122, 0x003366, 0x001122, 0x003366, 1);
  bg.fillRect(0, 0, 850, 650);
  uiTexts.push(bg);
  
  // Title with glow effect
  const titleBg = scene.add.graphics();
  titleBg.fillStyle(0x0066cc, 0.8);
  titleBg.fillRoundedRect(150, 120, 550, 120, 20);
  titleBg.lineStyle(4, 0x00aaff, 1);
  titleBg.strokeRoundedRect(150, 120, 550, 120, 20);
  uiTexts.push(titleBg);
  
  uiTexts.push(scene.add.text(425, 150, '⚡ ELECTRO MINI ⚡', {
    fontSize: '48px',
    fontFamily: 'Arial Black',
    color: '#00ffff',
    align: 'center',
    stroke: '#004488',
    strokeThickness: 3
  }).setOrigin(0.5));
  
  uiTexts.push(scene.add.text(425, 200, '¡Aprende Electrónica Jugando!', {
    fontSize: '20px',
    fontFamily: 'Arial',
    color: '#ffff88',
    align: 'center'
  }).setOrigin(0.5));
  
  // Animated circuit elements
  const centerX = 425;
  const centerY = 320;
  
  // Circuit board background
  const circuitBg = scene.add.graphics();
  circuitBg.fillStyle(0x0d4f1c, 1);
  circuitBg.fillRoundedRect(centerX - 180, centerY - 60, 360, 120, 10);
  uiTexts.push(circuitBg);
  
  // Demo components with animations
  drawDemoComponent(scene, centerX - 100, centerY - 30, 'SWITCH', true);
  drawDemoComponent(scene, centerX - 30, centerY - 30, 'AND', true);
  drawDemoComponent(scene, centerX + 30, centerY - 30, 'OR', false);
  drawDemoComponent(scene, centerX + 100, centerY - 30, 'LED', true);
  
  // Connecting wires
  const wireGraphics = scene.add.graphics();
  wireGraphics.lineStyle(4, 0xffd700, 1);
  wireGraphics.moveTo(centerX - 85, centerY - 30);
  wireGraphics.lineTo(centerX - 45, centerY - 30);
  wireGraphics.moveTo(centerX - 15, centerY - 30);
  wireGraphics.lineTo(centerX + 15, centerY - 30);
  wireGraphics.moveTo(centerX + 45, centerY - 30);
  wireGraphics.lineTo(centerX + 85, centerY - 30);
  wireGraphics.strokePath();
  uiTexts.push(wireGraphics);
  
  // Instructions
  const instructionBg = scene.add.graphics();
  instructionBg.fillStyle(0x004400, 0.9);
  instructionBg.fillRoundedRect(175, 420, 500, 80, 15);
  instructionBg.lineStyle(3, 0x00aa00, 1);
  instructionBg.strokeRoundedRect(175, 420, 500, 80, 15);
  uiTexts.push(instructionBg);
  
  uiTexts.push(scene.add.text(425, 445, '🕹️ Presiona START para comenzar 🕹️', {
    fontSize: '20px',
    fontFamily: 'Arial Black',
    color: '#00ff00',
    align: 'center'
  }).setOrigin(0.5));
  
  uiTexts.push(scene.add.text(425, 475, 'Experiencia Arcade - Joystick + Botones', {
    fontSize: '14px',
    fontFamily: 'Arial',
    color: '#88ff88',
    align: 'center'
  }).setOrigin(0.5));
  
  // Footer
  uiTexts.push(scene.add.text(425, 560, 'Un juego educativo para aprender lógica digital', {
    fontSize: '12px',
    fontFamily: 'Arial',
    color: '#aaccff',
    align: 'center'
  }).setOrigin(0.5));
}

function drawDemoComponent(scene, x, y, type, isActive) {
  const graphics = scene.add.graphics();
  
  if (type === 'SWITCH') {
    graphics.fillStyle(0x2c2c2c, 1);
    graphics.fillRoundedRect(x - 15, y - 10, 30, 20, 3);
    graphics.fillStyle(isActive ? 0x00ff00 : 0xff4444, 1);
    graphics.fillCircle(x + (isActive ? 8 : -8), y, 6);
  } else if (type === 'LED') {
    graphics.fillStyle(0x888888, 1);
    graphics.fillCircle(x, y, 12);
    graphics.fillStyle(isActive ? 0x00ff00 : 0x004400, 1);
    graphics.fillCircle(x, y, 10);
    if (isActive) {
      graphics.fillStyle(0x88ff88, 0.6);
      graphics.fillCircle(x, y, 14);
    }
  } else {
    graphics.fillStyle(0x1a1a1a, 1);
    graphics.fillRoundedRect(x - 12, y - 10, 24, 20, 3);
    graphics.fillStyle(isActive ? 0x00ff00 : 0x666666, 1);
    graphics.fillRect(x - 8, y - 6, 16, 12);
  }
  
  uiTexts.push(graphics);
}

function drawTutorial(scene) {
  // Tutorial background
  const bg = scene.add.graphics();
  bg.fillGradientStyle(0x000033, 0x000066, 0x000033, 0x000066, 1);
  bg.fillRect(0, 0, 850, 650);
  uiTexts.push(bg);
  
  const tutorialData = [
    {
      title: '🔌 ¡Bienvenido al Mundo de la Electrónica!',
      content: 'Vas a aprender cómo funciona la electricidad y los circuitos.\n\n' +
               '🏠 La electricidad está en todas partes: en tu casa, en tu celular, ¡incluso en tu cuerpo!\n\n' +
               '⚡ Los circuitos son como caminos que sigue la electricidad.\n\n' +
               '🧠 Las compuertas lógicas son como pequeños cerebros que toman decisiones.',
      visual: 'intro'
    },
    {
      title: '🔧 Conoce los Componentes Básicos',
      content: '🔘 SWITCH (Interruptor): Como el interruptor de luz de tu cuarto.\n   Verde = Encendido (ON) | Rojo = Apagado (OFF)\n\n' +
               '🔌 CABLE: Transporta la electricidad, como una manguera transporta agua.\n   Dorado = Hay electricidad | Café = No hay electricidad\n\n' +
               '💡 LED: Es una bombilla que se enciende cuando llega electricidad.\n   Verde = Correcto | Rojo = Incorrecto',
      visual: 'components'
    },
    {
      title: '🚪 Las Compuertas Lógicas - Los Cerebros del Circuito',
      content: '🔲 AND: Es como un guardia estricto en una puerta.\n   Solo deja pasar si AMBAS personas tienen permiso.\n\n' +
               '🔲 OR: Es como un guardia amigable.\n   Deja pasar si AL MENOS UNA persona tiene permiso.\n\n' +
               '🔲 NOT: Es un guardia rebelde que hace lo contrario.\n   Si le dices "SÍ", él dice "NO". Si le dices "NO", él dice "SÍ".',
      visual: 'gates'
    },
    {
      title: '🕹️ ¡Controles Arcade!',
      content: '1️⃣ Usa el JOYSTICK para moverte por el tablero verde\n\n' +
               '2️⃣ Presiona BOTÓN B para cambiar de herramienta\n\n' +
               '3️⃣ Presiona BOTÓN A para colocar componentes\n\n' +
               '4️⃣ Presiona START para probar tu circuito\n\n' +
               '🎯 Tu objetivo: ¡Conectar los switches con los LEDs correctamente!',
      visual: 'controls'
    }
  ];
  
  const tutorial = tutorialData[tutorialPage];
  
  // Tutorial container - manually centered for perfect visual balance
  const containerBg = scene.add.graphics();
  const containerWidth = 640;
  const containerHeight = 420;
  const containerX = 105; // Manually adjusted for visual centering
  const containerY = 115; // Manually adjusted for visual centering
  
  containerBg.fillStyle(0x001144, 0.95);
  containerBg.fillRoundedRect(containerX, containerY, containerWidth, containerHeight, 20);
  containerBg.lineStyle(4, 0x0088ff, 1);
  containerBg.strokeRoundedRect(containerX, containerY, containerWidth, containerHeight, 20);
  uiTexts.push(containerBg);
  
  // Title
  uiTexts.push(scene.add.text(425, 155, tutorial.title, {
    fontSize: '20px',
    fontFamily: 'Arial Black',
    color: '#00ccff',
    align: 'center'
  }).setOrigin(0.5));
  
  // Content
  uiTexts.push(scene.add.text(425, 310, tutorial.content, {
    fontSize: '13px',
    fontFamily: 'Arial',
    color: '#ffffff',
    lineSpacing: 6,
    wordWrap: { width: 540 },
    align: 'center'
  }).setOrigin(0.5));
  
  // Progress indicator
  uiTexts.push(scene.add.text(425, 450, `Página ${tutorialPage + 1} de 4`, {
    fontSize: '12px',
    fontFamily: 'Arial',
    color: '#888888',
    align: 'center'
  }).setOrigin(0.5));
  
  // Navigation
  const navBg = scene.add.graphics();
  const navWidth = 240;
  const navHeight = 45;
  navBg.fillStyle(0x006600, 0.9);
  navBg.fillRoundedRect(425 - navWidth/2, 480, navWidth, navHeight, 15);
  navBg.lineStyle(3, 0x00aa00, 1);
  navBg.strokeRoundedRect(425 - navWidth/2, 480, navWidth, navHeight, 15);
  uiTexts.push(navBg);
  
  const nextText = tutorialPage < 3 ? 'ENTER para continuar' : 'ENTER para jugar';
  uiTexts.push(scene.add.text(425, 502, `🎯 ${nextText} 🎯`, {
    fontSize: '14px',
    fontFamily: 'Arial Black',
    color: '#00ff00',
    align: 'center'
  }).setOrigin(0.5));
}

function drawTutorialVisual(scene, type) {
  const centerX = 425;
  const centerY = 360;
  
  if (type === 'intro') {
    // No visual elements for intro page - keep it clean and text-focused
    
  } else if (type === 'components') {
    // Show real components in a line
    drawTutorialComponent(scene, centerX - 60, centerY, 'SWITCH', true);
    drawTutorialComponent(scene, centerX, centerY, 'WIRE', true);
    drawTutorialComponent(scene, centerX + 60, centerY, 'LED', true);
    
    // Labels
    uiTexts.push(scene.add.text(centerX - 60, centerY + 25, 'SWITCH', {
      fontSize: '10px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5));
    
    uiTexts.push(scene.add.text(centerX, centerY + 25, 'CABLE', {
      fontSize: '10px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5));
    
    uiTexts.push(scene.add.text(centerX + 60, centerY + 25, 'LED', {
      fontSize: '10px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5));
    
  } else if (type === 'gates') {
    // Show logic gates with simple examples
    drawTutorialGate(scene, centerX - 80, centerY, 'AND', [true, true], true);
    drawTutorialGate(scene, centerX, centerY, 'OR', [true, false], true);
    drawTutorialGate(scene, centerX + 80, centerY, 'NOT', [false], true);
    
    // Labels
    uiTexts.push(scene.add.text(centerX - 80, centerY + 25, 'AND', {
      fontSize: '10px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5));
    
    uiTexts.push(scene.add.text(centerX, centerY + 25, 'OR', {
      fontSize: '10px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5));
    
    uiTexts.push(scene.add.text(centerX + 80, centerY + 25, 'NOT', {
      fontSize: '10px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5));
    
  } else if (type === 'controls') {
    // No visual elements for controls page - keep it clean and text-focused
  }
}

function drawTutorialComponent(scene, x, y, type, active) {
  const graphics = scene.add.graphics();
  
  if (type === 'SWITCH') {
    graphics.fillStyle(0x2c2c2c, 1);
    graphics.fillRoundedRect(x - 15, y - 10, 30, 20, 3);
    graphics.fillStyle(active ? 0x00ff00 : 0xff4444, 1);
    graphics.fillCircle(x + (active ? 8 : -8), y, 6);
    graphics.fillStyle(0xffffff, 0.4);
    graphics.fillCircle(x + (active ? 6 : -6), y - 1, 2);
    
  } else if (type === 'LED') {
    graphics.fillStyle(0x888888, 1);
    graphics.fillCircle(x, y, 12);
    graphics.fillStyle(active ? 0x00ff00 : 0x004400, 1);
    graphics.fillCircle(x, y, 10);
    if (active) {
      graphics.fillStyle(0x88ff88, 0.6);
      graphics.fillCircle(x, y, 14);
    }
    graphics.fillStyle(0xffffff, 0.6);
    graphics.fillCircle(x - 3, y - 3, 3);
    
  } else if (type === 'WIRE') {
    graphics.lineStyle(8, active ? 0xffd700 : 0x8b4513, 1);
    graphics.moveTo(x - 25, y);
    graphics.lineTo(x + 25, y);
    graphics.strokePath();
    if (active) {
      graphics.lineStyle(4, 0xffff99, 0.8);
      graphics.moveTo(x - 25, y);
      graphics.lineTo(x + 25, y);
      graphics.strokePath();
    }
  }
  
  uiTexts.push(graphics);
}

function drawTutorialGate(scene, x, y, type, inputs, output) {
  const graphics = scene.add.graphics();
  
  // Gate body
  graphics.fillStyle(0x1a1a1a, 1);
  graphics.fillRoundedRect(x - 12, y - 12, 24, 24, 3);
  
  // Gate shape
  graphics.fillStyle(output ? 0x00ff00 : 0x666666, 1);
  if (type === 'AND') {
    graphics.fillRect(x - 8, y - 6, 10, 12);
    graphics.fillCircle(x + 2, y, 6);
  } else if (type === 'OR') {
    graphics.fillEllipse(x, y, 16, 12);
  } else if (type === 'NOT') {
    graphics.fillTriangle(x - 8, y - 6, x - 8, y + 6, x + 4, y);
    graphics.fillCircle(x + 6, y, 2);
  }
  
  // Input indicators
  for (let i = 0; i < inputs.length; i++) {
    const inputY = y + (i - inputs.length/2 + 0.5) * 12;
    graphics.fillStyle(inputs[i] ? 0x00ff00 : 0x666666, 1);
    graphics.fillCircle(x - 20, inputY, 3);
  }
  
  // Output indicator
  graphics.fillStyle(output ? 0x00ff00 : 0x666666, 1);
  graphics.fillCircle(x + 20, y, 3);
  
  uiTexts.push(graphics);
}

function drawGame() {
  // Only draw game in playing state
  if (gameState !== GAME_STATES.PLAYING) return;
  
  // Don't draw game when showing help
  if (showingHelp) return;
  
  graphics.clear();
  
  // Draw circuit board background with realistic pattern
  graphics.fillStyle(0x0d4f1c, 1); // Dark green PCB color
  graphics.fillRect(35, 105, GRID_WIDTH * gridSize + 10, GRID_HEIGHT * gridSize + 10);
  
  // Draw grid lines as PCB traces
  graphics.lineStyle(1, 0x1a7a2e, 0.8);
  for (let x = 0; x <= GRID_WIDTH; x++) {
    graphics.moveTo(x * gridSize + 40, 110);
    graphics.lineTo(x * gridSize + 40, GRID_HEIGHT * gridSize + 110);
  }
  for (let y = 0; y <= GRID_HEIGHT; y++) {
    graphics.moveTo(40, y * gridSize + 110);
    graphics.lineTo(GRID_WIDTH * gridSize + 40, y * gridSize + 110);
  }
  graphics.strokePath();
  
  // Add PCB hole pattern for authenticity
  graphics.fillStyle(0x000000, 0.3);
  for (let x = 0; x < GRID_WIDTH; x++) {
    for (let y = 0; y < GRID_HEIGHT; y++) {
      graphics.fillCircle(x * gridSize + 40 + gridSize/2, y * gridSize + 110 + gridSize/2, 2);
    }
  }
  
  // Draw cursor with glowing effect
  if (!levelComplete) {
    // Outer glow
    graphics.lineStyle(6, 0xffff00, 0.3);
    graphics.strokeRect(
      cursor.x * gridSize + 42, 
      cursor.y * gridSize + 112, 
      gridSize - 4, 
      gridSize - 4
    );
    // Inner bright border
    graphics.lineStyle(3, 0xffff00, 1);
    graphics.strokeRect(
      cursor.x * gridSize + 44, 
      cursor.y * gridSize + 114, 
      gridSize - 8, 
      gridSize - 8
    );
  }
  
  // Draw beautiful components
  for (let x = 0; x < GRID_WIDTH; x++) {
    for (let y = 0; y < GRID_HEIGHT; y++) {
      const cell = grid[`${x},${y}`];
      if (!cell.type) continue;
      
      const pixelX = x * gridSize + 40;
      const pixelY = y * gridSize + 110;
      const centerX = pixelX + gridSize/2;
      const centerY = pixelY + gridSize/2;
      
      if (cell.type === 'WIRE') {
        // Realistic copper wire trace
        const wireColor = cell.state ? 0xffd700 : 0x8b4513; // Gold when active, copper when inactive
        graphics.lineStyle(8, wireColor, 1);
        graphics.moveTo(pixelX + 8, centerY);
        graphics.lineTo(pixelX + gridSize - 8, centerY);
        graphics.strokePath();
        
        // Add wire shine effect when active
        if (cell.state) {
          graphics.lineStyle(4, 0xffff99, 0.8);
          graphics.moveTo(pixelX + 8, centerY);
          graphics.lineTo(pixelX + gridSize - 8, centerY);
          graphics.strokePath();
        }
        
      } else if (cell.type === 'INPUT') {
        // Realistic toggle switch
        // Switch base
        graphics.fillStyle(0x2c2c2c, 1);
        graphics.fillRoundedRect(pixelX + 8, pixelY + 12, gridSize - 16, gridSize - 24, 4);
        
        // Switch toggle
        const toggleX = cell.state ? pixelX + gridSize - 16 : pixelX + 12;
        graphics.fillStyle(cell.state ? 0x00ff00 : 0xff4444, 1);
        graphics.fillCircle(toggleX, centerY, 8);
        
        // Switch shine
        graphics.fillStyle(0xffffff, 0.4);
        graphics.fillCircle(toggleX - 2, centerY - 2, 3);
        
        // Status LED next to switch
        const ledColor = cell.state ? 0x00ff00 : 0x004400;
        graphics.fillStyle(ledColor, 1);
        graphics.fillCircle(centerX, pixelY + 8, 4);
        if (cell.state) {
          // LED glow effect
          graphics.fillStyle(0x88ff88, 0.6);
          graphics.fillCircle(centerX, pixelY + 8, 6);
          graphics.fillStyle(0xccffcc, 0.3);
          graphics.fillCircle(centerX, pixelY + 8, 8);
        }
        
      } else if (cell.type === 'OUTPUT') {
        // Beautiful LED bulb
        // LED base (metal)
        graphics.fillStyle(0x888888, 1);
        graphics.fillCircle(centerX, centerY, 14);
        
        // LED dome
        const ledColor = cell.state ? 
          (cell.expectedOutput ? 0x00ff00 : 0xff0000) : // Green if correct, red if wrong
          (cell.expectedOutput ? 0x004400 : 0x440000); // Dark green/red when off
        
        graphics.fillStyle(ledColor, 1);
        graphics.fillCircle(centerX, centerY, 12);
        
        if (cell.state && cell.state === cell.expectedOutput) {
          // Success glow - bright green
          graphics.fillStyle(0x88ff88, 0.7);
          graphics.fillCircle(centerX, centerY, 16);
          graphics.fillStyle(0xccffcc, 0.4);
          graphics.fillCircle(centerX, centerY, 20);
        } else if (cell.state) {
          // Error glow - red
          graphics.fillStyle(0xff8888, 0.7);
          graphics.fillCircle(centerX, centerY, 16);
        }
        
        // LED shine effect
        graphics.fillStyle(0xffffff, 0.6);
        graphics.fillCircle(centerX - 3, centerY - 3, 4);
        
      } else {
        // Logic gate chips with realistic IC appearance
        // Chip body
        graphics.fillStyle(0x1a1a1a, 1);
        graphics.fillRoundedRect(pixelX + 6, pixelY + 6, gridSize - 12, gridSize - 12, 3);
        
        // Chip pins
        graphics.fillStyle(0xc0c0c0, 1);
        for (let i = 0; i < 4; i++) {
          graphics.fillRect(pixelX + 4, pixelY + 10 + i * 6, 4, 2);
          graphics.fillRect(pixelX + gridSize - 8, pixelY + 10 + i * 6, 4, 2);
        }
        
        // Gate-specific visual elements
        if (cell.type === 'AND') {
          // AND gate symbol
          graphics.fillStyle(cell.state ? 0x00ff00 : 0x666666, 1);
          graphics.fillRect(centerX - 8, centerY - 6, 10, 12);
          graphics.fillCircle(centerX + 2, centerY, 6);
          
          // Brand marking
          graphics.fillStyle(0xffffff, 0.8);
          const scene = game.scene.getScene('default');
          const text = scene.add.text(centerX, centerY - 8, '&', {
            fontSize: '12px',
            fontFamily: 'Arial Black',
            color: '#ffffff'
          }).setOrigin(0.5);
          setTimeout(() => text.destroy(), 16);
          
        } else if (cell.type === 'OR') {
          // OR gate symbol
          graphics.fillStyle(cell.state ? 0x00ff00 : 0x666666, 1);
          graphics.fillEllipse(centerX, centerY, 16, 12);
          
          // Brand marking
          graphics.fillStyle(0xffffff, 0.8);
          const scene = game.scene.getScene('default');
          const text = scene.add.text(centerX, centerY - 8, '≥1', {
            fontSize: '10px',
            fontFamily: 'Arial Black',
            color: '#ffffff'
          }).setOrigin(0.5);
          setTimeout(() => text.destroy(), 16);
          
        } else if (cell.type === 'NOT') {
          // NOT gate symbol (triangle with circle)
          graphics.fillStyle(cell.state ? 0x00ff00 : 0x666666, 1);
          graphics.fillTriangle(
            centerX - 8, centerY - 6,
            centerX - 8, centerY + 6,
            centerX + 4, centerY
          );
          graphics.fillCircle(centerX + 6, centerY, 3);
          
          // Brand marking
          graphics.fillStyle(0xffffff, 0.8);
          const scene = game.scene.getScene('default');
          const text = scene.add.text(centerX, centerY + 8, '¬', {
            fontSize: '12px',
            fontFamily: 'Arial Black',
            color: '#ffffff'
          }).setOrigin(0.5);
          setTimeout(() => text.destroy(), 16);
        }
        
        // Chip status LED
        const statusLed = cell.state ? 0x00ff00 : 0x440000;
        graphics.fillStyle(statusLed, 1);
        graphics.fillCircle(centerX + 8, centerY - 8, 2);
        
        if (cell.state) {
          graphics.fillStyle(0x88ff88, 0.6);
          graphics.fillCircle(centerX + 8, centerY - 8, 3);
        }
      }
    }
  }
}

function drawGameOver(scene) {
  const bg = scene.add.graphics();
  bg.fillStyle(0x220000, 0.95);
  bg.fillRect(0, 0, 850, 650);
  uiTexts.push(bg);
  
  const containerBg = scene.add.graphics();
  containerBg.fillStyle(0x440000, 0.95);
  containerBg.fillRoundedRect(175, 150, 500, 350, 20);
  containerBg.lineStyle(4, 0xff4444, 1);
  containerBg.strokeRoundedRect(175, 150, 500, 350, 20);
  uiTexts.push(containerBg);
  
  uiTexts.push(scene.add.text(425, 200, '💥 GAME OVER 💥', {
    fontSize: '32px',
    fontFamily: 'Arial Black',
    color: '#ff4444',
    align: 'center'
  }).setOrigin(0.5));
  
  uiTexts.push(scene.add.text(425, 250, 'Se acabaron los intentos', {
    fontSize: '18px',
    fontFamily: 'Arial',
    color: '#ffffff',
    align: 'center'
  }).setOrigin(0.5));
  
  uiTexts.push(scene.add.text(425, 300, `Puntuación Final: ${playerScore}`, {
    fontSize: '20px',
    fontFamily: 'Arial',
    color: '#ffff00',
    align: 'center'
  }).setOrigin(0.5));
  
  uiTexts.push(scene.add.text(425, 330, `Nivel Alcanzado: ${currentLevel + 1}/${LEVELS.length}`, {
    fontSize: '16px',
    fontFamily: 'Arial',
    color: '#ffffff',
    align: 'center'
  }).setOrigin(0.5));
  
  const restartBg = scene.add.graphics();
  restartBg.fillStyle(0x006600, 0.9);
  restartBg.fillRoundedRect(275, 400, 300, 50, 15);
  restartBg.lineStyle(3, 0x00aa00, 1);
  restartBg.strokeRoundedRect(275, 400, 300, 50, 15);
  uiTexts.push(restartBg);
  
  uiTexts.push(scene.add.text(425, 425, '🎮 ENTER para reiniciar 🎮', {
    fontSize: '16px',
    fontFamily: 'Arial Black',
    color: '#00ff00',
    align: 'center'
  }).setOrigin(0.5));
}

function drawInitialEntry(scene) {
  const bg = scene.add.graphics();
  bg.fillStyle(0x001122, 0.95);
  bg.fillRect(0, 0, 850, 650);
  uiTexts.push(bg);
  
  const containerBg = scene.add.graphics();
  containerBg.fillStyle(0x002244, 0.95);
  containerBg.fillRoundedRect(175, 150, 500, 350, 20);
  containerBg.lineStyle(4, 0x00ffff, 1);
  containerBg.strokeRoundedRect(175, 150, 500, 350, 20);
  uiTexts.push(containerBg);
  
  uiTexts.push(scene.add.text(425, 200, '🏆 ¡NUEVO RECORD! 🏆', {
    fontSize: '28px',
    fontFamily: 'Arial Black',
    color: '#ffff00',
    align: 'center'
  }).setOrigin(0.5));
  
  uiTexts.push(scene.add.text(425, 250, `Puntuación: ${playerScore}`, {
    fontSize: '20px',
    fontFamily: 'Arial',
    color: '#ffffff',
    align: 'center'
  }).setOrigin(0.5));
  
  uiTexts.push(scene.add.text(425, 290, 'Ingresa tus iniciales:', {
    fontSize: '16px',
    fontFamily: 'Arial',
    color: '#ffffff',
    align: 'center'
  }).setOrigin(0.5));
  
  // Display initials with highlight
  for (let i = 0; i < 3; i++) {
    const x = 375 + i * 40;
    const isSelected = i === currentInitialIndex;
    
    const charBg = scene.add.graphics();
    charBg.fillStyle(isSelected ? 0x00ffff : 0x004444, 0.8);
    charBg.fillRoundedRect(x - 15, 330, 30, 40, 5);
    charBg.lineStyle(2, isSelected ? 0xffff00 : 0x008888, 1);
    charBg.strokeRoundedRect(x - 15, 330, 30, 40, 5);
    uiTexts.push(charBg);
    
    uiTexts.push(scene.add.text(x, 350, playerInitials[i], {
      fontSize: '24px',
      fontFamily: 'Arial Black',
      color: isSelected ? '#000000' : '#ffffff',
      align: 'center'
    }).setOrigin(0.5));
  }
  
  uiTexts.push(scene.add.text(425, 410, '🕹️ JOYSTICK: Cambiar letra y mover cursor', {
    fontSize: '14px',
    fontFamily: 'Arial',
    color: '#cccccc',
    align: 'center'
  }).setOrigin(0.5));
  
  uiTexts.push(scene.add.text(425, 450, '🎮 START para confirmar', {
    fontSize: '16px',
    fontFamily: 'Arial Black',
    color: '#00ff00',
    align: 'center'
  }).setOrigin(0.5));
}

function drawHighScores(scene) {
  const bg = scene.add.graphics();
  bg.fillStyle(0x001122, 0.95);
  bg.fillRect(0, 0, 850, 650);
  uiTexts.push(bg);
  
  const containerBg = scene.add.graphics();
  containerBg.fillStyle(0x002244, 0.95);
  containerBg.fillRoundedRect(125, 80, 600, 490, 20);
  containerBg.lineStyle(4, 0x00ffff, 1);
  containerBg.strokeRoundedRect(125, 80, 600, 490, 20);
  uiTexts.push(containerBg);
  
  uiTexts.push(scene.add.text(425, 120, '🏆 MEJORES PUNTUACIONES 🏆', {
    fontSize: '24px',
    fontFamily: 'Arial Black',
    color: '#ffff00',
    align: 'center'
  }).setOrigin(0.5));
  
  // Headers
  uiTexts.push(scene.add.text(200, 160, 'POS', {
    fontSize: '14px',
    fontFamily: 'Arial Black',
    color: '#00ffff'
  }));
  uiTexts.push(scene.add.text(280, 160, 'INICIALES', {
    fontSize: '14px',
    fontFamily: 'Arial Black',
    color: '#00ffff'
  }));
  uiTexts.push(scene.add.text(450, 160, 'PUNTOS', {
    fontSize: '14px',
    fontFamily: 'Arial Black',
    color: '#00ffff'
  }));
  uiTexts.push(scene.add.text(580, 160, 'FECHA', {
    fontSize: '14px',
    fontFamily: 'Arial Black',
    color: '#00ffff'
  }));
  
  // High scores list
  for (let i = 0; i < Math.min(10, highScores.length); i++) {
    const score = highScores[i];
    const y = 190 + i * 25;
    const color = i < 3 ? '#ffff00' : '#ffffff';
    
    uiTexts.push(scene.add.text(200, y, `${i + 1}.`, {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: color
    }));
    uiTexts.push(scene.add.text(280, y, score.initials, {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: color
    }));
    uiTexts.push(scene.add.text(450, y, score.score.toString(), {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: color
    }));
    uiTexts.push(scene.add.text(580, y, score.date, {
      fontSize: '10px',
      fontFamily: 'Arial',
      color: color
    }));
  }
  
  if (highScores.length === 0) {
    uiTexts.push(scene.add.text(425, 300, 'No hay puntuaciones aún', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#888888',
      align: 'center'
    }).setOrigin(0.5));
  }
  
  const restartBg = scene.add.graphics();
  restartBg.fillStyle(0x006600, 0.9);
  restartBg.fillRoundedRect(275, 500, 300, 50, 15);
  restartBg.lineStyle(3, 0x00aa00, 1);
  restartBg.strokeRoundedRect(275, 500, 300, 50, 15);
  uiTexts.push(restartBg);
  
  uiTexts.push(scene.add.text(425, 525, '🎮 ENTER para jugar de nuevo 🎮', {
    fontSize: '14px',
    fontFamily: 'Arial Black',
    color: '#00ff00',
    align: 'center'
  }).setOrigin(0.5));
}

function playSound(frequency, duration) {
  try {
    const scene = game.scene.getScene('default');
    if (!scene.sound || !scene.sound.context) return;
    
    const audioContext = scene.sound.context;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'square';

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (e) {
    // Audio not available
  }
}
