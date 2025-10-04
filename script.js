class SnakeGame {
    constructor() {
        // 基础配置（将被 config.json 覆盖）
        this.gridSize = 20;
        this.gameSpeed = 150; // 默认值，配置加载后会覆盖
        this.initialSnakeLength = 3;
        this.gameInterval = null;
        this.isPaused = false;
        
        // 关卡晋级分数设置
        this.levelUpScores = {
            2: 300,  // 关卡1 → 关卡2：300分
            3: 800   // 关卡2 → 关卡3：800分
        };
        this.highScore = 0; // 将在关卡设置后加载
        this.minSpeed = 70;
        this.speedStep = 15;
        this.initialGameSpeed = this.gameSpeed;
        // 新增元素与规则（由 config.json 覆盖）
        this.obstacles = [];
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
        this.highScoreDisplay = document.getElementById('highScore');
        this.startBtn = document.getElementById('startBtn');
        this.restartBtn = document.getElementById('restartBtn');
        this.gameOverScreen = document.getElementById('gameOver');
        this.finalScoreDisplay = document.getElementById('finalScore');
        this.celebrationScreen = document.getElementById('celebration');
        this.restartGameBtn = document.getElementById('restartGameBtn');
        this.restartAfterCelebration = document.getElementById('restartAfterCelebration');
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
        this.restartAfterCelebration.addEventListener('click', () => {
            this.celebrationScreen.classList.add('hidden');
            this.resumeGame();
        });
        // 移除边界模式选择器事件监听
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
        this.setGameInterval();
        this.updateColors();
        this.updatePauseButton();
    }
    
    resetGame() {
        clearInterval(this.gameInterval);
        this.isPaused = false;
        this.direction = 'right';
        this.nextDirection = 'right';
        this.score = 0;
        this.isGameOver = false;
        this.isPlaying = false;
        this.foodEaten = false; // 初始化食物吃掉状态
        this.levelCompleted = false; // 重置关卡完成状态
        
        // 应用当前关卡配置
        this.applyLevelConfig();
        
        // 加载当前关卡的最高分
        this.highScore = this.loadHighScore();
        
        this.updateScore();
        this.checkLevelUp();
        this.updateHighScore();
        this.setupLevelElements();
        this.initializeSnake();
        this.generateFood();
        this.renderGame();
        this.startBtn.disabled = false;
        this.restartBtn.disabled = true;
        this.gameOverScreen.classList.add('hidden');
        this.celebrationScreen.classList.add('hidden');
        if (this.pauseOverlay) this.pauseOverlay.classList.add('hidden');
        // 移除边界模式设置，默认使用撞墙死亡模式
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
    
    // 显示关卡晋级通知
    showLevelUpNotification(nextLevel) {
        const notification = document.createElement('div');
        notification.className = 'level-up-notification';
        notification.innerHTML = `
            <div class="level-up-content">
                <h2>🎉 关卡完成！</h2>
                <p>恭喜你完成了关卡 ${this.currentLevel}！</p>
                <p>即将进入关卡 ${nextLevel}...</p>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 添加动画效果
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // 3秒后移除通知
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 3000);
    }
    
    // 自动切换到下一关
    switchToNextLevel(nextLevel) {
        this.currentLevel = nextLevel;
        this.levelCompleted = false;
        
        // 解锁下一关
        if (!this.unlockedLevels.includes(nextLevel)) {
            this.unlockedLevels.push(nextLevel);
        }
        
        // 重置游戏状态
        this.resetGame();
        this.updateLevelDisplay();
        this.updateLevelButtons();
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
        const currentLevelElement = document.getElementById('currentLevel');
        if (currentLevelElement) {
            currentLevelElement.textContent = this.currentLevel;
        }
    }
    
    updateLevelButtons() {
        // 关卡按钮已移除，此方法保留为空以避免调用错误
        // 关卡切换现在通过自动晋级系统处理
    }
    
    setupLevelElements() {
        // 使用关卡配置的障碍数量，如果未定义则使用0
        const count = this.obstacleCount !== undefined ? this.obstacleCount : 0;
        this.obstacles = this.generateObstacles(count);
        
        // 传送门已经在applyLevelConfig中设置，不需要默认值
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
        } while (this.isPositionOccupied(foodPosition) || this.isObstacle(foodPosition));
        this.food = { ...foodPosition, type: this.pickFoodType() };
    }
    
    isPositionOccupied(position) {
        return this.snake.some(segment => segment.row === position.row && segment.col === position.col);
    }

    isObstacle(position) {
        return this.obstacles.some(o => o.row === position.row && o.col === position.col);
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
        // 移除边界模式逻辑，只使用撞墙死亡模式
        this.snake.unshift(head);
        if (!this.foodEaten) this.snake.pop();
        this.foodEaten = false;
    }


    
    checkCollision() {
        const head = this.snake[0];
        // 撞墙检测
        if (head.row < 0 || head.row >= this.gridSize || head.col < 0 || head.col >= this.gridSize) return true;
        // 障碍物检测
        if (this.isObstacle(head)) return true;
        // 自撞检测
        for (let i = 1; i < this.snake.length; i++) {
            if (head.row === this.snake[i].row && head.col === this.snake[i].col) return true;
        }
        return false;
    }
    
    checkFood() {
        const head = this.snake[0];
        if (this.food && head.row === this.food.row && head.col === this.food.col) {
            const foodType = this.food.type || 'normal';
            let scoreGain = 10;
            
            // 根据食物类型处理效果
            if (foodType === 'big') {
                scoreGain = 20;
            } else if (foodType === 'slow') {
                scoreGain = 10;
                // 减速效果：增加游戏间隔时间
                this.gameSpeed = Math.min(this.gameSpeed + this.slowDownStep, this.maxSpeed);
                this.updateSpeed();
            }
            
            this.score += scoreGain;
            this.updateScore();
            this.checkLevelUp(); // 检查是否达到关卡晋级条件
            this.foodEaten = true;
            this.generateFood();
            
            // 每+50分提速，设置最低速度上限（减速食物不影响此逻辑）
            if (this.score % 50 === 0 && foodType !== 'slow') {
                this.gameSpeed = Math.max(this.gameSpeed - this.speedStep, this.minSpeed);
                this.updateSpeed();
            }
            // 每+100分切换颜色主题
            if (this.score % 100 === 0) {
                this.updateColors();
            }
        }
    }
    
    renderGame() {
        const cells = this.gameGrid.querySelectorAll('.cell');
        cells.forEach(cell => cell.classList.remove('snake', 'snake-head', 'food', 'food-big', 'food-slow', 'obstacle'));
        
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


    }
    
    getCell(row, col) {
        return this.gameGrid.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    }
    
    updateScore() { 
        this.scoreDisplay.textContent = this.score; 
        this.updateHighScore();
    }

    // 根据分数设置颜色主题（每+10分切换一次）
    updateColors() {
        const idx = Math.floor(this.score / 10) % this.colors.body.length;
        this.gameGrid.style.setProperty('--snake-body', this.colors.body[idx]);
        this.gameGrid.style.setProperty('--snake-head', this.colors.head[idx]);
    }
    
    // 检查关卡晋级
    checkLevelUp() {
        const nextLevel = this.currentLevel + 1;
        if (this.levelUpScores[nextLevel] && this.score >= this.levelUpScores[nextLevel]) {
            // 达到晋级分数，自动切换到下一关
            if (this.levels[nextLevel] && !this.levelCompleted) {
                this.levelCompleted = true; // 标记当前关卡完成
                this.pauseGame(); // 关卡完成时暂停游戏
                setTimeout(() => {
                    this.showLevelUpNotification(nextLevel);
                    setTimeout(() => {
                        this.resumeGame(); // 恢复游戏以便切换关卡
                        this.switchToNextLevel(nextLevel);
                        // 在关卡晋级时触发庆祝
                        this.celebrate();
                    }, 2000); // 2秒后自动切换关卡
                }, 500);
            }
        }
    }
    
    loadHighScore(level = null) {
        const currentLevel = level || this.currentLevel;
        return parseInt(localStorage.getItem(`snakeHighScore_level_${currentLevel}`) || '0');
    }
    
    saveHighScore() {
        localStorage.setItem(`snakeHighScore_level_${this.currentLevel}`, this.highScore.toString());
    }
    
    updateHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
        }
        if (this.highScoreDisplay) {
            this.highScoreDisplay.textContent = this.highScore;
        }
    }
    
    endGame() {
        this.isGameOver = true;
        this.isPlaying = false;
        clearInterval(this.gameInterval);
        this.updateHighScore();
        this.finalScoreDisplay.textContent = this.score;
        this.gameOverScreen.classList.remove('hidden');
        if (this.pauseOverlay) this.pauseOverlay.classList.add('hidden');
    }
    
    celebrate() {
        // 暂停游戏
        this.isPaused = true;
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