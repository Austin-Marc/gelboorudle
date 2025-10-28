class DailyChallenge {
    constructor() {
        this.pairs = [];
        this.currentRound = 0;
        this.answers = [];
        this.isComplete = false;
        this.todayDate = '';
        this.isProcessingAnswer = false;
        
        this.setupThemeToggle();
        this.init();
    }
    
    async init() {
        try {
            document.getElementById('loading').style.display = 'block';
            document.getElementById('game-container').style.display = 'none';
            document.getElementById('results-container').style.display = 'none';
            
            // Load and decrypt daily challenge data
            if (typeof DAILY_GAME_DATA === 'undefined') {
                throw new Error('Daily challenge data not loaded');
            }
            
            this.todayDate = DAILY_GAME_DATA.date;
            
            // Decrypt all tags in pairs (flatten first, then decrypt)
            const allTags = [];
            DAILY_GAME_DATA.pairs.forEach(pair => {
                allTags.push(pair.tag1);
                allTags.push(pair.tag2);
            });
            
            // Create temporary structure for Crypto.decryptGameData
            const tempGameData = {
                key: DAILY_GAME_DATA.key,
                tags: allTags
            };
            
            const decryptedTags = Crypto.decryptGameData(tempGameData);
            
            // Reconstruct pairs with decrypted counts
            this.pairs = DAILY_GAME_DATA.pairs.map((pair, index) => ({
                tag1: { ...pair.tag1, count: decryptedTags[index * 2].count },
                tag2: { ...pair.tag2, count: decryptedTags[index * 2 + 1].count }
            }));
            
            console.log(`Loaded daily challenge for ${this.todayDate} with ${this.pairs.length} pairs`);
            
            // Check if already completed today
            const saved = this.loadProgress();
            if (saved && saved.date === this.todayDate && saved.isComplete) {
                // Already completed today
                this.answers = saved.answers;
                this.isComplete = true;
                document.getElementById('loading').style.display = 'none';
                this.showResults();
                return;
            }
            
            // Resume progress if same day but not complete
            if (saved && saved.date === this.todayDate && !saved.isComplete) {
                this.currentRound = saved.currentRound || 0;
                this.answers = saved.answers || [];
            }
            
            // Start fresh or resume
            document.getElementById('loading').style.display = 'none';
            document.getElementById('game-container').style.display = 'block';
            this.startRound();
            
        } catch (error) {
            console.error('Error initializing daily challenge:', error);
            document.getElementById('loading').innerHTML = 
                '<p>Error loading daily challenge. Please try again later.</p>' +
                '<a href="index.html" class="btn-secondary">Play Endless Mode</a>';
        }
    }
    
    startRound() {
        if (this.currentRound >= this.pairs.length) {
            this.showResults();
            return;
        }
        
        const pair = this.pairs[this.currentRound];
        
        // Update progress display
        document.getElementById('progress').textContent = 
            `Question ${this.currentRound + 1}/${this.pairs.length}`;
        
        // Reset result message
        document.getElementById('result-message').style.display = 'none';
        
        // Display the two tags
        this.displayTag(1, pair.tag1);
        this.displayTag(2, pair.tag2);
        
        // Enable cards for selection
        this.enableCards();
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
            
            imgTag.src = tag.image_reference;
        } else {
            imgTag.style.display = 'none';
            imageEl.classList.remove('has-image');
        }
    }
    
    formatTagName(tagName) {
        return tagName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    enableCards() {
        const card1 = document.getElementById('card-1');
        const card2 = document.getElementById('card-2');
        
        card1.classList.remove('disabled', 'correct', 'incorrect');
        card2.classList.remove('disabled', 'correct', 'incorrect');
        
        document.getElementById('card-1-count').style.display = 'none';
        document.getElementById('card-2-count').style.display = 'none';
        
        card1.onclick = () => this.handleChoice(1);
        card2.onclick = () => this.handleChoice(2);
    }
    
    handleChoice(choice) {
        if (this.isProcessingAnswer) return;
        this.isProcessingAnswer = true;
        
        const pair = this.pairs[this.currentRound];
        const tag1 = pair.tag1;
        const tag2 = pair.tag2;
        
        // Determine if correct
        const correct = (choice === 1 && tag1.count >= tag2.count) || 
                       (choice === 2 && tag2.count >= tag1.count);
        
        // Record answer
        this.answers.push(correct);
        
        // Show feedback
        this.showAnswerFeedback(choice, correct, tag1, tag2);
        
        // Save progress
        this.saveProgress();
        
        // Move to next round after delay
        setTimeout(() => {
            this.currentRound++;
            this.isProcessingAnswer = false;
            this.startRound();
        }, 2000);
    }
    
    showAnswerFeedback(choice, correct, tag1, tag2) {
        const card1 = document.getElementById('card-1');
        const card2 = document.getElementById('card-2');
        
        card1.classList.add('disabled');
        card2.classList.add('disabled');
        
        this.showCount(1, tag1.count);
        this.showCount(2, tag2.count);
        
        if (correct) {
            if (choice === 1) {
                card1.classList.add('correct');
            } else {
                card2.classList.add('correct');
            }
            this.showResult(true);
        } else {
            if (choice === 1) {
                card1.classList.add('incorrect');
                card2.classList.add('correct');
            } else {
                card2.classList.add('incorrect');
                card1.classList.add('correct');
            }
            this.showResult(false);
        }
    }
    
    showCount(cardNumber, count) {
        const countEl = document.getElementById(`card-${cardNumber}-count`);
        const valueEl = countEl.querySelector('.count-value');
        
        valueEl.textContent = count.toLocaleString();
        countEl.style.display = 'block';
    }
    
    showResult(correct) {
        const messageEl = document.getElementById('result-message');
        const textEl = document.getElementById('result-text');
        
        messageEl.className = 'result-message';
        
        if (correct) {
            messageEl.classList.add('correct');
            textEl.textContent = '✓ Correct!';
        } else {
            messageEl.classList.add('incorrect');
            textEl.textContent = '✗ Wrong!';
        }
        
        messageEl.style.display = 'block';
    }
    
    showResults() {
        this.isComplete = true;
        
        // Calculate score
        const score = this.answers.filter(a => a === true).length;
        
        // Hide game container
        document.getElementById('game-container').style.display = 'none';
        
        // Show results container
        const resultsEl = document.getElementById('results-container');
        resultsEl.style.display = 'block';
        
        // Display score
        document.getElementById('final-score').textContent = `${score}/10`;
        
        // Display grid
        this.renderResultsGrid();
        
        // Setup share button
        document.getElementById('share-btn').onclick = () => this.shareResults();
        
        // Save completion
        this.saveProgress();
    }
    
    renderResultsGrid() {
        const gridEl = document.getElementById('results-grid');
        gridEl.innerHTML = '';
        
        this.answers.forEach((correct, index) => {
            const box = document.createElement('div');
            box.className = `result-box ${correct ? 'correct' : 'incorrect'}`;
            box.textContent = correct ? '✓' : '✗';
            box.title = `Question ${index + 1}: ${correct ? 'Correct' : 'Wrong'}`;
            gridEl.appendChild(box);
        });
    }
    
    shareResults() {
        const score = this.answers.filter(a => a === true).length;
        
        // Create emoji grid (2 rows of 5)
        const row1 = this.answers.slice(0, 10)
            .map(a => a ? '🟩' : '🟥').join('');

        
        const shareText = `Gelbooru-dle Daily ${this.todayDate}
Score: ${score}/10
${row1}

${window.location.href}`;
        
        // Copy to clipboard
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(shareText).then(() => {
                const btn = document.getElementById('share-btn');
                const originalText = btn.textContent;
                btn.textContent = '✓ Copied!';
                setTimeout(() => {
                    btn.textContent = originalText;
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy:', err);
                alert('Failed to copy to clipboard');
            });
        } else {
            // Fallback for older browsers
            alert('Share text:\n\n' + shareText);
        }
    }
    
    saveProgress() {
        const data = {
            date: this.todayDate,
            currentRound: this.currentRound,
            answers: this.answers,
            isComplete: this.isComplete
        };
        localStorage.setItem('gelbooru_daily_progress', JSON.stringify(data));
    }
    
    loadProgress() {
        const saved = localStorage.getItem('gelbooru_daily_progress');
        if (!saved) return null;
        
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error('Failed to parse saved progress:', e);
            return null;
        }
    }
    
    setupThemeToggle() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeButton(savedTheme);
        
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                this.updateThemeButton(newTheme);
            });
        }
    }
    
    updateThemeButton(theme) {
        const icon = document.getElementById('theme-icon');
        const text = document.getElementById('theme-text');
        
        if (icon && text) {
            if (theme === 'dark') {
                icon.textContent = '🌙';
                text.textContent = 'Dark';
            } else {
                icon.textContent = '☀️';
                text.textContent = 'Light';
            }
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new DailyChallenge();
});

