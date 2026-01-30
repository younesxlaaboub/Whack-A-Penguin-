// ========== GAME STATE & VARIABLES ==========
let holes = [];
let scoreDisplay;
let timeDisplay;
let startScreen;
let gameScreen;
let resultPopup;
let finalScore;
let pauseScreen;
let grid;
let highScoreDisplay;
let highScoreGame;
let difficultySelect;
let soundToggle;
let speedLevelDisplay;
let comboDisplay;
let comboCount;

// Game variables
let score = 0;
let timeLeft = 30;
let gameTimer;
let penguinTimer;
let isPaused = false;
let soundEnabled = true;
let highScore = 0;
let currentDifficulty = 'medium';

// Game statistics
let totalPenguinsSpawned = 0;
let penguinsHit = 0;
let totalClicks = 0;
let combo = 0;
let lastHitTime = 0;
let comboTimeout;

// Penguin types with probabilities and points
const PENGUIN_TYPES = [
  { type: 'normal', probability: 0.7, points: 10, showTime: 1000 },
  { type: 'golden', probability: 0.15, points: 50, showTime: 800 },
  { type: 'bomb', probability: 0.15, points: -20, showTime: 1200 }
];

// Difficulty settings
const DIFFICULTY_SETTINGS = {
  easy: { speed: 1200, penguinSpeed: 1.0, name: "Slow" },
  medium: { speed: 800, penguinSpeed: 1.3, name: "Normal" },
  hard: { speed: 600, penguinSpeed: 1.7, name: "Fast" },
  insane: { speed: 400, penguinSpeed: 2.0, name: "Crazy!" }
};

// Power-ups
let activePowerUps = {
  doubleScore: { active: false, endTime: 0, multiplier: 2 },
  freeze: { active: false, endTime: 0 }
};

// ========== DOM INITIALIZATION ==========
document.addEventListener("DOMContentLoaded", () => {
  // Get DOM elements
  scoreDisplay = document.getElementById("score");
  timeDisplay = document.getElementById("time");
  startScreen = document.getElementById("startScreen");
  gameScreen = document.getElementById("game");
  resultPopup = document.getElementById("resultPopup");
  finalScore = document.getElementById("finalScore");
  pauseScreen = document.getElementById("pauseScreen");
  grid = document.getElementById("grid");
  highScoreDisplay = document.getElementById("highScoreDisplay");
  highScoreGame = document.getElementById("highScoreGame");
  difficultySelect = document.getElementById("difficulty");
  soundToggle = document.getElementById("soundToggle");
  speedLevelDisplay = document.getElementById("speedLevel");
  comboDisplay = document.getElementById("comboDisplay");
  comboCount = document.getElementById("comboCount");

  // Load high score from localStorage
  loadHighScore();
  
  // Generate grid holes
  generateGrid();
  
  // Initialize sound
  initializeSound();
  
  // Set up event listeners
  setupEventListeners();
});

function generateGrid() {
  grid.innerHTML = '';
  holes = [];
  
  for (let i = 0; i < 25; i++) {
    const hole = document.createElement("div");
    hole.className = "hole";
    hole.dataset.index = i;
    
    // Add click listener
    hole.addEventListener("click", () => whackPenguin(hole));
    
    grid.appendChild(hole);
    holes.push(hole);
  }
}

function loadHighScore() {
  const savedScore = localStorage.getItem('whackPenguinHighScore');
  if (savedScore) {
    highScore = parseInt(savedScore);
    highScoreDisplay.textContent = highScore;
    highScoreGame.textContent = highScore;
  }
}

function initializeSound() {
  // Background music (autoplay handled by user interaction)
  const bgMusic = document.getElementById('bgMusic');
  bgMusic.volume = 0.3;
  
  // Sound toggle event
  soundToggle.addEventListener('change', function() {
    soundEnabled = this.checked;
    if (!soundEnabled) {
      bgMusic.pause();
    }
  });
}

function setupEventListeners() {
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      togglePause();
    }
    if (e.key === ' ' && isPaused) {
      togglePause();
    }
    if (e.key === 'm') {
      toggleSound();
    }
  });
  
  // Update speed display when difficulty changes
  difficultySelect.addEventListener('change', () => {
    currentDifficulty = difficultySelect.value;
    speedLevelDisplay.textContent = DIFFICULTY_SETTINGS[currentDifficulty].name;
  });
}

// ========== GAME FUNCTIONS ==========
function startGame() {
  // Reset game state
  score = 0;
  timeLeft = 30;
  totalPenguinsSpawned = 0;
  penguinsHit = 0;
  totalClicks = 0;
  combo = 0;
  isPaused = false;
  
  // Clear any existing penguins
  holes.forEach(hole => {
    hole.innerHTML = '';
  });
  
  // Update displays
  scoreDisplay.textContent = score;
  timeDisplay.textContent = timeLeft;
  currentDifficulty = difficultySelect.value;
  speedLevelDisplay.textContent = DIFFICULTY_SETTINGS[currentDifficulty].name;
  
  // Start background music if sound is enabled
  if (soundEnabled) {
    const bgMusic = document.getElementById('bgMusic');
    bgMusic.currentTime = 0;
    bgMusic.play().catch(e => console.log("Audio autoplay blocked"));
  }
  
  // Show game screen
  startScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  pauseScreen.classList.add("hidden");
  resultPopup.classList.remove("show");
  
  // Start game timers
  startTimers();
}

function startTimers() {
  // Clear any existing timers
  clearInterval(gameTimer);
  clearInterval(penguinTimer);
  
  const settings = DIFFICULTY_SETTINGS[currentDifficulty];
  
  // Game countdown timer
  gameTimer = setInterval(() => {
    if (!isPaused) {
      timeLeft--;
      timeDisplay.textContent = timeLeft;
      
      if (timeLeft <= 0) {
        endGame();
      }
    }
  }, 1000);
  
  // Penguin spawn timer
  penguinTimer = setInterval(() => {
    if (!isPaused) {
      spawnPenguin();
    }
  }, settings.speed);
  
  // Power-up update timer
  setInterval(updatePowerUps, 100);
}

function spawnPenguin() {
  // Find empty holes
  const emptyHoles = holes.filter(hole => !hole.querySelector('.penguin'));
  if (emptyHoles.length === 0) return;
  
  // Select random hole
  const randomHole = emptyHoles[Math.floor(Math.random() * emptyHoles.length)];
  
  // Select penguin type based on probability
  const rand = Math.random();
  let cumulative = 0;
  let selectedType;
  
  for (const penguin of PENGUIN_TYPES) {
    cumulative += penguin.probability;
    if (rand <= cumulative) {
      selectedType = penguin;
      break;
    }
  }
  
  // Create penguin element
  const penguin = document.createElement('div');
  penguin.className = `penguin ${selectedType.type}`;
  penguin.dataset.points = selectedType.points;
  penguin.dataset.type = selectedType.type;
  
  // Add to hole
  randomHole.appendChild(penguin);
  totalPenguinsSpawned++;
  
  // Auto-remove after time
  const showTime = selectedType.showTime * (1 / DIFFICULTY_SETTINGS[currentDifficulty].penguinSpeed);
  setTimeout(() => {
    if (penguin.parentElement === randomHole) {
      penguin.remove();
      
      // If it was a bomb that wasn't clicked, it disappears safely
      if (selectedType.type === 'bomb') {
        createParticles(randomHole, '#4CAF50', 5); // Green particles for avoided bomb
      }
    }
  }, showTime);
}

function whackPenguin(hole) {
  if (isPaused) return;
  
  totalClicks++;
  const penguin = hole.querySelector('.penguin');
  
  if (penguin) {
    // Get penguin type and points
    const points = parseInt(penguin.dataset.points);
    const type = penguin.dataset.type;
    
    // Apply power-up multipliers
    let finalPoints = points;
    if (activePowerUps.doubleScore.active) {
      finalPoints *= activePowerUps.doubleScore.multiplier;
    }
    
    // Update score
    score += finalPoints;
    score = Math.max(0, score); // Prevent negative score
    scoreDisplay.textContent = score;
    
    // Update statistics
    penguinsHit++;
    
    // Handle combo
    const currentTime = Date.now();
    if (currentTime - lastHitTime < 1000) { // Within 1 second
      combo++;
      updateComboDisplay();
    } else {
      combo = 1;
    }
    lastHitTime = currentTime;
    
    // Clear combo timeout
    clearTimeout(comboTimeout);
    comboTimeout = setTimeout(() => {
      combo = 0;
      comboDisplay.classList.remove('active');
    }, 1000);
    
    // Visual feedback
    penguin.style.transform = 'scale(1.3)';
    penguin.style.opacity = '0.7';
    
    // Play sound
    if (soundEnabled) {
      const whackSound = document.getElementById('whackSound');
      whackSound.currentTime = 0;
      whackSound.play();
    }
    
    // Create particles based on penguin type
    let particleColor = '#4CAF50'; // Default green
    if (type === 'golden') particleColor = '#FFD700';
    if (type === 'bomb') particleColor = '#F44336';
    
    createParticles(hole, particleColor, 15);
    
    // Remove penguin after animation
    setTimeout(() => {
      penguin.remove();
    }, 200);
    
    // Check for power-up spawn (5% chance)
    if (Math.random() < 0.05 && !activePowerUps.doubleScore.active) {
      spawnPowerUp(hole);
    }
    
  } else {
    // Missed click
    if (soundEnabled) {
      const missSound = document.getElementById('missSound');
      missSound.currentTime = 0;
      missSound.play();
    }
    
    // Reset combo on miss
    combo = 0;
    comboDisplay.classList.remove('active');
    
    // Visual feedback for miss
    hole.style.boxShadow = 'inset 0 0 20px rgba(244, 67, 54, 0.5)';
    setTimeout(() => {
      hole.style.boxShadow = '';
    }, 300);
  }
}

function spawnPowerUp(hole) {
  const powerUp = document.createElement('div');
  powerUp.className = 'powerup-item';
  powerUp.innerHTML = '<i class="fas fa-bolt"></i>';
  powerUp.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 2rem;
    color: #FF9800;
    z-index: 3;
    animation: float 2s infinite;
  `;
  
  hole.appendChild(powerUp);
  
  // Remove after 5 seconds
  setTimeout(() => {
    if (powerUp.parentElement) {
      powerUp.remove();
    }
  }, 5000);
  
  // Click to activate power-up
  powerUp.addEventListener('click', (e) => {
    e.stopPropagation();
    activatePowerUp('doubleScore', 10); // 10 seconds
    powerUp.remove();
    createParticles(hole, '#FF9800', 20);
  });
}

function activatePowerUp(type, duration) {
  if (type === 'doubleScore') {
    activePowerUps.doubleScore.active = true;
    activePowerUps.doubleScore.endTime = Date.now() + duration * 1000;
    
    // Update UI
    const indicator = document.getElementById('doubleScoreIndicator');
    indicator.classList.add('active');
  }
}

function updatePowerUps() {
  const now = Date.now();
  
  // Double score power-up
  if (activePowerUps.doubleScore.active) {
    const timeLeft = Math.max(0, Math.ceil((activePowerUins.doubleScore.endTime - now) / 1000));
    document.getElementById('doubleScoreTimer').textContent = `${timeLeft}s`;
    
    if (timeLeft === 0) {
      activePowerUps.doubleScore.active = false;
      document.getElementById('doubleScoreIndicator').classList.remove('active');
    }
  }
}

function updateComboDisplay() {
  comboCount.textContent = combo;
  comboDisplay.classList.add('active');
  
  // Bonus points for high combo
  if (combo >= 5) {
    score += 5;
    scoreDisplay.textContent = score;
    createParticles(comboDisplay, '#FF4081', 10);
  }
}

function createParticles(sourceElement, color, count) {
  const container = document.getElementById('particleContainer');
  const rect = sourceElement.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.background = color;
    particle.style.left = `${centerX}px`;
    particle.style.top = `${centerY}px`;
    
    // Random direction and distance
    const angle = Math.random() * Math.PI * 2;
    const distance = 50 + Math.random() * 100;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;
    
    particle.style.setProperty('--tx', `${tx}px`);
    particle.style.setProperty('--ty', `${ty}px`);
    
    container.appendChild(particle);
    
    // Remove after animation
    setTimeout(() => {
      particle.remove();
    }, 1000);
  }
}

// ========== GAME CONTROL FUNCTIONS ==========
function togglePause() {
  isPaused = !isPaused;
  
  if (isPaused) {
    clearInterval(gameTimer);
    clearInterval(penguinTimer);
    pauseScreen.classList.remove("hidden");
    
    // Pause background music
    const bgMusic = document.getElementById('bgMusic');
    if (!bgMusic.paused) {
      bgMusic.pause();
    }
  } else {
    startTimers();
    pauseScreen.classList.add("hidden");
    
    // Resume background music
    if (soundEnabled) {
      const bgMusic = document.getElementById('bgMusic');
      bgMusic.play().catch(e => console.log("Audio resume blocked"));
    }
  }
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  soundToggle.checked = soundEnabled;
  
  const bgMusic = document.getElementById('bgMusic');
  const soundBtn = document.getElementById('soundBtn');
  
  if (soundEnabled) {
    soundBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
    if (!isPaused) {
      bgMusic.play().catch(e => console.log("Audio play blocked"));
    }
  } else {
    soundBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
    bgMusic.pause();
  }
}

function goToMenu() {
  // Clear all timers
  clearInterval(gameTimer);
  clearInterval(penguinTimer);
  
  // Stop music
  const bgMusic = document.getElementById('bgMusic');
  bgMusic.pause();
  bgMusic.currentTime = 0;
  
  // Remove all penguins
  holes.forEach(hole => {
    hole.innerHTML = '';
  });
  
  // Reset game state
  isPaused = false;
  
  // Show start screen
  gameScreen.classList.add("hidden");
  pauseScreen.classList.add("hidden");
  resultPopup.classList.remove("show");
  startScreen.classList.remove("hidden");
}

function endGame() {
  // Clear timers
  clearInterval(gameTimer);
  clearInterval(penguinTimer);
  
  // Stop music
  const bgMusic = document.getElementById('bgMusic');
  bgMusic.pause();
  bgMusic.currentTime = 0;
  
  // Remove all penguins
  holes.forEach(hole => {
    hole.innerHTML = '';
  });
  
  // Update final score
  finalScore.textContent = score;
  
  // Update statistics
  const accuracy = totalPenguinsSpawned > 0 ? Math.round((penguinsHit / totalClicks) * 100) : 0;
  document.getElementById('accuracyStat').textContent = `${accuracy}%`;
  document.getElementById('clicksStat').textContent = totalClicks;
  document.getElementById('hitsStat').textContent = penguinsHit;
  document.getElementById('missesStat').textContent = totalClicks - penguinsHit;
  
  // Check for new high score
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('whackPenguinHighScore', highScore);
    document.getElementById('newRecord').classList.remove('hidden');
    highScoreDisplay.textContent = highScore;
    highScoreGame.textContent = highScore;
    
    // Celebration particles
    createParticles(finalScore, '#FFD700', 30);
  }
  
  // Show result popup
  setTimeout(() => {
    resultPopup.classList.add("show");
  }, 500);
}

function restartGame() {
  resultPopup.classList.remove("show");
  startGame();
}

// ========== UTILITY FUNCTIONS ==========
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getRandomColor() {
  const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// ========== EXPORT FOR DEBUGGING ==========
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    startGame,
    whackPenguin,
    togglePause,
    restartGame,
    goToMenu,
    DIFFICULTY_SETTINGS,
    PENGUIN_TYPES
  };
}