class SnakeGame {
    constructor() {
        this.gridSize = 20;
        this.gameSpeed = 150;
        this.initialSnakeLength = 3;
        this.gameInterval = null;
        this.timerInterval = null;
        this.timeLeft = 60;
        this.isPaused = false;
        this.boundaryMode = 'die';
        this.minSpeed = 70;
        this.speedStep = 15;
        
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
    
    init() {
        this.createGrid();
        this.setupEventListeners();
        this.resetGame();
    }
    
    createGrid() {
        this.gameGrid.innerHTML = '';
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                this.gameGrid.appendChild(cell);
            }
        }
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
        this.gameSpeed = 150;
        this.isGameOver = false;
        this.isPlaying = false;
        this.foodEaten = false; // 初始化食物吃掉状态
        this.updateScore();
        this.updateTimer();
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
        } while (this.isPositionOccupied(foodPosition));
        this.food = foodPosition;
    }
    
    isPositionOccupied(position) {
        return this.snake.some(segment => segment.row === position.row && segment.col === position.col);
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
        this.snake.unshift(head);
        // 立即自撞检测：wrap 模式下穿墙后如果头部落在身体上，立即判定碰撞
        if (this.boundaryMode === 'wrap') {
            for (let i = 1; i < this.snake.length; i++) {
                if (head.row === this.snake[i].row && head.col === this.snake[i].col) {
                    this._collidedOnMove = true;
                    return; // 保留状态，gameLoop 会处理结束逻辑
                }
            }
        }
        if (!this.foodEaten) this.snake.pop();
        this.foodEaten = false;
    }
    
    checkCollision() {
        const head = this.snake[0];
        if (this.boundaryMode === 'die') {
            if (head.row < 0 || head.row >= this.gridSize || head.col < 0 || head.col >= this.gridSize) return true;
        }
        for (let i = 1; i < this.snake.length; i++) {
            if (head.row === this.snake[i].row && head.col === this.snake[i].col) return true;
        }
        return false;
    }
    
    checkFood() {
        const head = this.snake[0];
        if (this.food && head.row === this.food.row && head.col === this.food.col) {
            this.score++;
            this.updateScore();
            this.foodEaten = true;
            this.generateFood();
            // 每+5分提速，设置最低速度上限
            if (this.score % 5 === 0) {
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
        cells.forEach(cell => cell.classList.remove('snake', 'snake-head', 'food'));
        
        this.snake.forEach((segment, index) => {
            const cell = this.getCell(segment.row, segment.col);
            if (cell) {
                cell.classList.add('snake');
                if (index === 0) cell.classList.add('snake-head');
            }
        });
        
        if (this.food) {
            const foodCell = this.getCell(this.food.row, this.food.col);
            if (foodCell) foodCell.classList.add('food');
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

document.addEventListener('DOMContentLoaded', () => new SnakeGame());