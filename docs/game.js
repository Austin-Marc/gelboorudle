class Game {
    constructor() {
        this.tags = [];
        this.currentRound = null;
        this.currentStreak = 0;
        this.bestStreak = 0;
        this.isProcessingAnswer = false;
        
        this.loadScores();
        
        this.init();
    }
    

    async init() {
        try {
            document.getElementById('loading').style.display = 'block';
            document.getElementById('game-container').style.display = 'none';
            
            this.tags = Crypto.decryptGameData(GAME_DATA);
            
            console.log(`Loaded ${this.tags.length} tags`);
            
            document.getElementById('loading').style.display = 'none';
            document.getElementById('game-container').style.display = 'block';
            
            this.updateScoreDisplay();
            
            this.newRound();
            
            this.setupEventListeners();
            
            this.setupThemeToggle();
            
        } catch (error) {
            console.error('Failed to initialize game:', error);
            document.getElementById('loading').innerHTML = 
                '<p style="color: var(--error-color);">Failed to load game data. Please refresh the page.</p>';
        }
    }
    

    setupEventListeners() {
        document.getElementById('card-1').addEventListener('click', () => {
            if (!this.isProcessingAnswer) {
                this.handleChoice(1);
            }
        });
        
        document.getElementById('card-2').addEventListener('click', () => {
            if (!this.isProcessingAnswer) {
                this.handleChoice(2);
            }
        });
    }
    

    setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        const themeIcon = document.getElementById('theme-icon');
        const themeText = document.getElementById('theme-text');
        
        const savedTheme = localStorage.getItem('gelboorudle_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeButton(savedTheme, themeIcon, themeText);
        
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('gelboorudle_theme', newTheme);
            this.updateThemeButton(newTheme, themeIcon, themeText);
        });
    }
    

    updateThemeButton(theme, icon, text) {
        if (theme === 'dark') {
            icon.textContent = '🌙';
            text.textContent = 'Dark';
        } else {
            icon.textContent = '☀️';
            text.textContent = 'Light';
        }
    }
    

    newRound() {
        document.getElementById('result-message').style.display = 'none';
        
        const card1 = document.getElementById('card-1');
        const card2 = document.getElementById('card-2');
        
        card1.classList.remove('disabled', 'correct', 'incorrect');
        card2.classList.remove('disabled', 'correct', 'incorrect');
        
        document.getElementById('card-1-count').style.display = 'none';
        document.getElementById('card-2-count').style.display = 'none';
        
        const tag1 = this.getRandomTag();
        let tag2 = this.getRandomTag();
        
        while (tag2.id === tag1.id) {
            tag2 = this.getRandomTag();
        }
        
        this.currentRound = {
            tag1,
            tag2
        };
        
        this.displayTag(1, tag1);
        this.displayTag(2, tag2);
        
        this.isProcessingAnswer = false;
    }
    

    getRandomTag() {
        const randomIndex = Math.floor(Math.random() * this.tags.length);
        return this.tags[randomIndex];
    }
    

    displayTag(cardNumber, tag) {
        const titleEl = document.getElementById(`card-${cardNumber}-title`);
        const materialEl = document.getElementById(`card-${cardNumber}-material`);
        const imageEl = document.getElementById(`card-${cardNumber}-image`);
        const copyrightEl = document.getElementById(`card-${cardNumber}-copyright`);
        
        titleEl.textContent = tag.proper_name || this.formatTagName(tag.name);
        
        if (tag.material) {
            materialEl.textContent = tag.material;
            materialEl.style.display = 'inline-block';
        } else {
            materialEl.style.display = 'none';
        }
        
        if (tag.category !== 'copyright' && tag.copyright) {
            copyrightEl.textContent = tag.copyright;
            copyrightEl.style.display = 'inline-block';
        } else {
            copyrightEl.style.display = 'none';
        }
        
        const imgTag = document.getElementById(`card-${cardNumber}-img`);
        if (tag.image_reference) {
            imageEl.classList.add('has-image');
            
            imgTag.style.display = 'none';
            
            imgTag.onerror = () => {
                console.error(`Failed to load: ${tag.image_reference}`);
                imgTag.style.display = 'none';
                imageEl.classList.remove('has-image');
            };
            
            imgTag.onload = () => {
                imgTag.style.display = 'block';
            };
            
            // Start loading the image
            imgTag.src = tag.image_reference;
        } else {
            imgTag.style.display = 'none';
            imageEl.classList.remove('has-image');
        }
    }
    

    formatTagName(tagName) {
        return tagName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    handleChoice(choice) {
        if (this.isProcessingAnswer) return;
        
        this.isProcessingAnswer = true;
        
        const { tag1, tag2 } = this.currentRound;
        const correct = (choice === 1 && tag1.count >= tag2.count) || 
                       (choice === 2 && tag2.count >= tag1.count);
        
        document.getElementById('card-1').classList.add('disabled');
        document.getElementById('card-2').classList.add('disabled');
        
        this.showCount(1, tag1.count);
        this.showCount(2, tag2.count);
        
        const card1 = document.getElementById('card-1');
        const card2 = document.getElementById('card-2');
        
        if (correct) {
            if (choice === 1) {
                card1.classList.add('correct');
            } else {
                card2.classList.add('correct');
            }
            
            this.currentStreak++;
            if (this.currentStreak > this.bestStreak) {
                this.bestStreak = this.currentStreak;
            }
            
            this.showResult(true, tag1.count === tag2.count);
            
        } else {
            if (choice === 1) {
                card1.classList.add('incorrect');
                card2.classList.add('correct');
            } else {
                card2.classList.add('incorrect');
                card1.classList.add('correct');
            }
            
            // Save streak before resetting
            const previousStreak = this.currentStreak;
            this.currentStreak = 0;
            
            this.showResult(false, previousStreak);
        }
        
        this.updateScoreDisplay();
        
        this.saveScores();
        
        setTimeout(() => {
            this.newRound();
        }, 2500);
    }
    

    showCount(cardNumber, count) {
        const countEl = document.getElementById(`card-${cardNumber}-count`);
        const valueEl = countEl.querySelector('.count-value');
        
        valueEl.textContent = count.toLocaleString();
        countEl.style.display = 'block';
    }
    

    showResult(correct, tieOrStreak = false) {
        const messageEl = document.getElementById('result-message');
        const textEl = document.getElementById('result-text');
        
        messageEl.className = 'result-message';
        
        if (correct) {
            messageEl.classList.add('correct');
            if (tieOrStreak === true) {
                textEl.textContent = '🎯 Correct! They have the same count!';
            } else {
                textEl.textContent = `🎉 Correct! Streak: ${this.currentStreak}`;
            }
        } else {
            messageEl.classList.add('incorrect');
            const previousStreak = typeof tieOrStreak === 'number' ? tieOrStreak : 0;
            textEl.textContent = `❌ Wrong! Your streak was ${previousStreak}`;
        }
        
        messageEl.style.display = 'block';
    }
 
    updateScoreDisplay() {
        document.getElementById('current-streak').textContent = this.currentStreak;
        document.getElementById('best-streak').textContent = this.bestStreak;
    }
    

    loadScores() {
        try {
            const saved = localStorage.getItem('gelboorudle_scores');
            if (saved) {
                const scores = JSON.parse(saved);
                this.bestStreak = scores.bestStreak || 0;
            }
        } catch (error) {
            console.error('Failed to load scores:', error);
        }
    }

    saveScores() {
        try {
            localStorage.setItem('gelboorudle_scores', JSON.stringify({
                bestStreak: this.bestStreak,
                lastPlayed: new Date().toISOString()
            }));
        } catch (error) {
            console.error('Failed to save scores:', error);
        }
    }
}

let game;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        game = new Game();
    });
} else {
    game = new Game();
}

