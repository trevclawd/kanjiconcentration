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
        this.showModeSelectionScreen();
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
        try {
            // Try to fetch external file first
            const response = await fetch('sample-data.json');
            const data = await response.json();
            this.cards = data.cards;
        } catch (error) {
            // Fall back to embedded data - use the full dataset
            this.cards = [
                {"id": "ace_hearts", "rank": "A", "suit": "hearts", "kanji": "下り", "hiragana": "くだり", "romaji": "kudari", "english": "downhill", "rhyme": "We go downhill you see, it's Kudari"},
                {"id": "2_hearts", "rank": "2", "suit": "hearts", "kanji": "上り", "hiragana": "のぼり", "romaji": "nobori", "english": "uphill", "rhyme": "Up the hill we climb so free, it's Nobori"},
                {"id": "3_hearts", "rank": "3", "suit": "hearts", "kanji": "水", "hiragana": "みず", "romaji": "mizu", "english": "water", "rhyme": "Clear and blue like morning dew, it's Mizu"},
                {"id": "4_hearts", "rank": "4", "suit": "hearts", "kanji": "火", "hiragana": "ひ", "romaji": "hi", "english": "fire", "rhyme": "Burning bright for all to see, it's Hi"},
                {"id": "5_hearts", "rank": "5", "suit": "hearts", "kanji": "木", "hiragana": "き", "romaji": "ki", "english": "tree", "rhyme": "Growing tall and strong and free, it's Ki"},
                {"id": "6_hearts", "rank": "6", "suit": "hearts", "kanji": "金", "hiragana": "きん", "romaji": "kin", "english": "gold", "rhyme": "Shining bright like treasure's glee, it's Kin"},
                {"id": "7_hearts", "rank": "7", "suit": "hearts", "kanji": "土", "hiragana": "つち", "romaji": "tsuchi", "english": "earth", "rhyme": "Rich and brown beneath the tree, it's Tsuchi"},
                {"id": "8_hearts", "rank": "8", "suit": "hearts", "kanji": "空", "hiragana": "そら", "romaji": "sora", "english": "sky", "rhyme": "Blue and vast for all to see, it's Sora"},
                {"id": "9_hearts", "rank": "9", "suit": "hearts", "kanji": "海", "hiragana": "うみ", "romaji": "umi", "english": "ocean", "rhyme": "Deep and wide and wild and free, it's Umi"},
                {"id": "10_hearts", "rank": "10", "suit": "hearts", "kanji": "山", "hiragana": "やま", "romaji": "yama", "english": "mountain", "rhyme": "Tall and proud for all to see, it's Yama"},
                {"id": "jack_hearts", "rank": "J", "suit": "hearts", "kanji": "川", "hiragana": "かわ", "romaji": "kawa", "english": "river", "rhyme": "Flowing swift and wild and free, it's Kawa"},
                {"id": "queen_hearts", "rank": "Q", "suit": "hearts", "kanji": "花", "hiragana": "はな", "romaji": "hana", "english": "flower", "rhyme": "Blooming bright for all to see, it's Hana"},
                {"id": "king_hearts", "rank": "K", "suit": "hearts", "kanji": "月", "hiragana": "つき", "romaji": "tsuki", "english": "moon", "rhyme": "Glowing bright in night's decree, it's Tsuki"},
                {"id": "ace_diamonds", "rank": "A", "suit": "diamonds", "kanji": "日", "hiragana": "ひ", "romaji": "hi", "english": "sun", "rhyme": "Shining bright for you and me, it's Hi"},
                {"id": "2_diamonds", "rank": "2", "suit": "diamonds", "kanji": "星", "hiragana": "ほし", "romaji": "hoshi", "english": "star", "rhyme": "Twinkling bright for all to see, it's Hoshi"},
                {"id": "3_diamonds", "rank": "3", "suit": "diamonds", "kanji": "雲", "hiragana": "くも", "romaji": "kumo", "english": "cloud", "rhyme": "Floating white and soft and free, it's Kumo"},
                {"id": "4_diamonds", "rank": "4", "suit": "diamonds", "kanji": "雨", "hiragana": "あめ", "romaji": "ame", "english": "rain", "rhyme": "Falling down from clouds we see, it's Ame"},
                {"id": "5_diamonds", "rank": "5", "suit": "diamonds", "kanji": "雪", "hiragana": "ゆき", "romaji": "yuki", "english": "snow", "rhyme": "White and cold as cold can be, it's Yuki"},
                {"id": "6_diamonds", "rank": "6", "suit": "diamonds", "kanji": "風", "hiragana": "かぜ", "romaji": "kaze", "english": "wind", "rhyme": "Blowing strong and wild and free, it's Kaze"},
                {"id": "7_diamonds", "rank": "7", "suit": "diamonds", "kanji": "石", "hiragana": "いし", "romaji": "ishi", "english": "stone", "rhyme": "Hard and strong as strong can be, it's Ishi"},
                {"id": "8_diamonds", "rank": "8", "suit": "diamonds", "kanji": "草", "hiragana": "くさ", "romaji": "kusa", "english": "grass", "rhyme": "Green and soft beneath the tree, it's Kusa"},
                {"id": "9_diamonds", "rank": "9", "suit": "diamonds", "kanji": "葉", "hiragana": "は", "romaji": "ha", "english": "leaf", "rhyme": "Green and fresh for all to see, it's Ha"},
                {"id": "10_diamonds", "rank": "10", "suit": "diamonds", "kanji": "根", "hiragana": "ね", "romaji": "ne", "english": "root", "rhyme": "Deep below where none can see, it's Ne"},
                {"id": "jack_diamonds", "rank": "J", "suit": "diamonds", "kanji": "種", "hiragana": "たね", "romaji": "tane", "english": "seed", "rhyme": "Small but full of life to be, it's Tane"},
                {"id": "queen_diamonds", "rank": "Q", "suit": "diamonds", "kanji": "実", "hiragana": "み", "romaji": "mi", "english": "fruit", "rhyme": "Sweet and ripe upon the tree, it's Mi"},
                {"id": "king_diamonds", "rank": "K", "suit": "diamonds", "kanji": "森", "hiragana": "もり", "romaji": "mori", "english": "forest", "rhyme": "Dark and deep and wild and free, it's Mori"},
                {"id": "ace_clubs", "rank": "A", "suit": "clubs", "kanji": "家", "hiragana": "いえ", "romaji": "ie", "english": "house", "rhyme": "Warm and safe for you and me, it's Ie"},
                {"id": "2_clubs", "rank": "2", "suit": "clubs", "kanji": "門", "hiragana": "もん", "romaji": "mon", "english": "gate", "rhyme": "Standing tall for all to see, it's Mon"},
                {"id": "3_clubs", "rank": "3", "suit": "clubs", "kanji": "道", "hiragana": "みち", "romaji": "michi", "english": "road", "rhyme": "Leading far where we can't see, it's Michi"},
                {"id": "4_clubs", "rank": "4", "suit": "clubs", "kanji": "橋", "hiragana": "はし", "romaji": "hashi", "english": "bridge", "rhyme": "Crossing over streams so free, it's Hashi"},
                {"id": "5_clubs", "rank": "5", "suit": "clubs", "kanji": "車", "hiragana": "くるま", "romaji": "kuruma", "english": "car", "rhyme": "Rolling fast for all to see, it's Kuruma"},
                {"id": "6_clubs", "rank": "6", "suit": "clubs", "kanji": "船", "hiragana": "ふね", "romaji": "fune", "english": "boat", "rhyme": "Sailing on the deep blue sea, it's Fune"},
                {"id": "7_clubs", "rank": "7", "suit": "clubs", "kanji": "電車", "hiragana": "でんしゃ", "romaji": "densha", "english": "train", "rhyme": "Racing fast for all to see, it's Densha"},
                {"id": "8_clubs", "rank": "8", "suit": "clubs", "kanji": "飛行機", "hiragana": "ひこうき", "romaji": "hikouki", "english": "airplane", "rhyme": "Flying high above the sea, it's Hikouki"},
                {"id": "9_clubs", "rank": "9", "suit": "clubs", "kanji": "自転車", "hiragana": "じてんしゃ", "romaji": "jitensha", "english": "bicycle", "rhyme": "Pedaling fast and wild and free, it's Jitensha"},
                {"id": "10_clubs", "rank": "10", "suit": "clubs", "kanji": "歩く", "hiragana": "あるく", "romaji": "aruku", "english": "walk", "rhyme": "Step by step so carefully, it's Aruku"},
                {"id": "jack_clubs", "rank": "J", "suit": "clubs", "kanji": "走る", "hiragana": "はしる", "romaji": "hashiru", "english": "run", "rhyme": "Fast and quick as quick can be, it's Hashiru"},
                {"id": "queen_clubs", "rank": "Q", "suit": "clubs", "kanji": "泳ぐ", "hiragana": "およぐ", "romaji": "oyogu", "english": "swim", "rhyme": "Through the water wild and free, it's Oyogu"},
                {"id": "king_clubs", "rank": "K", "suit": "clubs", "kanji": "飛ぶ", "hiragana": "とぶ", "romaji": "tobu", "english": "fly", "rhyme": "High above for all to see, it's Tobu"},
                {"id": "ace_spades", "rank": "A", "suit": "spades", "kanji": "人", "hiragana": "ひと", "romaji": "hito", "english": "person", "rhyme": "Walking tall for all to see, it's Hito"},
                {"id": "2_spades", "rank": "2", "suit": "spades", "kanji": "男", "hiragana": "おとこ", "romaji": "otoko", "english": "man", "rhyme": "Strong and brave as brave can be, it's Otoko"},
                {"id": "3_spades", "rank": "3", "suit": "spades", "kanji": "女", "hiragana": "おんな", "romaji": "onna", "english": "woman", "rhyme": "Graceful, kind, and strong and free, it's Onna"},
                {"id": "4_spades", "rank": "4", "suit": "spades", "kanji": "子供", "hiragana": "こども", "romaji": "kodomo", "english": "child", "rhyme": "Playing games so happily, it's Kodomo"},
                {"id": "5_spades", "rank": "5", "suit": "spades", "kanji": "友達", "hiragana": "ともだち", "romaji": "tomodachi", "english": "friend", "rhyme": "Always there for you and me, it's Tomodachi"},
                {"id": "6_spades", "rank": "6", "suit": "spades", "kanji": "家族", "hiragana": "かぞく", "romaji": "kazoku", "english": "family", "rhyme": "Together strong as strong can be, it's Kazoku"},
                {"id": "7_spades", "rank": "7", "suit": "spades", "kanji": "先生", "hiragana": "せんせい", "romaji": "sensei", "english": "teacher", "rhyme": "Wise and kind for all to see, it's Sensei"},
                {"id": "8_spades", "rank": "8", "suit": "spades", "kanji": "学生", "hiragana": "がくせい", "romaji": "gakusei", "english": "student", "rhyme": "Learning new things happily, it's Gakusei"},
                {"id": "9_spades", "rank": "9", "suit": "spades", "kanji": "医者", "hiragana": "いしゃ", "romaji": "isha", "english": "doctor", "rhyme": "Healing all so carefully, it's Isha"},
                {"id": "10_spades", "rank": "10", "suit": "spades", "kanji": "料理人", "hiragana": "りょうりにん", "romaji": "ryourinin", "english": "cook", "rhyme": "Making food so tastily, it's Ryourinin"},
                {"id": "jack_spades", "rank": "J", "suit": "spades", "kanji": "警察官", "hiragana": "けいさつかん", "romaji": "keisatsukan", "english": "police officer", "rhyme": "Keeping safe our community, it's Keisatsukan"},
                {"id": "queen_spades", "rank": "Q", "suit": "spades", "kanji": "消防士", "hiragana": "しょうぼうし", "romaji": "shouboushi", "english": "firefighter", "rhyme": "Brave and strong for all to see, it's Shouboushi"},
                {"id": "king_spades", "rank": "K", "suit": "spades", "kanji": "王様", "hiragana": "おうさま", "romaji": "ousama", "english": "king", "rhyme": "Ruling fair for all to see, it's Ousama"}
            ];
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
        const kanjiCard = this.createCelebrationCard(cardData, 'kanji');
        const romajiCard = this.createCelebrationCard(cardData, 'romaji');
        cardsDisplay.appendChild(kanjiCard);
        cardsDisplay.appendChild(romajiCard);
        
        modal.style.display = 'block';
        
        // Auto-close after 3 seconds
        setTimeout(() => {
            modal.style.display = 'none';
        }, 3000);
    }

    createCelebrationCard(cardData, type) {
        const card = document.createElement('div');
        card.className = 'playing-card celebration-card';
        
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
        document.getElementById('gameModeScreen').classList.remove('active');
        document.getElementById('preGameScreen').classList.add('active');
        document.getElementById('gameScreen').classList.remove('active');
        document.getElementById('dragDropScreen').classList.remove('active');
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

    // Print Cloze Modal Functionality
    showPrintClozeModal() {
        document.getElementById('printClozeModal').style.display = 'block';
    }

    closePrintClozeModal() {
        document.getElementById('printClozeModal').style.display = 'none';
    }

    printCardsWithCloze() {
        // Get cloze settings
        const clozeSettings = {
            hideRomajiFromMeaning: document.getElementById('hideRomajiFromMeaning').checked,
            hideHiraganaFromKanji: document.getElementById('hideHiraganaFromKanji').checked,
            hideRomajiFromRhyme: document.getElementById('hideRomajiFromRhyme').checked,
            hideKanjiFromKanji: document.getElementById('hideKanjiFromKanji').checked,
            hideEnglishFromMeaning: document.getElementById('hideEnglishFromMeaning').checked
        };

        // Close the modal
        this.closePrintClozeModal();

        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        
        // Generate the print HTML with cloze settings
        const printHTML = this.generatePrintHTML(clozeSettings);
        
        // Write the HTML to the new window
        printWindow.document.write(printHTML);
        printWindow.document.close();
        
        // Wait for content to load, then print
        printWindow.onload = () => {
            printWindow.print();
        };
    }

    // Print Cards Functionality
    printCards() {
        // Close the modal
        this.closePrintClozeModal();
        
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

    generatePrintHTML(clozeSettings = null) {
        const currentDate = new Date().toLocaleDateString();
        const isClozeMode = clozeSettings !== null;
        
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
                    ${isClozeMode && clozeSettings.hideKanjiFromKanji ? 
                        '<div class="kanji-print">_____</div>' : 
                        `<div class="kanji-print">${card.kanji}</div>`}
                    ${isClozeMode && clozeSettings.hideHiraganaFromKanji ? 
                        '<div class="hiragana-print">_____</div>' : 
                        `<div class="hiragana-print">${card.hiragana}</div>`}
                </div>
                
                <div class="card-print">
                    ${isClozeMode && clozeSettings.hideRomajiFromMeaning ? 
                        '<div class="romaji-print">_____</div>' : 
                        `<div class="romaji-print">${card.romaji}</div>`}
                    ${isClozeMode && clozeSettings.hideEnglishFromMeaning ? 
                        '<div class="english-print">_____</div>' : 
                        `<div class="english-print">${card.english}</div>`}
                </div>
            </div>
            
            <div class="rhyme-print">
                "${isClozeMode && clozeSettings.hideRomajiFromRhyme ? 
                    card.rhyme.replace(new RegExp('\\b' + card.romaji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi'), '_____') : 
                    card.rhyme}"
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

    // Mode Selection Screen
    showModeSelectionScreen() {
        document.getElementById('gameModeScreen').classList.add('active');
        document.getElementById('preGameScreen').classList.remove('active');
        document.getElementById('gameScreen').classList.remove('active');
        document.getElementById('dragDropScreen').classList.remove('active');
    }

    // Drag & Drop Mode
    startDragDropMode() {
        this.isGameActive = true;
        this.attempts = 0;
        this.score = 1000;
        this.matchedPairs = [];
        this.dragDropMatches = new Set();
        
        this.showDragDropScreen();
        this.displayDragDropGame();
        this.updateDragDropUI();
    }

    showDragDropScreen() {
        document.getElementById('gameModeScreen').classList.remove('active');
        document.getElementById('preGameScreen').classList.remove('active');
        document.getElementById('gameScreen').classList.remove('active');
        document.getElementById('dragDropScreen').classList.add('active');
    }

    displayDragDropGame() {
        this.displayTargetCards();
        this.displaySourceCards();
    }

    displayTargetCards() {
        const container = document.getElementById('targetCardsContainer');
        container.innerHTML = '';

        this.cards.forEach(card => {
            const targetCard = this.createTargetCard(card);
            container.appendChild(targetCard);
        });
    }

    createTargetCard(cardData) {
        const targetCard = document.createElement('div');
        targetCard.className = 'target-card';
        targetCard.dataset.cardId = cardData.id;

        const rankSuit = document.createElement('div');
        rankSuit.className = `target-rank-suit suit-${cardData.suit}`;
        rankSuit.innerHTML = `${cardData.rank} ${this.getSuitSymbol(cardData.suit)}`;

        const targetInfo = document.createElement('div');
        targetInfo.className = 'target-info';

        const targetText = document.createElement('div');
        targetText.className = 'target-text';

        const romaji = document.createElement('div');
        romaji.className = 'target-romaji';
        romaji.textContent = cardData.romaji;

        const english = document.createElement('div');
        english.className = 'target-english';
        english.textContent = cardData.english;

        targetText.appendChild(romaji);
        targetText.appendChild(english);

        const dropZone = document.createElement('div');
        dropZone.className = 'drop-zone';
        dropZone.textContent = 'Drop Kanji Here';
        dropZone.dataset.cardId = cardData.id;

        // Add drag and drop event listeners
        dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
        dropZone.addEventListener('drop', this.handleDrop.bind(this));
        dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));

        targetInfo.appendChild(targetText);
        targetInfo.appendChild(dropZone);

        const rhyme = document.createElement('div');
        rhyme.className = 'target-rhyme';
        rhyme.textContent = cardData.rhyme;

        // Add quick answer button
        const quickAnswerBtn = document.createElement('button');
        quickAnswerBtn.className = 'quick-answer-btn';
        quickAnswerBtn.textContent = '💡 Show Answer';
        quickAnswerBtn.dataset.cardId = cardData.id;
        quickAnswerBtn.addEventListener('click', () => this.handleQuickAnswer(cardData.id));

        // Add all elements directly to the target card
        targetCard.appendChild(rankSuit);
        targetCard.appendChild(targetInfo);
        targetCard.appendChild(rhyme);
        targetCard.appendChild(quickAnswerBtn);

        return targetCard;
    }

    displaySourceCards() {
        const container = document.getElementById('sourceCardsContainer');
        container.innerHTML = '';

        // Shuffle the cards for the source area
        const shuffledCards = [...this.cards];
        this.shuffleArray(shuffledCards);

        shuffledCards.forEach(card => {
            const sourceCard = this.createSourceCard(card);
            container.appendChild(sourceCard);
        });
    }

    createSourceCard(cardData) {
        const sourceCard = document.createElement('div');
        sourceCard.className = 'draggable-kanji-card';
        sourceCard.draggable = true;
        sourceCard.dataset.cardId = cardData.id;

        const content = document.createElement('div');
        content.className = 'kanji-card-content';

        const kanji = document.createElement('div');
        kanji.className = 'kanji-card-kanji';
        kanji.textContent = cardData.kanji;
        // Note: Not showing hiragana as per requirements

        content.appendChild(kanji);

        sourceCard.appendChild(content);

        // Add drag event listeners
        sourceCard.addEventListener('dragstart', this.handleDragStart.bind(this));
        sourceCard.addEventListener('dragend', this.handleDragEnd.bind(this));

        return sourceCard;
    }

    // Drag and Drop Event Handlers
    handleDragStart(e) {
        const card = e.target;
        if (card.classList.contains('matched')) {
            e.preventDefault();
            return;
        }

        card.classList.add('dragging');
        e.dataTransfer.setData('text/plain', card.dataset.cardId);
        e.dataTransfer.effectAllowed = 'move';
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const dropZone = e.target;
        if (dropZone.classList.contains('drop-zone') && !dropZone.classList.contains('has-card')) {
            dropZone.classList.add('drag-over');
            dropZone.parentElement.classList.add('drag-over');
        }
    }

    handleDragLeave(e) {
        const dropZone = e.target;
        if (dropZone.classList.contains('drop-zone')) {
            dropZone.classList.remove('drag-over');
            dropZone.parentElement.classList.remove('drag-over');
        }
    }

    handleDrop(e) {
        e.preventDefault();
        
        const dropZone = e.target;
        const draggedCardId = e.dataTransfer.getData('text/plain');
        const targetCardId = dropZone.dataset.cardId;

        // Remove drag-over styling
        dropZone.classList.remove('drag-over');
        dropZone.parentElement.classList.remove('drag-over');

        // Check if drop zone already has a card
        if (dropZone.classList.contains('has-card')) {
            return;
        }

        // Find the dragged card element
        const draggedCard = document.querySelector(`[data-card-id="${draggedCardId}"].draggable-kanji-card`);
        if (!draggedCard || draggedCard.classList.contains('matched')) {
            return;
        }

        this.attempts++;

        // Check if it's a correct match
        if (draggedCardId === targetCardId) {
            // Correct match!
            this.handleCorrectMatch(draggedCard, dropZone, draggedCardId);
        } else {
            // Incorrect match
            this.handleIncorrectMatch(draggedCard, dropZone);
        }

        this.updateDragDropUI();
    }

    handleCorrectMatch(draggedCard, dropZone, cardId) {
        // Mark as matched
        this.dragDropMatches.add(cardId);
        this.matchedPairs.push(cardId);

        // Create a smaller version of the kanji card for the drop zone
        const droppedCard = this.createDroppedCard(draggedCard);
        dropZone.innerHTML = '';
        dropZone.appendChild(droppedCard);
        dropZone.classList.add('has-card');

        // Mark the original card as matched
        draggedCard.classList.add('matched');
        dropZone.parentElement.classList.add('matched');

        // Update score
        this.updateDragDropScore(true);

        // Show celebration
        const cardData = this.cards.find(card => card.id === cardId);
        if (cardData) {
            this.showMatchCelebration(cardData);
        }

        // Check if game is complete
        if (this.dragDropMatches.size === this.cards.length) {
            setTimeout(() => {
                alert(`Congratulations! You completed the Drag & Drop mode in ${this.attempts} attempts! Final Score: ${this.score}`);
            }, 2000);
        }
    }

    handleIncorrectMatch(draggedCard, dropZone) {
        // Update score for incorrect attempt
        this.updateDragDropScore(false);

        // Visual feedback for incorrect match
        dropZone.style.backgroundColor = '#ffebee';
        dropZone.style.borderColor = '#f44336';
        
        setTimeout(() => {
            dropZone.style.backgroundColor = '';
            dropZone.style.borderColor = '';
        }, 1000);
    }

    createDroppedCard(originalCard) {
        const cardData = this.cards.find(card => card.id === originalCard.dataset.cardId);
        
        const droppedCard = document.createElement('div');
        droppedCard.className = 'dropped-kanji-card';

        const content = document.createElement('div');
        content.className = 'kanji-card-content';

        const kanji = document.createElement('div');
        kanji.className = 'kanji-card-kanji';
        kanji.textContent = cardData.kanji;

        content.appendChild(kanji);

        droppedCard.appendChild(content);

        return droppedCard;
    }

    updateDragDropScore(isCorrect) {
        let scoreChange = 0;
        
        if (isCorrect) {
            scoreChange = 100; // Bonus for correct match
        } else {
            scoreChange = -20; // Penalty for incorrect attempt
        }
        
        this.score += scoreChange;
        this.showDragDropScoreChange(scoreChange);
    }

    showDragDropScoreChange(change) {
        const scoreChangeElement = document.getElementById('dragDropScoreChange');
        
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
        
        // Update the main score display
        document.getElementById('dragDropScore').textContent = `Score: ${this.score}`;
    }

    updateDragDropUI() {
        document.getElementById('dragDropScore').textContent = `Score: ${this.score}`;
        document.getElementById('dragDropMatches').textContent = `Matches: ${this.dragDropMatches.size}/${this.cards.length}`;
        document.getElementById('dragDropAttempts').textContent = `Attempts: ${this.attempts}`;
    }

    resetDragDropGame() {
        this.attempts = 0;
        this.score = 1000;
        this.matchedPairs = [];
        this.dragDropMatches = new Set();
        
        this.displayDragDropGame();
        this.updateDragDropUI();
    }

    // Quick Answer functionality
    handleQuickAnswer(cardId) {
        // Check if this card is already matched
        if (this.dragDropMatches.has(cardId)) {
            return;
        }

        // Find the target card and its drop zone
        const targetCard = document.querySelector(`[data-card-id="${cardId}"].target-card`);
        const dropZone = targetCard.querySelector('.drop-zone');
        
        // Check if drop zone already has a card
        if (dropZone.classList.contains('has-card')) {
            return;
        }

        // Find the corresponding kanji card in the source area
        const sourceCard = document.querySelector(`[data-card-id="${cardId}"].draggable-kanji-card`);
        if (!sourceCard || sourceCard.classList.contains('matched')) {
            return;
        }

        // Automatically match the cards
        this.handleCorrectMatch(sourceCard, dropZone, cardId);
        
        // Update attempts (but don't penalize for using quick answer)
        this.attempts++;
        this.updateDragDropUI();

        // Hide the quick answer button after use
        const quickAnswerBtn = targetCard.querySelector('.quick-answer-btn');
        if (quickAnswerBtn) {
            quickAnswerBtn.style.display = 'none';
        }
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
            this.showPrintClozeModal();
        });
        
        // Print cloze modal functionality
        document.getElementById('printClozeClose').addEventListener('click', () => {
            this.closePrintClozeModal();
        });
        
        document.getElementById('printWithCloze').addEventListener('click', () => {
            this.printCardsWithCloze();
        });
        
        document.getElementById('printNormal').addEventListener('click', () => {
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
        
        // Mode selection event listeners
        document.getElementById('concentrationMode').addEventListener('click', () => {
            this.showPreGameScreen();
        });
        
        document.getElementById('dragDropMode').addEventListener('click', () => {
            this.startDragDropMode();
        });
        
        // Drag & Drop mode controls
        document.getElementById('dragDropResetBtn').addEventListener('click', () => {
            this.resetDragDropGame();
        });
        
        document.getElementById('dragDropBackBtn').addEventListener('click', () => {
            this.showPreGameScreen();
        });
        
        document.getElementById('backToModeSelectBtn').addEventListener('click', () => {
            this.showModeSelectionScreen();
        });
        
        // Celebration modal close button
        document.getElementById('celebrationModalClose').addEventListener('click', () => {
            document.getElementById('celebrationModal').style.display = 'none';
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
