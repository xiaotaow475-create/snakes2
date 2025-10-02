class SnakeGame {
    constructor() {
        // 基础配置（将被 config.json 覆盖）
        this.gridSize = 20;
        this.gameSpeed = 150; // 默认值，配置加载后会覆盖
        this.initialSnakeLength = 3;
        this.gameInterval = null;
        this.timerInterval = null;
        this.timeLeft = 60;
        this.isPaused = false;
        this.boundaryMode = 'die';
        this.minSpeed = 70;
        this.speedStep = 15;
        this.initialGameSpeed = this.gameSpeed;
        // 新增元素与规则（由 config.json 覆盖）
        this.obstacles = [];
        this.portals = [];
        this.foodWeights = { normal: 0.7, big: 0.2, slow: 0.1 };
        this.slowDownStep = 30;
        this.maxSpeed = 300;
        
        // 关卡系统
        this.currentLevel = 1;
        this.levels = {};
        this.defaultLevel = 1;
        this.unlockedLevels = [1]; // 初始只解锁第一关
        this.levelCompleted = false; // 当前关卡是否完成
        
        this.direction = 'right';
        this.nextDirection = 'right';
        this.score = 0;
        this.isGameOver = false;
        this.isPlaying = false;
        this.foodEaten = false; // 初始化食物吃掉状态
        
        this.snake = [];
        this.food = null;
        
        this.gameGrid = document.getElementById('gameGrid');
        this.scoreDisplay = document.getElementById('score');
        this.timeDisplay = document.getElementById('time');
        this.startBtn = document.getElementById('startBtn');
        this.restartBtn = document.getElementById('restartBtn');
        this.gameOverScreen = document.getElementById('gameOver');
        this.finalScoreDisplay = document.getElementById('finalScore');
        this.celebrationScreen = document.getElementById('celebration');
        this.restartGameBtn = document.getElementById('restartGameBtn');
        this.restartAfterCelebration = document.getElementById('restartAfterCelebration');
        this.boundaryModeSelect = document.getElementById('boundaryMode');
        this.pauseOverlay = document.getElementById('pauseOverlay');
        this.resumeBtn = document.getElementById('resumeBtn');
        this.restartFromPauseBtn = document.getElementById('restartFromPauseBtn');
        this.helpBtn = document.getElementById('helpBtn');
        this.helpText = document.getElementById('helpText');
        this.btnUp = document.getElementById('btnUp');
        this.btnLeft = document.getElementById('btnLeft');
        this.btnRight = document.getElementById('btnRight');
        this.btnDown = document.getElementById('btnDown');
        this.btnPause = document.getElementById('btnPause');

        // 颜色主题：每+10分切换一次
        this.colors = {
            body: ['#27ae60', '#3498db', '#9b59b6', '#e67e22', '#e74c3c', '#1abc9c', '#f1c40f'],
            head: ['#2ecc71', '#5dade2', '#af7ac5', '#f39c12', '#ff6b6b', '#48c9b0', '#f4d03f']
        };
        
        this.init();
    }
    
    async init() {
        await this.loadConfig();
        this.createGrid();
        this.setupEventListeners();
        this.updateLevelDisplay();
        this.updateLevelButtons();
        this.resetGame();
    }
    
    async loadConfig() {
        try {
            const res = await fetch('config.json');
            if (!res.ok) return; // 保留默认配置
            const cfg = await res.json();
            if (typeof cfg.gridSize === 'number') this.gridSize = cfg.gridSize;
            if (typeof cfg.initialSnakeLength === 'number') this.initialSnakeLength = cfg.initialSnakeLength;
            if (typeof cfg.gameSpeed === 'number') this.gameSpeed = cfg.gameSpeed;
            if (typeof cfg.speedStep === 'number') this.speedStep = cfg.speedStep;
            if (typeof cfg.minSpeed === 'number') this.minSpeed = cfg.minSpeed;
            if (typeof cfg.maxSpeed === 'number') this.maxSpeed = cfg.maxSpeed;
            if (typeof cfg.slowDownStep === 'number') this.slowDownStep = cfg.slowDownStep;
            if (cfg.foodWeights) this.foodWeights = cfg.foodWeights;
            if (cfg.obstacles && typeof cfg.obstacles.count === 'number') this.obstacleCount = cfg.obstacles.count;
            if (Array.isArray(cfg.portals)) this.portals = cfg.portals;
            
            // 加载关卡配置
            if (cfg.levels) this.levels = cfg.levels;
            if (typeof cfg.defaultLevel === 'number') {
                this.defaultLevel = cfg.defaultLevel;
                this.currentLevel = cfg.defaultLevel;
            }
            
            this.initialGameSpeed = this.gameSpeed;
        } catch (e) {
            console.warn('配置加载失败，使用默认配置:', e);
        }
    }
    
    createGrid() {
        const size = this.getCellSize();
        this.gameGrid.style.gridTemplateColumns = `repeat(${this.gridSize}, ${size}px)`;
        this.gameGrid.style.gridTemplateRows = `repeat(${this.gridSize}, ${size}px)`;
        this.gameGrid.innerHTML = '';
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.style.width = `${size}px`;
                cell.style.height = `${size}px`;
                this.gameGrid.appendChild(cell);
            }
        }
    }

    getCellSize() {
        if (window.matchMedia('(max-width: 340px)').matches) return 10;
        if (window.matchMedia('(max-width: 380px)').matches) return 12;
        if (window.matchMedia('(max-width: 500px)').matches) return 15;
        return 20;
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        this.startBtn.addEventListener('click', () => this.startGame());
        this.restartBtn.addEventListener('click', () => this.resetGame());
        this.restartGameBtn.addEventListener('click', () => this.resetGame());
        this.restartAfterCelebration.addEventListener('click', () => this.resetGame());
        if (this.boundaryModeSelect) {
            this.boundaryModeSelect.addEventListener('change', (e) => {
                this.boundaryMode = e.target.value;
            });
        }
        if (this.resumeBtn) this.resumeBtn.addEventListener('click', () => this.resumeGame());
        if (this.restartFromPauseBtn) this.restartFromPauseBtn.addEventListener('click', () => this.resetGame());
        if (this.helpBtn && this.helpText) {
            this.helpBtn.addEventListener('click', () => this.helpText.classList.toggle('hidden'));
        }
        // 移动端方向按钮
        if (this.btnUp) this.btnUp.addEventListener('click', () => this.setDirection('up'));
        if (this.btnLeft) this.btnLeft.addEventListener('click', () => this.setDirection('left'));
        if (this.btnRight) this.btnRight.addEventListener('click', () => this.setDirection('right'));
        if (this.btnDown) this.btnDown.addEventListener('click', () => this.setDirection('down'));
        // 移动端暂停按钮
        if (this.btnPause) this.btnPause.addEventListener('click', () => {
            if (!this.isPlaying || this.isGameOver) return;
            this.isPaused ? this.resumeGame() : this.pauseGame();
            this.updatePauseButton();
        });
    }
    
    handleKeyPress(e) {
        const key = e.key.toLowerCase();
        // P 键切换暂停/继续
        if (key === 'p') {
            if (!this.isGameOver && this.isPlaying) {
                this.isPaused ? this.resumeGame() : this.pauseGame();
            }
            return;
        }
        if (!this.isPlaying) return;
        if (this.isPaused) return;
        switch (key) {
            case 'arrowup': case 'w': if (this.direction !== 'down') this.nextDirection = 'up'; break;
            case 'arrowdown': case 's': if (this.direction !== 'up') this.nextDirection = 'down'; break;
            case 'arrowleft': case 'a': if (this.direction !== 'right') this.nextDirection = 'left'; break;
            case 'arrowright': case 'd': if (this.direction !== 'left') this.nextDirection = 'right'; break;
        }
    }
    
    startGame() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.isGameOver = false;
        this.startBtn.disabled = true;
        this.restartBtn.disabled = false;
        this.startTimer();
        this.setGameInterval();
        this.updateColors();
        this.updatePauseButton();
    }
    
    resetGame() {
        clearInterval(this.gameInterval);
        clearInterval(this.timerInterval);
        this.isPaused = false;
        this.direction = 'right';
        this.nextDirection = 'right';
        this.score = 0;
        this.timeLeft = 60;
        this.isGameOver = false;
        this.isPlaying = false;
        this.foodEaten = false; // 初始化食物吃掉状态
        
        // 应用当前关卡配置
        this.applyLevelConfig();
        
        this.updateScore();
        this.updateTimer();
        this.setupLevelElements();
        this.initializeSnake();
        this.generateFood();
        this.renderGame();
        this.startBtn.disabled = false;
        this.restartBtn.disabled = true;
        this.gameOverScreen.classList.add('hidden');
        this.celebrationScreen.classList.add('hidden');
        if (this.pauseOverlay) this.pauseOverlay.classList.add('hidden');
        if (this.boundaryModeSelect) this.boundaryMode = this.boundaryModeSelect.value;
        this.updateColors();
        this.updatePauseButton();
    }
    
    // 应用关卡配置
    applyLevelConfig() {
        const levelConfig = this.levels[this.currentLevel];
        if (levelConfig) {
            // 应用关卡特定的配置
            this.gameSpeed = levelConfig.gameSpeed || this.initialGameSpeed;
            this.obstacleCount = levelConfig.obstacles?.count || 0;
            this.portals = levelConfig.portals || [];
            this.foodWeights = levelConfig.foodWeights || { normal: 1.0, big: 0, slow: 0 };
        } else {
            // 使用默认配置
            this.gameSpeed = this.initialGameSpeed;
        }
    }
    
    // 切换关卡
    switchLevel(levelNumber) {
        if (this.levels[levelNumber] && this.isLevelUnlocked(levelNumber)) {
            this.currentLevel = levelNumber;
            this.levelCompleted = false; // 重置完成状态
            this.resetGame();
            this.updateLevelDisplay();
            this.updateLevelButtons();
        }
    }
    
    unlockNextLevel() {
        const nextLevel = this.currentLevel + 1;
        if (this.levels[nextLevel] && !this.unlockedLevels.includes(nextLevel)) {
            this.unlockedLevels.push(nextLevel);
            this.updateLevelButtons();
            
            // 显示解锁提示
            this.showUnlockNotification(nextLevel);
        }
    }
    
    isLevelUnlocked(levelNumber) {
        return this.unlockedLevels.includes(levelNumber);
    }
    
    showUnlockNotification(levelNumber) {
        const levelName = this.levels[levelNumber]?.name || `关卡${levelNumber}`;
        
        // 创建解锁提示
        const notification = document.createElement('div');
        notification.className = 'unlock-notification';
        notification.innerHTML = `
            <h3>🎉 恭喜解锁新关卡！</h3>
            <p>${levelName} 已解锁</p>
        `;
        
        document.body.appendChild(notification);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
    
    // 更新关卡显示
    updateLevelDisplay() {
        const levelConfig = this.levels[this.currentLevel];
        if (levelConfig) {
            const levelNameElement = document.getElementById('currentLevelName');
            const levelDescElement = document.getElementById('currentLevelDesc');
            if (levelNameElement) levelNameElement.textContent = levelConfig.name;
            if (levelDescElement) levelDescElement.textContent = levelConfig.description;
        }
    }
    
    updateLevelButtons() {
        const levelButtons = document.querySelectorAll('.level-btn');
        levelButtons.forEach((button, index) => {
            const levelNumber = index + 1;
            const isUnlocked = this.isLevelUnlocked(levelNumber);
            const isCurrent = levelNumber === this.currentLevel;
            
            button.disabled = !isUnlocked;
            button.classList.toggle('locked', !isUnlocked);
            button.classList.toggle('current', isCurrent);
            
            if (!isUnlocked) {
                button.innerHTML = `🔒 关卡${levelNumber}`;
            } else {
                button.innerHTML = `关卡${levelNumber}`;
            }
        });
    }
    
    setupLevelElements() {
        // 使用关卡配置的障碍数量，如果未定义则使用0
        const count = this.obstacleCount !== undefined ? this.obstacleCount : 0;
        this.obstacles = this.generateObstacles(count);
        
        // 传送门已经在applyLevelConfig中设置，不需要默认值
        // this.portals 已经在 applyLevelConfig 中正确设置
    }

    generateObstacles(count) {
        const set = new Set();
        const startRow = Math.floor(this.gridSize / 2);
        const startCol = Math.floor(this.gridSize / 2) - Math.floor(this.initialSnakeLength / 2);
        const reserved = new Set();
        for (let i = this.initialSnakeLength - 1; i >= 0; i--) {
            reserved.add(`${startRow}:${startCol + i}`);
        }
        if (Array.isArray(this.portals)) {
            this.portals.forEach(p => {
                reserved.add(`${p.a.row}:${p.a.col}`);
                reserved.add(`${p.b.row}:${p.b.col}`);
            });
        }
        while (set.size < count) {
            const r = Math.floor(Math.random() * this.gridSize);
            const c = Math.floor(Math.random() * this.gridSize);
            const key = `${r}:${c}`;
            if (reserved.has(key)) continue;
            set.add(key);
        }
        return Array.from(set).map(k => {
            const [r, c] = k.split(':').map(Number);
            return { row: r, col: c };
        });
    }
    
    initializeSnake() {
        this.snake = [];
        const startRow = Math.floor(this.gridSize / 2);
        const startCol = Math.floor(this.gridSize / 2) - Math.floor(this.initialSnakeLength / 2);
        // 确保蛇头在最右侧，避免第一步就与身体重叠
        for (let i = this.initialSnakeLength - 1; i >= 0; i--) {
            this.snake.push({ row: startRow, col: startCol + i });
        }
    }
    
    generateFood() {
        let foodPosition;
        do {
            foodPosition = {
                row: Math.floor(Math.random() * this.gridSize),
                col: Math.floor(Math.random() * this.gridSize)
            };
        } while (this.isPositionOccupied(foodPosition) || this.isObstacle(foodPosition) || this.isPortal(foodPosition));
        this.food = { ...foodPosition, type: this.pickFoodType() };
    }
    
    isPositionOccupied(position) {
        return this.snake.some(segment => segment.row === position.row && segment.col === position.col);
    }

    isObstacle(position) {
        return this.obstacles.some(o => o.row === position.row && o.col === position.col);
    }

    isPortal(position) {
        if (!Array.isArray(this.portals)) return false;
        return this.portals.some(p =>
            (p.a.row === position.row && p.a.col === position.col) ||
            (p.b.row === position.row && p.b.col === position.col)
        );
    }

    pickFoodType() {
        const w = this.foodWeights || { normal: 0.7, big: 0.2, slow: 0.1 };
        const r = Math.random();
        if (r < w.normal) return 'normal';
        if (r < w.normal + w.big) return 'big';
        return 'slow';
    }
    
    gameLoop() {
        this.direction = this.nextDirection;
        this.moveSnake();
        if (this._collidedOnMove || this.checkCollision()) {
            this.endGame();
            return;
        }
        this.checkFood();
        this.renderGame();
    }
    
    moveSnake() {
        this._collidedOnMove = false;
        const head = { ...this.snake[0] };
        switch (this.direction) {
            case 'up': head.row--; break;
            case 'down': head.row++; break;
            case 'left': head.col--; break;
            case 'right': head.col++; break;
        }
        // 边界模式：wrap 时穿墙到另一侧
        if (this.boundaryMode === 'wrap') {
            if (head.row < 0) head.row = this.gridSize - 1;
            else if (head.row >= this.gridSize) head.row = 0;
            if (head.col < 0) head.col = this.gridSize - 1;
            else if (head.col >= this.gridSize) head.col = 0;
        }
        const tp = this.teleportIfPortal(head);
        const newHead = tp || head;
        this.snake.unshift(newHead);
        // 立即自撞检测：wrap 模式下穿墙后如果头部落在身体上，立即判定碰撞
        if (this.boundaryMode === 'wrap' || this._teleported) {
            for (let i = 1; i < this.snake.length; i++) {
                if (newHead.row === this.snake[i].row && newHead.col === this.snake[i].col) {
                    this._collidedOnMove = true;
                    return; // 保留状态，gameLoop 会处理结束逻辑
                }
            }
            if (this.isObstacle(newHead)) {
                this._collidedOnMove = true;
                return;
            }
        }
        if (!this.foodEaten) this.snake.pop();
        this.foodEaten = false;
    }

    teleportIfPortal(pos) {
        this._teleported = false;
        if (!Array.isArray(this.portals)) return null;
        for (const p of this.portals) {
            if (pos.row === p.a.row && pos.col === p.a.col) {
                this._teleported = true;
                return { row: p.b.row, col: p.b.col };
            }
            if (pos.row === p.b.row && pos.col === p.b.col) {
                this._teleported = true;
                return { row: p.a.row, col: p.a.col };
            }
        }
        return null;
    }
    
    checkCollision() {
        const head = this.snake[0];
        if (this.boundaryMode === 'die') {
            if (head.row < 0 || head.row >= this.gridSize || head.col < 0 || head.col >= this.gridSize) return true;
        }
        if (this.isObstacle(head)) return true;
        for (let i = 1; i < this.snake.length; i++) {
            if (head.row === this.snake[i].row && head.col === this.snake[i].col) return true;
        }
        return false;
    }
    
    checkFood() {
        const head = this.snake[0];
        if (this.food && head.row === this.food.row && head.col === this.food.col) {
            const foodType = this.food.type || 'normal';
            let scoreGain = 1;
            
            // 根据食物类型处理效果
            if (foodType === 'big') {
                scoreGain = 2;
            } else if (foodType === 'slow') {
                scoreGain = 1;
                // 减速效果：增加游戏间隔时间
                this.gameSpeed = Math.min(this.gameSpeed + this.slowDownStep, this.maxSpeed);
                this.updateSpeed();
            }
            
            this.score += scoreGain;
            this.updateScore();
            this.foodEaten = true;
            this.generateFood();
            
            // 每+5分提速，设置最低速度上限（减速食物不影响此逻辑）
            if (this.score % 5 === 0 && foodType !== 'slow') {
                this.gameSpeed = Math.max(this.gameSpeed - this.speedStep, this.minSpeed);
                this.updateSpeed();
            }
            // 每+10分切换颜色主题
            if (this.score % 10 === 0) {
                this.updateColors();
            }
        }
    }
    
    renderGame() {
        const cells = this.gameGrid.querySelectorAll('.cell');
        cells.forEach(cell => cell.classList.remove('snake', 'snake-head', 'food', 'food-big', 'food-slow', 'obstacle', 'portal-a', 'portal-b'));
        
        this.snake.forEach((segment, index) => {
            const cell = this.getCell(segment.row, segment.col);
            if (cell) {
                cell.classList.add('snake');
                if (index === 0) cell.classList.add('snake-head');
            }
        });
        
        if (this.food) {
            const foodCell = this.getCell(this.food.row, this.food.col);
            if (foodCell) {
                if (this.food.type === 'big') foodCell.classList.add('food-big');
                else if (this.food.type === 'slow') foodCell.classList.add('food-slow');
                else foodCell.classList.add('food');
            }
        }

        // 渲染障碍
        this.obstacles.forEach(o => {
            const cell = this.getCell(o.row, o.col);
            if (cell) cell.classList.add('obstacle');
        });

        // 渲染传送门
        if (Array.isArray(this.portals)) {
            this.portals.forEach(p => {
                const ca = this.getCell(p.a.row, p.a.col);
                const cb = this.getCell(p.b.row, p.b.col);
                if (ca) ca.classList.add('portal-a');
                if (cb) cb.classList.add('portal-b');
            });
        }
    }
    
    getCell(row, col) {
        return this.gameGrid.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    }
    
    updateScore() { this.scoreDisplay.textContent = this.score; }

    // 根据分数设置颜色主题（每+10分切换一次）
    updateColors() {
        const idx = Math.floor(this.score / 10) % this.colors.body.length;
        this.gameGrid.style.setProperty('--snake-body', this.colors.body[idx]);
        this.gameGrid.style.setProperty('--snake-head', this.colors.head[idx]);
    }
    
    startTimer() {
        this.updateTimer();
        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            this.updateTimer();
            if (this.timeLeft <= 0) this.celebrate();
        }, 1000);
    }
    
    updateTimer() { this.timeDisplay.textContent = this.timeLeft; }
    
    endGame() {
        this.isGameOver = true;
        this.isPlaying = false;
        clearInterval(this.gameInterval);
        clearInterval(this.timerInterval);
        this.finalScoreDisplay.textContent = this.score;
        this.gameOverScreen.classList.remove('hidden');
        if (this.pauseOverlay) this.pauseOverlay.classList.add('hidden');
    }
    
    celebrate() {
        this.isPlaying = false;
        clearInterval(this.gameInterval);
        clearInterval(this.timerInterval);
        
        // 标记当前关卡完成并解锁下一关
        this.levelCompleted = true;
        this.unlockNextLevel();
        
        this.showFireworks();
        this.celebrationScreen.classList.remove('hidden');
        if (this.pauseOverlay) this.pauseOverlay.classList.add('hidden');
    }
    
    showFireworks() {
        const fireworksContainer = document.querySelector('.fireworks');
        fireworksContainer.innerHTML = '';
        for (let i = 0; i < 50; i++) {
            const firework = document.createElement('div');
            firework.className = 'firework';
            firework.style.left = Math.random() * 100 + '%';
            firework.style.top = Math.random() * 100 + '%';
            firework.style.background = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'][Math.floor(Math.random() * 6)];
            firework.style.setProperty('--tx', (Math.random() - 0.5) * 100 + 'px');
            firework.style.setProperty('--ty', (Math.random() - 0.5) * 100 + 'px');
            fireworksContainer.appendChild(firework);
        }
    }

    // 辅助：根据当前速度重启主循环
    setGameInterval() {
        clearInterval(this.gameInterval);
        this.gameInterval = setInterval(() => this.gameLoop(), this.gameSpeed);
    }

    // 更新速度并在运行中应用
    updateSpeed() {
        if (this.isPlaying && !this.isPaused) {
            this.setGameInterval();
        }
    }

    // 暂停与继续
    pauseGame() {
        if (!this.isPlaying || this.isPaused) return;
        this.isPaused = true;
        clearInterval(this.gameInterval);
        clearInterval(this.timerInterval);
        if (this.pauseOverlay) this.pauseOverlay.classList.remove('hidden');
        this.updatePauseButton();
    }

    resumeGame() {
        if (!this.isPlaying || !this.isPaused) return;
        this.isPaused = false;
        if (this.pauseOverlay) this.pauseOverlay.classList.add('hidden');
        this.setGameInterval();
        this.startTimer();
        this.updatePauseButton();
    }

    // 统一设置方向（应用于按键和移动端按钮）
    setDirection(dir) {
        if (!this.isPlaying || this.isPaused) return;
        const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' };
        if (this.direction !== opposite[dir]) this.nextDirection = dir;
    }

    // 更新移动端暂停按钮文案
    updatePauseButton() {
        if (!this.btnPause) return;
        if (!this.isPlaying) {
            this.btnPause.textContent = '暂停';
            return;
        }
        this.btnPause.textContent = this.isPaused ? '继续' : '暂停';
    }
}

let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new SnakeGame();
});