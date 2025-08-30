// Game State Management
class KanjiConcentrationGame {
    constructor() {
        this.cards = [];
        this.gameCards = [];
        this.flippedCards = [];
        this.matchedPairs = [];
        this.currentRound = 1;
        this.attempts = 0;
        this.score = 1000;
        this.isRestricted = false;
        this.activeCardIndices = [];
        this.restrictionPenalty = 50;
        this.settings = {
            matchedPairBehavior: 'stay',
            autoAdvance: false,
            timerDuration: 60
        };
        this.preGameTimer = null;
        this.isGameActive = false;
        
        this.init();
    }

    init() {
        this.loadSettings();
        this.loadSampleData();
        this.setupEventListeners();
        this.showPreGameScreen();
    }

    // Settings Management
    loadSettings() {
        const savedSettings = localStorage.getItem('kanjiGameSettings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
        this.updateSettingsUI();
    }

    saveSettings() {
        localStorage.setItem('kanjiGameSettings', JSON.stringify(this.settings));
    }

    updateSettingsUI() {
        document.getElementById('matchedPairBehavior').value = this.settings.matchedPairBehavior;
        document.getElementById('autoAdvance').checked = this.settings.autoAdvance;
        document.getElementById('timerDuration').value = this.settings.timerDuration;
    }

    // Data Management
    async loadSampleData() {
        // Embedded sample data to avoid CORS issues
        const sampleData = {
            "cards": [
                {
                    "id": "ace_hearts",
                    "rank": "A",
                    "suit": "hearts",
                    "kanji": "下り",
                    "hiragana": "くだり",
                    "romaji": "kudari",
                    "english": "downhill",
                    "rhyme": "We go downhill you see, it's Kudari"
                },
                {
                    "id": "2_hearts",
                    "rank": "2",
                    "suit": "hearts",
                    "kanji": "上り",
                    "hiragana": "のぼり",
                    "romaji": "nobori",
                    "english": "uphill",
                    "rhyme": "Up the hill we climb so free, it's Nobori"
                },
                {
                    "id": "3_hearts",
                    "rank": "3",
                    "suit": "hearts",
                    "kanji": "水",
                    "hiragana": "みず",
                    "romaji": "mizu",
                    "english": "water",
                    "rhyme": "Clear and blue like morning dew, it's Mizu"
                },
                {
                    "id": "4_hearts",
                    "rank": "4",
                    "suit": "hearts",
                    "kanji": "火",
                    "hiragana": "ひ",
                    "romaji": "hi",
                    "english": "fire",
                    "rhyme": "Burning bright for all to see, it's Hi"
                },
                {
                    "id": "5_hearts",
                    "rank": "5",
                    "suit": "hearts",
                    "kanji": "木",
                    "hiragana": "き",
                    "romaji": "ki",
                    "english": "tree",
                    "rhyme": "Growing tall and strong and free, it's Ki"
                },
                {
                    "id": "6_hearts",
                    "rank": "6",
                    "suit": "hearts",
                    "kanji": "金",
                    "hiragana": "きん",
                    "romaji": "kin",
                    "english": "gold",
                    "rhyme": "Shining bright like treasure's glee, it's Kin"
                }
            ]
        };
        
        try {
            // Try to fetch external file first
            const response = await fetch('sample-data.json');
            const data = await response.json();
            this.cards = data.cards;
        } catch (error) {
            // Fall back to embedded data
            this.cards = sampleData.cards;
        }
        
        this.displayPreGameCards();
    }

    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.cards && Array.isArray(data.cards)) {
                    this.cards = data.cards;
                    this.displayPreGameCards();
                    alert('Data imported successfully!');
                } else {
                    alert('Invalid file format. Please ensure the JSON has a "cards" array.');
                }
            } catch (error) {
                alert('Error parsing JSON file: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    // Pre-game Screen
    displayPreGameCards() {
        const container = document.getElementById('cardPairsDisplay');
        container.innerHTML = '';

        this.cards.forEach(card => {
            const pairDiv = document.createElement('div');
            pairDiv.className = 'card-pair';
            
            // Kanji card
            const kanjiCard = this.createPreGameCard(card, 'kanji');
            // Romaji card
            const romajiCard = this.createPreGameCard(card, 'romaji');
            
            pairDiv.appendChild(kanjiCard);
            pairDiv.appendChild(romajiCard);
            container.appendChild(pairDiv);
        });
    }

    createPreGameCard(cardData, type) {
        const card = document.createElement('div');
        card.className = 'playing-card';
        
        const cardFace = document.createElement('div');
        cardFace.className = 'card-face card-front';
        
        // Rank and suit indicators
        const rankSuitTop = document.createElement('div');
        rankSuitTop.className = `card-rank-suit suit-${cardData.suit}`;
        rankSuitTop.innerHTML = `${cardData.rank}<span class="suit-symbol">${this.getSuitSymbol(cardData.suit)}</span>`;
        
        const rankSuitBottom = document.createElement('div');
        rankSuitBottom.className = `card-rank-suit bottom suit-${cardData.suit}`;
        rankSuitBottom.innerHTML = `${cardData.rank}<span class="suit-symbol">${this.getSuitSymbol(cardData.suit)}</span>`;
        
        // Card content
        const content = document.createElement('div');
        content.className = 'card-content';
        
        if (type === 'kanji') {
            content.innerHTML = `
                <div class="kanji-content">
                    <div class="kanji">${cardData.kanji}</div>
                    <div class="hiragana">${cardData.hiragana}</div>
                </div>
            `;
        } else {
            content.innerHTML = `
                <div class="romaji-content">
                    <div class="romaji">${cardData.romaji}</div>
                    <div class="english">${cardData.english}</div>
                </div>
            `;
        }
        
        cardFace.appendChild(rankSuitTop);
        cardFace.appendChild(content);
        cardFace.appendChild(rankSuitBottom);
        card.appendChild(cardFace);
        
        return card;
    }

    startPreGameTimer() {
        if (!this.settings.autoAdvance) return;
        
        let timeLeft = this.settings.timerDuration;
        const timerDisplay = document.getElementById('preGameTimer');
        
        const updateTimer = () => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            timerDisplay.textContent = `Auto-start in: ${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            if (timeLeft <= 0) {
                this.startGame();
                return;
            }
            
            timeLeft--;
        };
        
        updateTimer();
        this.preGameTimer = setInterval(updateTimer, 1000);
    }

    stopPreGameTimer() {
        if (this.preGameTimer) {
            clearInterval(this.preGameTimer);
            this.preGameTimer = null;
        }
        document.getElementById('preGameTimer').textContent = '';
    }

    // Game Logic
    startGame() {
        this.stopPreGameTimer();
        this.isGameActive = true;
        this.currentRound = 1;
        this.attempts = 0;
        this.score = 1000;
        this.isRestricted = false;
        this.activeCardIndices = [];
        this.matchedPairs = [];
        this.flippedCards = [];
        
        this.createGameCards();
        this.showGameScreen();
        this.updateGameUI();
    }

    createGameCards() {
        this.gameCards = [];
        
        // Create pairs: one kanji card and one romaji card for each data entry
        this.cards.forEach(cardData => {
            // Kanji card
            this.gameCards.push({
                ...cardData,
                id: cardData.id + '_kanji',
                type: 'kanji',
                pairId: cardData.id,
                isFlipped: false,
                isMatched: false
            });
            
            // Romaji card
            this.gameCards.push({
                ...cardData,
                id: cardData.id + '_romaji',
                type: 'romaji',
                pairId: cardData.id,
                isFlipped: false,
                isMatched: false
            });
        });
        
        // Shuffle the cards
        this.shuffleArray(this.gameCards);
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    displayGameBoard() {
        const gameBoard = document.getElementById('gameBoard');
        gameBoard.innerHTML = '';
        
        this.gameCards.forEach((card, index) => {
            const cardElement = this.createGameCard(card, index);
            gameBoard.appendChild(cardElement);
        });
    }

    createGameCard(cardData, index) {
        const card = document.createElement('div');
        card.className = 'playing-card';
        card.dataset.index = index;
        
        if (cardData.isFlipped) card.classList.add('flipped');
        if (cardData.isMatched) {
            card.classList.add('matched');
            if (this.settings.matchedPairBehavior === 'disappear') {
                card.classList.add('disappear');
            }
        }
        
        // Card back
        const cardBack = document.createElement('div');
        cardBack.className = 'card-face card-back';
        cardBack.innerHTML = '<div>?</div>';
        
        // Card front
        const cardFront = document.createElement('div');
        cardFront.className = 'card-face card-front';
        
        // Add rank and suit based on current round
        if (this.shouldShowRank()) {
            const rankSuitTop = document.createElement('div');
            rankSuitTop.className = `card-rank-suit suit-${cardData.suit}`;
            rankSuitTop.innerHTML = `${cardData.rank}<span class="suit-symbol">${this.getSuitSymbol(cardData.suit)}</span>`;
            cardFront.appendChild(rankSuitTop);
            
            const rankSuitBottom = document.createElement('div');
            rankSuitBottom.className = `card-rank-suit bottom suit-${cardData.suit}`;
            rankSuitBottom.innerHTML = `${cardData.rank}<span class="suit-symbol">${this.getSuitSymbol(cardData.suit)}</span>`;
            cardFront.appendChild(rankSuitBottom);
        }
        
        if (this.shouldShowSuit() && !this.shouldShowRank()) {
            const suitOnly = document.createElement('div');
            suitOnly.className = `card-rank-suit suit-${cardData.suit}`;
            suitOnly.innerHTML = `<span class="suit-symbol">${this.getSuitSymbol(cardData.suit)}</span>`;
            cardFront.appendChild(suitOnly);
        }
        
        // Card content
        const content = document.createElement('div');
        content.className = 'card-content';
        
        if (cardData.type === 'kanji') {
            content.innerHTML = `
                <div class="kanji-content">
                    <div class="kanji">${cardData.kanji}</div>
                    <div class="hiragana">${cardData.hiragana}</div>
                </div>
            `;
        } else {
            content.innerHTML = `
                <div class="romaji-content">
                    <div class="romaji">${cardData.romaji}</div>
                    <div class="english">${cardData.english}</div>
                </div>
            `;
        }
        
        cardFront.appendChild(content);
        
        card.appendChild(cardBack);
        card.appendChild(cardFront);
        
        // Add click event
        card.addEventListener('click', () => this.handleCardClick(index));
        
        return card;
    }

    handleCardClick(index) {
        if (!this.isGameActive) return;
        
        const card = this.gameCards[index];
        if (card.isFlipped || card.isMatched || this.flippedCards.length >= 2) return;
        
        // Block clicks on inactive cards when in restricted mode
        if (this.isRestricted && !this.activeCardIndices.includes(index)) return;
        
        // Flip the card
        card.isFlipped = true;
        this.flippedCards.push(index);
        
        const cardElement = document.querySelector(`[data-index="${index}"]`);
        cardElement.classList.add('flipped');
        
        // Check for match when two cards are flipped
        if (this.flippedCards.length === 2) {
            this.attempts++;
            this.updateGameUI();
            
            setTimeout(() => {
                this.checkForMatch();
            }, 1000);
        }
    }

    checkForMatch() {
        const [index1, index2] = this.flippedCards;
        const card1 = this.gameCards[index1];
        const card2 = this.gameCards[index2];
        
        if (card1.pairId === card2.pairId && card1.type !== card2.type) {
            // Match found!
            card1.isMatched = true;
            card2.isMatched = true;
            this.matchedPairs.push(card1.pairId);
            
            const cardElement1 = document.querySelector(`[data-index="${index1}"]`);
            const cardElement2 = document.querySelector(`[data-index="${index2}"]`);
            
            cardElement1.classList.add('matched');
            cardElement2.classList.add('matched');
            
            if (this.settings.matchedPairBehavior === 'disappear') {
                setTimeout(() => {
                    cardElement1.classList.add('disappear');
                    cardElement2.classList.add('disappear');
                }, 500);
            }
            
            // Update score for correct match
            this.updateScore(true);
            
            // Show celebration
            this.showMatchCelebration(card1);
            
            // Check if restricted mode is complete
            if (this.isRestricted && this.isRestrictedModeComplete()) {
                this.exitRestrictedMode();
            }
            
            // Check if game is complete
            if (this.matchedPairs.length === this.cards.length) {
                setTimeout(() => {
                    alert(`Congratulations! You completed Round ${this.currentRound} in ${this.attempts} attempts! Final Score: ${this.score}`);
                }, 2000);
            }
        } else {
            // No match - flip cards back
            setTimeout(() => {
                card1.isFlipped = false;
                card2.isFlipped = false;
                
                const cardElement1 = document.querySelector(`[data-index="${index1}"]`);
                const cardElement2 = document.querySelector(`[data-index="${index2}"]`);
                
                cardElement1.classList.remove('flipped');
                cardElement2.classList.remove('flipped');
            }, 500);
            
            // Update score for incorrect attempt
            this.updateScore(false);
        }
        
        // If in restricted mode and user has attempted one pair, enable exit option
        if (this.isRestricted && this.attempts > 0) {
            this.enableFocusExit();
        }
        
        this.flippedCards = [];
        this.updateGameUI();
    }

    showMatchCelebration(cardData) {
        const modal = document.getElementById('celebrationModal');
        const rhymeDisplay = document.getElementById('celebrationRhyme');
        const cardsDisplay = document.getElementById('celebrationCards');
        
        rhymeDisplay.textContent = cardData.rhyme;
        
        // Show the matched cards in celebration
        cardsDisplay.innerHTML = '';
        const kanjiCard = this.createPreGameCard(cardData, 'kanji');
        const romajiCard = this.createPreGameCard(cardData, 'romaji');
        kanjiCard.style.transform = 'scale(0.8)';
        romajiCard.style.transform = 'scale(0.8)';
        cardsDisplay.appendChild(kanjiCard);
        cardsDisplay.appendChild(romajiCard);
        
        modal.style.display = 'block';
        
        // Auto-close after 3 seconds
        setTimeout(() => {
            modal.style.display = 'none';
        }, 3000);
    }

    // Round Management
    shouldShowRank() {
        return this.currentRound === 1 || this.currentRound === 2;
    }

    shouldShowSuit() {
        return this.currentRound === 1 || this.currentRound === 3;
    }

    nextRound() {
        if (this.currentRound < 4) {
            this.currentRound++;
            this.resetGame();
        }
    }

    previousRound() {
        if (this.currentRound > 1) {
            this.currentRound--;
            this.resetGame();
        }
    }

    resetGame() {
        this.attempts = 0;
        this.matchedPairs = [];
        this.flippedCards = [];
        
        // Exit restricted mode when resetting
        this.isRestricted = false;
        this.activeCardIndices = [];
        
        this.gameCards.forEach(card => {
            card.isFlipped = false;
            card.isMatched = false;
        });
        
        this.shuffleArray(this.gameCards);
        this.displayGameBoard();
        this.updateGameUI();
    }

    // UI Management
    showPreGameScreen() {
        document.getElementById('preGameScreen').classList.add('active');
        document.getElementById('gameScreen').classList.remove('active');
        this.startPreGameTimer();
    }

    showGameScreen() {
        document.getElementById('preGameScreen').classList.remove('active');
        document.getElementById('gameScreen').classList.add('active');
        this.displayGameBoard();
    }

    updateGameUI() {
        const roundTitles = {
            1: 'Round 1',
            2: 'Round 2', 
            3: 'Round 3',
            4: 'Round 4'
        };
        
        const roundDescriptions = {
            1: 'Rank + Suit + Content',
            2: 'Rank + Content',
            3: 'Suit + Content',
            4: 'Content Only'
        };
        
        document.getElementById('roundTitle').textContent = roundTitles[this.currentRound];
        document.getElementById('roundDescription').textContent = roundDescriptions[this.currentRound];
        document.getElementById('currentScore').textContent = `Score: ${this.score}`;
        document.getElementById('matchesFound').textContent = `Matches: ${this.matchedPairs.length}/${this.cards.length}`;
        document.getElementById('attempts').textContent = `Attempts: ${this.attempts}`;
        
        // Update button states
        document.getElementById('prevRoundBtn').disabled = this.currentRound === 1;
        document.getElementById('nextRoundBtn').disabled = this.currentRound === 4;
        
        // Update restriction button
        this.updateRestrictButton();
        
        // Update board restriction if active
        if (this.isRestricted) {
            this.updateBoardRestriction();
        }
    }

    getSuitSymbol(suit) {
        const symbols = {
            hearts: '♥',
            diamonds: '♦',
            clubs: '♣',
            spades: '♠'
        };
        return symbols[suit] || '';
    }

    // Scoring System
    updateScore(isCorrect) {
        let scoreChange = 0;
        
        if (isCorrect) {
            // Bonus points for correct matches
            if (this.isRestricted) {
                // Base bonus in restricted mode
                scoreChange = 50;
            } else {
                // Higher bonus for normal matches (not using 4-card focus)
                scoreChange = 100;
            }
        } else {
            // Penalty for incorrect attempts
            if (this.isRestricted) {
                // Lower penalty in restricted mode
                scoreChange = -10;
            } else {
                // Base penalty for normal attempts
                scoreChange = -20;
            }
        }
        
        this.score += scoreChange;
        this.showScoreChange(scoreChange);
    }
    
    showScoreChange(change) {
        const scoreChangeElement = document.getElementById('scoreChange');
        
        if (change > 0) {
            scoreChangeElement.textContent = `+${change}`;
            scoreChangeElement.className = 'score-change positive show';
        } else {
            scoreChangeElement.textContent = `${change}`;
            scoreChangeElement.className = 'score-change negative show';
        }
        
        // Hide after animation
        setTimeout(() => {
            scoreChangeElement.className = 'score-change';
        }, 2000);
        
        // Update the main score display immediately to reflect the change
        document.getElementById('currentScore').textContent = `Score: ${this.score}`;
    }

    // 4-Card Restriction System
    restrictBoard() {
        if (this.isRestricted) return;
        
        // Deduct penalty points
        this.score -= this.restrictionPenalty;
        this.showScoreChange(-this.restrictionPenalty);
        
        // Get available cards (not matched)
        const availableIndices = this.gameCards
            .map((card, index) => ({ card, index }))
            .filter(item => !item.card.isMatched)
            .map(item => item.index);
        
        if (availableIndices.length < 4) {
            alert('Not enough cards remaining for 4-card focus mode!');
            return;
        }
        
        // Select 4 cards ensuring at least one pair
        this.activeCardIndices = this.selectFourCardsWithPair(availableIndices);
        this.isRestricted = true;
        
        // Update UI
        this.updateBoardRestriction();
        this.updateRestrictButton();
    }
    
    selectFourCardsWithPair(availableIndices) {
        // Group available cards by pair ID
        const pairGroups = {};
        availableIndices.forEach(index => {
            const card = this.gameCards[index];
            if (!pairGroups[card.pairId]) {
                pairGroups[card.pairId] = [];
            }
            pairGroups[card.pairId].push(index);
        });
        
        // Find pairs that have both cards available
        const completePairs = Object.keys(pairGroups).filter(pairId => 
            pairGroups[pairId].length === 2
        );
        
        if (completePairs.length === 0) {
            // Fallback: just select 4 random cards
            const shuffled = [...availableIndices];
            this.shuffleArray(shuffled);
            return shuffled.slice(0, 4);
        }
        
        // Randomly select 1-2 complete pairs
        const shuffledPairs = [...completePairs];
        this.shuffleArray(shuffledPairs);
        const selectedPairs = shuffledPairs.slice(0, 2);
        let selectedIndices = [];
        
        selectedPairs.forEach(pairId => {
            selectedIndices.push(...pairGroups[pairId]);
        });
        
        // If we need more cards, add random ones
        while (selectedIndices.length < 4 && availableIndices.length > selectedIndices.length) {
            const remaining = availableIndices.filter(index => !selectedIndices.includes(index));
            if (remaining.length > 0) {
                selectedIndices.push(remaining[Math.floor(Math.random() * remaining.length)]);
            } else {
                break;
            }
        }
        
        return selectedIndices.slice(0, 4);
    }
    
    updateBoardRestriction() {
        this.gameCards.forEach((card, index) => {
            const cardElement = document.querySelector(`[data-index="${index}"]`);
            if (!cardElement) return;
            
            if (this.isRestricted) {
                if (this.activeCardIndices.includes(index)) {
                    cardElement.classList.add('active-focus');
                    cardElement.classList.remove('inactive');
                } else {
                    cardElement.classList.add('inactive');
                    cardElement.classList.remove('active-focus');
                }
            } else {
                cardElement.classList.remove('active-focus', 'inactive');
            }
        });
    }
    
    isRestrictedModeComplete() {
        // Check if all active cards are matched
        return this.activeCardIndices.every(index => 
            this.gameCards[index].isMatched
        );
    }
    
    exitRestrictedMode() {
        this.isRestricted = false;
        this.activeCardIndices = [];
        
        // Clear any flipped cards that aren't matched
        this.flippedCards.forEach(index => {
            const card = this.gameCards[index];
            if (!card.isMatched) {
                card.isFlipped = false;
                const cardElement = document.querySelector(`[data-index="${index}"]`);
                if (cardElement) {
                    cardElement.classList.remove('flipped');
                }
            }
        });
        this.flippedCards = [];
        
        this.updateBoardRestriction();
        this.updateRestrictButton();
    }
    
    updateRestrictButton() {
        const restrictBtn = document.getElementById('restrictBoardBtn');
        
        // Remove any existing event listeners
        const newBtn = restrictBtn.cloneNode(true);
        restrictBtn.parentNode.replaceChild(newBtn, restrictBtn);
        
        if (this.isRestricted) {
            if (this.attempts > 0) {
                newBtn.textContent = '❌ Exit Focus Mode';
                newBtn.disabled = false;
                newBtn.addEventListener('click', () => this.exitRestrictedMode());
            } else {
                newBtn.textContent = '🎯 Focus Mode Active';
                newBtn.disabled = true;
            }
        } else {
            newBtn.textContent = '🎯 4-Card Focus (-50 pts)';
            newBtn.disabled = false;
            newBtn.addEventListener('click', () => this.restrictBoard());
        }
    }
    
    enableFocusExit() {
        this.updateRestrictButton();
    }

    // Review Modal Functionality
    showReviewModal() {
        if (this.matchedPairs.length === 0) {
            alert('No matched pairs to review yet!');
            return;
        }

        this.currentReviewIndex = 0;
        this.reviewPairs = this.getMatchedPairsData();
        
        const modal = document.getElementById('reviewModal');
        modal.style.display = 'block';
        
        this.updateReviewDisplay();
        this.updateReviewNavigation();
    }

    getMatchedPairsData() {
        // Reverse the order so most recently matched pairs appear first
        return this.matchedPairs.slice().reverse().map(pairId => {
            return this.cards.find(card => card.id === pairId);
        }).filter(card => card !== undefined);
    }

    updateReviewDisplay() {
        if (this.reviewPairs.length === 0) return;

        const currentPair = this.reviewPairs[this.currentReviewIndex];
        
        // Update counter
        document.getElementById('reviewCounter').textContent = 
            `Pair ${this.currentReviewIndex + 1} of ${this.reviewPairs.length}`;
        
        // Update rhyme
        document.getElementById('reviewRhyme').textContent = currentPair.rhyme;
        
        // Update pair display
        const pairDisplay = document.getElementById('reviewPairDisplay');
        pairDisplay.innerHTML = '';
        
        // Create kanji card
        const kanjiCard = this.createReviewCard(currentPair, 'kanji');
        // Create romaji card
        const romajiCard = this.createReviewCard(currentPair, 'romaji');
        
        pairDisplay.appendChild(kanjiCard);
        pairDisplay.appendChild(romajiCard);
    }

    createReviewCard(cardData, type) {
        const card = document.createElement('div');
        card.className = 'playing-card';
        
        const cardFace = document.createElement('div');
        cardFace.className = 'card-face card-front';
        
        // Rank and suit indicators
        const rankSuitTop = document.createElement('div');
        rankSuitTop.className = `card-rank-suit suit-${cardData.suit}`;
        rankSuitTop.innerHTML = `${cardData.rank}<span class="suit-symbol">${this.getSuitSymbol(cardData.suit)}</span>`;
        
        const rankSuitBottom = document.createElement('div');
        rankSuitBottom.className = `card-rank-suit bottom suit-${cardData.suit}`;
        rankSuitBottom.innerHTML = `${cardData.rank}<span class="suit-symbol">${this.getSuitSymbol(cardData.suit)}</span>`;
        
        // Card content
        const content = document.createElement('div');
        content.className = 'card-content';
        
        if (type === 'kanji') {
            content.innerHTML = `
                <div class="kanji-content">
                    <div class="kanji">${cardData.kanji}</div>
                    <div class="hiragana">${cardData.hiragana}</div>
                </div>
            `;
        } else {
            content.innerHTML = `
                <div class="romaji-content">
                    <div class="romaji">${cardData.romaji}</div>
                    <div class="english">${cardData.english}</div>
                </div>
            `;
        }
        
        cardFace.appendChild(rankSuitTop);
        cardFace.appendChild(content);
        cardFace.appendChild(rankSuitBottom);
        card.appendChild(cardFace);
        
        return card;
    }

    updateReviewNavigation() {
        const prevBtn = document.getElementById('prevPairBtn');
        const nextBtn = document.getElementById('nextPairBtn');
        
        prevBtn.disabled = this.currentReviewIndex === 0;
        nextBtn.disabled = this.currentReviewIndex === this.reviewPairs.length - 1;
    }

    navigateReview(direction) {
        if (direction === 'prev' && this.currentReviewIndex > 0) {
            this.currentReviewIndex--;
        } else if (direction === 'next' && this.currentReviewIndex < this.reviewPairs.length - 1) {
            this.currentReviewIndex++;
        }
        
        this.updateReviewDisplay();
        this.updateReviewNavigation();
    }

    closeReviewModal() {
        document.getElementById('reviewModal').style.display = 'none';
    }

    // Print Cards Functionality
    printCards() {
        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        
        // Generate the print HTML
        const printHTML = this.generatePrintHTML();
        
        // Write the HTML to the new window
        printWindow.document.write(printHTML);
        printWindow.document.close();
        
        // Wait for content to load, then print
        printWindow.onload = () => {
            printWindow.print();
        };
    }

    generatePrintHTML() {
        const currentDate = new Date().toLocaleDateString();
        
        let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kanji Card Study Sheet</title>
    <style>
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
        
        body {
            font-family: 'Arial', 'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'Takao', 'IPAexGothic', 'IPAPGothic', 'VL PGothic', 'Noto Sans CJK JP', sans-serif;
            margin: 20px;
            background: white;
            color: #333;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        
        .print-header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #1e3c72;
            padding-bottom: 20px;
        }
        
        .print-header h1 {
            color: #1e3c72;
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        
        .print-header p {
            color: #666;
            font-size: 1.1rem;
            margin: 5px 0;
        }
        
        .cards-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 25px;
            margin-bottom: 30px;
        }
        
        .card-pair-print {
            border: 2px solid #ddd;
            border-radius: 15px;
            padding: 20px;
            background: #fafafa;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            break-inside: avoid;
        }
        
        .pair-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #ddd;
        }
        
        .card-rank-suit-print {
            font-size: 1.2rem;
            font-weight: bold;
        }
        
        .suit-hearts, .suit-diamonds { color: #DC143C; }
        .suit-clubs, .suit-spades { color: #000; }
        
        .cards-display {
            display: flex;
            justify-content: space-between;
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .card-print {
            flex: 1;
            border: 2px solid #333;
            border-radius: 10px;
            padding: 15px;
            background: white;
            text-align: center;
            min-height: 120px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        
        .kanji-print {
            font-size: 2.5rem;
            font-weight: bold;
            color: #1e3c72 !important;
            margin-bottom: 8px;
            font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'MS Gothic', 'Takao', 'IPAexGothic', 'IPAPGothic', 'VL PGothic', 'Noto Sans CJK JP', 'Arial Unicode MS', sans-serif !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        
        .hiragana-print {
            font-size: 1.2rem;
            color: #666 !important;
            margin-bottom: 5px;
            font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'MS Gothic', 'Takao', 'IPAexGothic', 'IPAPGothic', 'VL PGothic', 'Noto Sans CJK JP', 'Arial Unicode MS', sans-serif !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        
        .romaji-print {
            font-size: 1.5rem;
            font-weight: bold;
            color: #1e3c72;
            margin-bottom: 8px;
        }
        
        .english-print {
            font-size: 1.1rem;
            color: #666;
        }
        
        .rhyme-print {
            background: linear-gradient(135deg, #FFD700, #FFA500);
            border: 2px solid #FF6B35;
            border-radius: 10px;
            padding: 15px;
            font-size: 1.3rem;
            font-style: italic;
            font-weight: 600;
            color: #4B0082;
            text-align: center;
            margin-top: 10px;
        }
        
        .print-footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #1e3c72;
            color: #666;
            font-size: 0.9rem;
        }
        
        .study-tips {
            background: #f0f8ff;
            border: 2px solid #1e3c72;
            border-radius: 10px;
            padding: 20px;
            margin: 30px 0;
        }
        
        .study-tips h3 {
            color: #1e3c72;
            margin-bottom: 15px;
            font-size: 1.3rem;
        }
        
        .study-tips ul {
            margin: 0;
            padding-left: 20px;
        }
        
        .study-tips li {
            margin-bottom: 8px;
            line-height: 1.4;
        }
        
        @media print {
            .cards-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .card-pair-print {
                break-inside: avoid;
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="print-header">
        <h1>🎴 Kanji Card Study Sheet</h1>
        <p>Complete Card Pairs with Rhyming Phrases</p>
        <p>Generated on: ${currentDate} • Total Pairs: ${this.cards.length}</p>
    </div>
    
    <div class="study-tips">
        <h3>📚 Study Tips:</h3>
        <ul>
            <li><strong>Read the rhyme first</strong> - It helps you remember the pronunciation</li>
            <li><strong>Cover one card</strong> - Test yourself by covering either the kanji or romaji side</li>
            <li><strong>Practice writing</strong> - Write the kanji characters while saying the rhyme</li>
            <li><strong>Use spaced repetition</strong> - Review cards you find difficult more frequently</li>
            <li><strong>Make connections</strong> - Link the English meaning to the rhyming phrase</li>
        </ul>
    </div>
    
    <div class="cards-grid">`;

        // Generate each card pair
        this.cards.forEach(card => {
            html += `
        <div class="card-pair-print">
            <div class="pair-header">
                <div class="card-rank-suit-print suit-${card.suit}">
                    ${card.rank} ${this.getSuitSymbol(card.suit)}
                </div>
                <div class="card-rank-suit-print suit-${card.suit}">
                    ${card.rank} ${this.getSuitSymbol(card.suit)}
                </div>
            </div>
            
            <div class="cards-display">
                <div class="card-print">
                    <div class="kanji-print">${card.kanji}</div>
                    <div class="hiragana-print">${card.hiragana}</div>
                </div>
                
                <div class="card-print">
                    <div class="romaji-print">${card.romaji}</div>
                    <div class="english-print">${card.english}</div>
                </div>
            </div>
            
            <div class="rhyme-print">
                "${card.rhyme}"
            </div>
        </div>`;
        });

        html += `
    </div>
    
    <div class="print-footer">
        <p>🎯 Practice regularly and use the rhymes to build strong memory connections!</p>
        <p>Generated by Kanji Card Concentration Game</p>
    </div>
</body>
</html>`;

        return html;
    }

    // Event Listeners
    setupEventListeners() {
        // Settings modal
        document.getElementById('settingsBtn').addEventListener('click', () => {
            document.getElementById('settingsModal').style.display = 'block';
        });
        
        document.querySelector('.close').addEventListener('click', () => {
            document.getElementById('settingsModal').style.display = 'none';
        });
        
        document.getElementById('saveSettings').addEventListener('click', () => {
            this.settings.matchedPairBehavior = document.getElementById('matchedPairBehavior').value;
            this.settings.autoAdvance = document.getElementById('autoAdvance').checked;
            this.settings.timerDuration = parseInt(document.getElementById('timerDuration').value);
            this.saveSettings();
            document.getElementById('settingsModal').style.display = 'none';
            
            // Restart timer if settings changed
            if (document.getElementById('preGameScreen').classList.contains('active')) {
                this.stopPreGameTimer();
                this.startPreGameTimer();
            }
        });
        
        // Import functionality
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
        
        document.getElementById('fileInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.importData(file);
            }
        });
        
        // Print cards functionality
        document.getElementById('printCardsBtn').addEventListener('click', () => {
            this.printCards();
        });
        
        // Game controls
        document.getElementById('startGameBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetGame();
        });
        
        document.getElementById('prevRoundBtn').addEventListener('click', () => {
            this.previousRound();
        });
        
        document.getElementById('nextRoundBtn').addEventListener('click', () => {
            this.nextRound();
        });
        
        document.getElementById('backToPreGameBtn').addEventListener('click', () => {
            this.isGameActive = false;
            this.showPreGameScreen();
        });
        
        // 4-Card Restriction button
        document.getElementById('restrictBoardBtn').addEventListener('click', () => {
            this.restrictBoard();
        });
        
        // Review modal functionality
        document.getElementById('reviewBtn').addEventListener('click', () => {
            this.showReviewModal();
        });
        
        document.getElementById('reviewModalClose').addEventListener('click', () => {
            this.closeReviewModal();
        });
        
        document.getElementById('prevPairBtn').addEventListener('click', () => {
            this.navigateReview('prev');
        });
        
        document.getElementById('nextPairBtn').addEventListener('click', () => {
            this.navigateReview('next');
        });
        
        // Keyboard navigation for review modal
        document.addEventListener('keydown', (e) => {
            const reviewModal = document.getElementById('reviewModal');
            if (reviewModal.style.display === 'block') {
                switch(e.key) {
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.navigateReview('prev');
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.navigateReview('next');
                        break;
                    case 'Escape':
                        e.preventDefault();
                        this.closeReviewModal();
                        break;
                }
            }
        });
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            const settingsModal = document.getElementById('settingsModal');
            const celebrationModal = document.getElementById('celebrationModal');
            const reviewModal = document.getElementById('reviewModal');
            
            if (e.target === settingsModal) {
                settingsModal.style.display = 'none';
            }
            if (e.target === celebrationModal) {
                celebrationModal.style.display = 'none';
            }
            if (e.target === reviewModal) {
                reviewModal.style.display = 'none';
            }
        });
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new KanjiConcentrationGame();
});
