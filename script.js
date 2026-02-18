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
            timerDuration: 60,
            timedMemoryDuration: 5,
            timedMemoryTimerEnabled: true,
            timedMemorySpeakJapanese: true,
            timedMemorySpeakEnglish: true,
            openaiApiKey: ''
        };
        this.preGameTimer = null;
        this.isGameActive = false;
        this.currentAudio = null;
        this.isPlayingAll = false;
        this.audioCache = {};  // Cache for TTS audio blobs
        this.timedMemoryAudioQueue = [];  // Queue for sequential TTS playback
        this.timedMemoryAudioPlaying = false;  // Flag to track if audio is playing
        
        // Listen to Sentences mode toggles
        this.listenSpeakEnglish = false;  // Play English after Japanese
        this.listenLoop = false;  // Loop back to first sentence
        
        // Card selection functionality
        this.isCardSelectionMode = false;
        this.selectedCards = new Set();
        
        // Hiragana visibility state
        this.isHiraganaHidden = false;
        
        this.init();
    }

    async init() {
        this.loadSettings();
        this.loadOpenAIKey();
        await this.loadSampleData();
        this.setupEventListeners();
        this.showPreGameScreen();
    }

    async loadOpenAIKey() {
        try {
            const response = await fetch('/api/openai-key');
            const data = await response.json();
            if (data.key) {
                this.settings.openaiApiKey = data.key;
            }
        } catch (e) {
            console.log('Could not load OpenAI key from server');
        }
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
        document.getElementById('timedMemoryDuration').value = this.settings.timedMemoryDuration;
        document.getElementById('timedMemoryTimerEnabled').checked = this.settings.timedMemoryTimerEnabled;
        
        const speakJapaneseEl = document.getElementById('timedMemorySpeakJapanese');
        if (speakJapaneseEl) speakJapaneseEl.checked = this.settings.timedMemorySpeakJapanese;
        
        const speakEnglishEl = document.getElementById('timedMemorySpeakEnglish');
        if (speakEnglishEl) speakEnglishEl.checked = this.settings.timedMemorySpeakEnglish;
        
        const apiKeyInput = document.getElementById('openaiApiKey');
        if (apiKeyInput) apiKeyInput.value = this.settings.openaiApiKey || '';
    }

    // Data Management
    async loadSampleData() {
        try {
            // Try to fetch external file first - prefer the one with sentences
            let response;
            try {
                response = await fetch('sample-data-with-sentences.json');
                const data = await response.json();
                this.cards = data.cards;
            } catch (sentenceError) {
                // Fall back to regular sample data
                response = await fetch('sample-data.json');
                const data = await response.json();
                this.cards = data.cards;
            }
        } catch (error) {
            // Fall back to embedded data - use the full dataset with sentences
            this.cards = [
                {"id": "ace_hearts", "rank": "A", "suit": "hearts", "kanji": "下り", "hiragana": "くだり", "romaji": "kudari", "english": "downhill", "rhyme": "We go downhill you see, it's Kudari", "sentence": {"kanji": "山の下りは危険です。", "romaji": "Yama no kudari wa kiken desu.", "english": "Going downhill on the mountain is dangerous."}},
                {"id": "2_hearts", "rank": "2", "suit": "hearts", "kanji": "上り", "hiragana": "のぼり", "romaji": "nobori", "english": "uphill", "rhyme": "Up the hill we climb so free, it's Nobori", "sentence": {"kanji": "急な上りを歩きます。", "romaji": "Kyuu na nobori wo arukimasu.", "english": "I walk up the steep uphill path."}},
                {"id": "3_hearts", "rank": "3", "suit": "hearts", "kanji": "水", "hiragana": "みず", "romaji": "mizu", "english": "water", "rhyme": "Clear and blue like morning dew, it's Mizu", "sentence": {"kanji": "冷たい水を飲みます。", "romaji": "Tsumetai mizu wo nomimasu.", "english": "I drink cold water."}},
                {"id": "4_hearts", "rank": "4", "suit": "hearts", "kanji": "火", "hiragana": "ひ", "romaji": "hi", "english": "fire", "rhyme": "Burning bright for all to see, it's Hi", "sentence": {"kanji": "キャンプで火を起こします。", "romaji": "Kyanpu de hi wo okoshimasu.", "english": "I start a fire at the camp."}},
                {"id": "5_hearts", "rank": "5", "suit": "hearts", "kanji": "木", "hiragana": "き", "romaji": "ki", "english": "tree", "rhyme": "Growing tall and strong and free, it's Ki", "sentence": {"kanji": "大きな木の下で休みます。", "romaji": "Ookina ki no shita de yasumimasu.", "english": "I rest under the big tree."}},
                {"id": "6_hearts", "rank": "6", "suit": "hearts", "kanji": "金", "hiragana": "きん", "romaji": "kin", "english": "gold", "rhyme": "Shining bright like treasure's glee, it's Kin", "sentence": {"kanji": "金の指輪を見つけました。", "romaji": "Kin no yubiwa wo mitsukemashita.", "english": "I found a gold ring."}},
                {"id": "7_hearts", "rank": "7", "suit": "hearts", "kanji": "土", "hiragana": "つち", "romaji": "tsuchi", "english": "earth", "rhyme": "Rich and brown beneath the tree, it's Tsuchi", "sentence": {"kanji": "土に宝物を埋めます。", "romaji": "Tsuchi ni takaramono wo uzumemasu.", "english": "I bury the treasure in the earth."}},
                {"id": "8_hearts", "rank": "8", "suit": "hearts", "kanji": "空", "hiragana": "そら", "romaji": "sora", "english": "sky", "rhyme": "Blue and vast for all to see, it's Sora", "sentence": {"kanji": "青い空を見上げます。", "romaji": "Aoi sora wo miagimasu.", "english": "I look up at the blue sky."}},
                {"id": "9_hearts", "rank": "9", "suit": "hearts", "kanji": "海", "hiragana": "うみ", "romaji": "umi", "english": "ocean", "rhyme": "Deep and wide and wild and free, it's Umi", "sentence": {"kanji": "遠くに海が見えます。", "romaji": "Tooku ni umi ga miemasu.", "english": "I can see the ocean in the distance."}},
                {"id": "10_hearts", "rank": "10", "suit": "hearts", "kanji": "山", "hiragana": "やま", "romaji": "yama", "english": "mountain", "rhyme": "Tall and proud for all to see, it's Yama", "sentence": {"kanji": "高い山に登ります。", "romaji": "Takai yama ni noborimasu.", "english": "I climb the tall mountain."}},
                {"id": "jack_hearts", "rank": "J", "suit": "hearts", "kanji": "川", "hiragana": "かわ", "romaji": "kawa", "english": "river", "rhyme": "Flowing swift and wild and free, it's Kawa", "sentence": {"kanji": "川で魚を釣ります。", "romaji": "Kawa de sakana wo tsurimasu.", "english": "I fish in the river."}},
                {"id": "queen_hearts", "rank": "Q", "suit": "hearts", "kanji": "花", "hiragana": "はな", "romaji": "hana", "english": "flower", "rhyme": "Blooming bright for all to see, it's Hana", "sentence": {"kanji": "美しい花を摘みます。", "romaji": "Utsukushii hana wo tsumimasu.", "english": "I pick beautiful flowers."}},
                {"id": "king_hearts", "rank": "K", "suit": "hearts", "kanji": "月", "hiragana": "つき", "romaji": "tsuki", "english": "moon", "rhyme": "Glowing bright in night's decree, it's Tsuki", "sentence": {"kanji": "夜の月が明るく照らします。", "romaji": "Yoru no tsuki ga akaruku terashimasu.", "english": "The night moon shines brightly."}},
                {"id": "ace_diamonds", "rank": "A", "suit": "diamonds", "kanji": "日", "hiragana": "ひ", "romaji": "hi", "english": "sun", "rhyme": "Shining bright for you and me, it's Hi", "sentence": {"kanji": "朝の日が昇ります。", "romaji": "Asa no hi ga noborimasu.", "english": "The morning sun rises."}},
                {"id": "2_diamonds", "rank": "2", "suit": "diamonds", "kanji": "星", "hiragana": "ほし", "romaji": "hoshi", "english": "star", "rhyme": "Twinkling bright for all to see, it's Hoshi", "sentence": {"kanji": "夜空に星が輝きます。", "romaji": "Yozora ni hoshi ga kagayakimasu.", "english": "Stars twinkle in the night sky."}},
                {"id": "3_diamonds", "rank": "3", "suit": "diamonds", "kanji": "雲", "hiragana": "くも", "romaji": "kumo", "english": "cloud", "rhyme": "Floating white and soft and free, it's Kumo", "sentence": {"kanji": "白い雲が空に浮かびます。", "romaji": "Shiroi kumo ga sora ni ukabimasu.", "english": "White clouds float in the sky."}},
                {"id": "4_diamonds", "rank": "4", "suit": "diamonds", "kanji": "雨", "hiragana": "あめ", "romaji": "ame", "english": "rain", "rhyme": "Falling down from clouds we see, it's Ame", "sentence": {"kanji": "雨が降り始めます。", "romaji": "Ame ga furi hajimemasu.", "english": "Rain begins to fall."}},
                {"id": "5_diamonds", "rank": "5", "suit": "diamonds", "kanji": "雪", "hiragana": "ゆき", "romaji": "yuki", "english": "snow", "rhyme": "White and cold as cold can be, it's Yuki", "sentence": {"kanji": "冬に雪が降ります。", "romaji": "Fuyu ni yuki ga furimasu.", "english": "Snow falls in winter."}},
                {"id": "6_diamonds", "rank": "6", "suit": "diamonds", "kanji": "風", "hiragana": "かぜ", "romaji": "kaze", "english": "wind", "rhyme": "Blowing strong and wild and free, it's Kaze", "sentence": {"kanji": "強い風が吹いています。", "romaji": "Tsuyoi kaze ga fuiteimasu.", "english": "A strong wind is blowing."}},
                {"id": "7_diamonds", "rank": "7", "suit": "diamonds", "kanji": "石", "hiragana": "いし", "romaji": "ishi", "english": "stone", "rhyme": "Hard and strong as strong can be, it's Ishi", "sentence": {"kanji": "大きな石を見つけます。", "romaji": "Ookina ishi wo mitsukemasu.", "english": "I find a big stone."}},
                {"id": "8_diamonds", "rank": "8", "suit": "diamonds", "kanji": "草", "hiragana": "くさ", "romaji": "kusa", "english": "grass", "rhyme": "Green and soft beneath the tree, it's Kusa", "sentence": {"kanji": "緑の草の上に座ります。", "romaji": "Midori no kusa no ue ni suwarimasu.", "english": "I sit on the green grass."}},
                {"id": "9_diamonds", "rank": "9", "suit": "diamonds", "kanji": "葉", "hiragana": "は", "romaji": "ha", "english": "leaf", "rhyme": "Green and fresh for all to see, it's Ha", "sentence": {"kanji": "木の葉が風で揺れます。", "romaji": "Ki no ha ga kaze de yuremasu.", "english": "The tree leaves sway in the wind."}},
                {"id": "10_diamonds", "rank": "10", "suit": "diamonds", "kanji": "根", "hiragana": "ね", "romaji": "ne", "english": "root", "rhyme": "Deep below where none can see, it's Ne", "sentence": {"kanji": "木の根が深く伸びています。", "romaji": "Ki no ne ga fukaku nobiteimasu.", "english": "The tree roots extend deep."}},
                {"id": "jack_diamonds", "rank": "J", "suit": "diamonds", "kanji": "種", "hiragana": "たね", "romaji": "tane", "english": "seed", "rhyme": "Small but full of life to be, it's Tane", "sentence": {"kanji": "小さな種を植えます。", "romaji": "Chiisana tane wo uemasu.", "english": "I plant small seeds."}},
                {"id": "queen_diamonds", "rank": "Q", "suit": "diamonds", "kanji": "実", "hiragana": "み", "romaji": "mi", "english": "fruit", "rhyme": "Sweet and ripe upon the tree, it's Mi", "sentence": {"kanji": "甘い実を収穫します。", "romaji": "Amai mi wo shuukaku shimasu.", "english": "I harvest sweet fruit."}},
                {"id": "king_diamonds", "rank": "K", "suit": "diamonds", "kanji": "森", "hiragana": "もり", "romaji": "mori", "english": "forest", "rhyme": "Dark and deep and wild and free, it's Mori", "sentence": {"kanji": "深い森を探検します。", "romaji": "Fukai mori wo tanken shimasu.", "english": "I explore the deep forest."}},
                {"id": "ace_clubs", "rank": "A", "suit": "clubs", "kanji": "家", "hiragana": "いえ", "romaji": "ie", "english": "house", "rhyme": "Warm and safe for you and me, it's Ie", "sentence": {"kanji": "小さな家を見つけます。", "romaji": "Chiisana ie wo mitsukemasu.", "english": "I find a small house."}},
                {"id": "2_clubs", "rank": "2", "suit": "clubs", "kanji": "門", "hiragana": "もん", "romaji": "mon", "english": "gate", "rhyme": "Standing tall for all to see, it's Mon", "sentence": {"kanji": "古い門を開けます。", "romaji": "Furui mon wo akemasu.", "english": "I open the old gate."}},
                {"id": "3_clubs", "rank": "3", "suit": "clubs", "kanji": "道", "hiragana": "みち", "romaji": "michi", "english": "road", "rhyme": "Leading far where we can't see, it's Michi", "sentence": {"kanji": "長い道を歩きます。", "romaji": "Nagai michi wo arukimasu.", "english": "I walk along the long road."}},
                {"id": "4_clubs", "rank": "4", "suit": "clubs", "kanji": "橋", "hiragana": "はし", "romaji": "hashi", "english": "bridge", "rhyme": "Crossing over streams so free, it's Hashi", "sentence": {"kanji": "木の橋を渡ります。", "romaji": "Ki no hashi wo watarimasu.", "english": "I cross the wooden bridge."}},
                {"id": "5_clubs", "rank": "5", "suit": "clubs", "kanji": "車", "hiragana": "くるま", "romaji": "kuruma", "english": "car", "rhyme": "Rolling fast for all to see, it's Kuruma", "sentence": {"kanji": "古い車を運転します。", "romaji": "Furui kuruma wo unten shimasu.", "english": "I drive an old car."}},
                {"id": "6_clubs", "rank": "6", "suit": "clubs", "kanji": "船", "hiragana": "ふね", "romaji": "fune", "english": "boat", "rhyme": "Sailing on the deep blue sea, it's Fune", "sentence": {"kanji": "小さな船に乗ります。", "romaji": "Chiisana fune ni norimasu.", "english": "I board a small boat."}},
                {"id": "7_clubs", "rank": "7", "suit": "clubs", "kanji": "電車", "hiragana": "でんしゃ", "romaji": "densha", "english": "train", "rhyme": "Racing fast for all to see, it's Densha", "sentence": {"kanji": "電車で町に行きます。", "romaji": "Densha de machi ni ikimasu.", "english": "I go to town by train."}},
                {"id": "8_clubs", "rank": "8", "suit": "clubs", "kanji": "飛行機", "hiragana": "ひこうき", "romaji": "hikouki", "english": "airplane", "rhyme": "Flying high above the sea, it's Hikouki", "sentence": {"kanji": "飛行機で旅行します。", "romaji": "Hikouki de ryokou shimasu.", "english": "I travel by airplane."}},
                {"id": "9_clubs", "rank": "9", "suit": "clubs", "kanji": "自転車", "hiragana": "じてんしゃ", "romaji": "jitensha", "english": "bicycle", "rhyme": "Pedaling fast and wild and free, it's Jitensha", "sentence": {"kanji": "自転車で公園に行きます。", "romaji": "Jitensha de kouen ni ikimasu.", "english": "I go to the park by bicycle."}},
                {"id": "10_clubs", "rank": "10", "suit": "clubs", "kanji": "歩く", "hiragana": "あるく", "romaji": "aruku", "english": "walk", "rhyme": "Step by step so carefully, it's Aruku", "sentence": {"kanji": "ゆっくり歩くのが好きです。", "romaji": "Yukkuri aruku no ga suki desu.", "english": "I like to walk slowly."}},
                {"id": "jack_clubs", "rank": "J", "suit": "clubs", "kanji": "走る", "hiragana": "はしる", "romaji": "hashiru", "english": "run", "rhyme": "Fast and quick as quick can be, it's Hashiru", "sentence": {"kanji": "公園で走る練習をします。", "romaji": "Kouen de hashiru renshuu wo shimasu.", "english": "I practice running in the park."}},
                {"id": "queen_clubs", "rank": "Q", "suit": "clubs", "kanji": "泳ぐ", "hiragana": "およぐ", "romaji": "oyogu", "english": "swim", "rhyme": "Through the water wild and free, it's Oyogu", "sentence": {"kanji": "湖で泳ぐことにします。", "romaji": "Mizuumi de oyogu koto ni shimasu.", "english": "I decide to swim in the lake."}},
                {"id": "king_clubs", "rank": "K", "suit": "clubs", "kanji": "飛ぶ", "hiragana": "とぶ", "romaji": "tobu", "english": "fly", "rhyme": "High above for all to see, it's Tobu", "sentence": {"kanji": "鳥のように飛ぶ夢を見ます。", "romaji": "Tori no you ni tobu yume wo mimasu.", "english": "I dream of flying like a bird."}},
                {"id": "ace_spades", "rank": "A", "suit": "spades", "kanji": "人", "hiragana": "ひと", "romaji": "hito", "english": "person", "rhyme": "Walking tall for all to see, it's Hito", "sentence": {"kanji": "親切な人に出会います。", "romaji": "Shinsetsu na hito ni deaimasu.", "english": "I meet a kind person."}},
                {"id": "2_spades", "rank": "2", "suit": "spades", "kanji": "男", "hiragana": "おとこ", "romaji": "otoko", "english": "man", "rhyme": "Strong and brave as brave can be, it's Otoko", "sentence": {"kanji": "その男の人は漁師です。", "romaji": "Sono otoko no hito wa ryoushi desu.", "english": "That man is a fisherman."}},
                {"id": "3_spades", "rank": "3", "suit": "spades", "kanji": "女", "hiragana": "おんな", "romaji": "onna", "english": "woman", "rhyme": "Graceful, kind, and strong and free, it's Onna", "sentence": {"kanji": "美しい女の人が歌います。", "romaji": "Utsukushii onna no hito ga utaimasu.", "english": "A beautiful woman sings."}},
                {"id": "4_spades", "rank": "4", "suit": "spades", "kanji": "子供", "hiragana": "こども", "romaji": "kodomo", "english": "child", "rhyme": "Playing games so happily, it's Kodomo", "sentence": {"kanji": "子供たちが笑って遊びます。", "romaji": "Kodomo-tachi ga waratte asobimasu.", "english": "The children laugh and play."}},
                {"id": "5_spades", "rank": "5", "suit": "spades", "kanji": "友達", "hiragana": "ともだち", "romaji": "tomodachi", "english": "friend", "rhyme": "Always there for you and me, it's Tomodachi", "sentence": {"kanji": "新しい友達を作ります。", "romaji": "Atarashii tomodachi wo tsukurimasu.", "english": "I make new friends."}},
                {"id": "6_spades", "rank": "6", "suit": "spades", "kanji": "家族", "hiragana": "かぞく", "romaji": "kazoku", "english": "family", "rhyme": "Together strong as strong can be, it's Kazoku", "sentence": {"kanji": "家族と一緒に住みます。", "romaji": "Kazoku to issho ni sumimasu.", "english": "I live together with my family."}},
                {"id": "7_spades", "rank": "7", "suit": "spades", "kanji": "先生", "hiragana": "せんせい", "romaji": "sensei", "english": "teacher", "rhyme": "Wise and kind for all to see, it's Sensei", "sentence": {"kanji": "村の先生が本を読みます。", "romaji": "Mura no sensei ga hon wo yomimasu.", "english": "The village teacher reads a book."}},
                {"id": "8_spades", "rank": "8", "suit": "spades", "kanji": "学生", "hiragana": "がくせい", "romaji": "gakusei", "english": "student", "rhyme": "Learning new things happily, it's Gakusei", "sentence": {"kanji": "学生として勉強します。", "romaji": "Gakusei to shite benkyou shimasu.", "english": "I study as a student."}},
                {"id": "9_spades", "rank": "9", "suit": "spades", "kanji": "医者", "hiragana": "いしゃ", "romaji": "isha", "english": "doctor", "rhyme": "Healing all so carefully, it's Isha", "sentence": {"kanji": "町の医者が病気を治します。", "romaji": "Machi no isha ga byouki wo naoshimasu.", "english": "The town doctor cures illnesses."}},
                {"id": "10_spades", "rank": "10", "suit": "spades", "kanji": "料理人", "hiragana": "りょうりにん", "romaji": "ryourinin", "english": "cook", "rhyme": "Making food so tastily, it's Ryourinin", "sentence": {"kanji": "料理人が美味しい食事を作ります。", "romaji": "Ryourinin ga oishii shokuji wo tsukurimasu.", "english": "The cook makes delicious meals."}},
                {"id": "jack_spades", "rank": "J", "suit": "spades", "kanji": "警察官", "hiragana": "けいさつかん", "romaji": "keisatsukan", "english": "police officer", "rhyme": "Keeping safe our community, it's Keisatsukan", "sentence": {"kanji": "警察官が街を守ります。", "romaji": "Keisatsukan ga machi wo mamorimasu.", "english": "The police officer protects the town."}},
                {"id": "queen_spades", "rank": "Q", "suit": "spades", "kanji": "消防士", "hiragana": "しょうぼうし", "romaji": "shouboushi", "english": "firefighter", "rhyme": "Brave and strong for all to see, it's Shouboushi", "sentence": {"kanji": "消防士が火事を消します。", "romaji": "Shouboushi ga kaji wo keshimasu.", "english": "The firefighter puts out the fire."}},
                {"id": "king_spades", "rank": "K", "suit": "spades", "kanji": "王様", "hiragana": "おうさま", "romaji": "ousama", "english": "king", "rhyme": "Ruling fair for all to see, it's Ousama", "sentence": {"kanji": "王様が平和を守ります。", "romaji": "Ousama ga heiwa wo mamorimasu.", "english": "The king protects the peace."}}
            ];
        }
        
        // Always call displayPreGameCards after loading data
        this.displayPreGameCards();
    }

    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.cards && Array.isArray(data.cards)) {
                    // Validate and enhance the imported data
                    const validationResult = this.validateAndEnhanceCards(data.cards);
                    
                    this.cards = validationResult.cards;
                    this.displayPreGameCards();
                    
                    // Provide detailed feedback to the user
                    let message = 'Data imported successfully!';
                    if (validationResult.warnings.length > 0) {
                        message += '\n\nWarnings:\n' + validationResult.warnings.join('\n');
                    }
                    if (validationResult.enhancements.length > 0) {
                        message += '\n\nEnhancements applied:\n' + validationResult.enhancements.join('\n');
                    }
                    
                    alert(message);
                } else {
                    alert('Invalid file format. Please ensure the JSON has a "cards" array.');
                }
            } catch (error) {
                alert('Error parsing JSON file: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    // Batch Import Functionality
    showBatchImportModal() {
        document.getElementById('batchImportModal').style.display = 'block';
        this.resetBatchImportModal();
    }

    closeBatchImportModal() {
        document.getElementById('batchImportModal').style.display = 'none';
        this.resetBatchImportModal();
    }

    resetBatchImportModal() {
        document.getElementById('selectedFilesList').innerHTML = '';
        document.getElementById('maxCards').value = 52;
        document.getElementById('reassignRanksSuits').checked = true;
        document.getElementById('allowDuplicates').checked = false;
        document.getElementById('startBatchImport').disabled = true;
        document.getElementById('importProgress').style.display = 'none';
        this.selectedBatchFiles = [];
    }

    selectBatchFiles() {
        document.getElementById('batchFileInput').click();
    }

    handleBatchFileSelection(files) {
        this.selectedBatchFiles = Array.from(files);
        this.displaySelectedFiles();
        document.getElementById('startBatchImport').disabled = this.selectedBatchFiles.length === 0;
    }

    displaySelectedFiles() {
        const container = document.getElementById('selectedFilesList');
        container.innerHTML = '';
        
        if (this.selectedBatchFiles.length === 0) {
            container.innerHTML = '<p class="no-files">No files selected</p>';
            return;
        }

        const fileList = document.createElement('div');
        fileList.className = 'file-list';
        
        this.selectedBatchFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <span class="file-name">${file.name}</span>
                <span class="file-size">(${this.formatFileSize(file.size)})</span>
                <button class="remove-file-btn" onclick="game.removeBatchFile(${index})">❌</button>
            `;
            fileList.appendChild(fileItem);
        });
        
        container.appendChild(fileList);
        
        const summary = document.createElement('p');
        summary.className = 'files-summary';
        summary.textContent = `${this.selectedBatchFiles.length} file(s) selected`;
        container.appendChild(summary);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    removeBatchFile(index) {
        this.selectedBatchFiles.splice(index, 1);
        this.displaySelectedFiles();
        document.getElementById('startBatchImport').disabled = this.selectedBatchFiles.length === 0;
    }

    async startBatchImport() {
        if (this.selectedBatchFiles.length === 0) {
            alert('Please select at least one file to import.');
            return;
        }

        const maxCards = parseInt(document.getElementById('maxCards').value);
        const reassignRanksSuits = document.getElementById('reassignRanksSuits').checked;
        const allowDuplicates = document.getElementById('allowDuplicates').checked;

        // Show progress
        document.getElementById('importProgress').style.display = 'block';
        document.getElementById('startBatchImport').disabled = true;
        
        try {
            const result = await this.processBatchFiles(this.selectedBatchFiles, {
                maxCards,
                reassignRanksSuits,
                allowDuplicates
            });

            // Update the game with the new cards
            this.cards = result.cards;
            this.displayPreGameCards();
            
            // Close modal and show success message
            this.closeBatchImportModal();
            
            let message = `Batch import completed successfully!\n\n`;
            message += `Files processed: ${result.filesProcessed}\n`;
            message += `Total cards found: ${result.totalCardsFound}\n`;
            message += `Cards selected: ${result.cards.length}\n`;
            
            if (result.warnings.length > 0) {
                message += '\nWarnings:\n' + result.warnings.join('\n');
            }
            if (result.enhancements.length > 0) {
                message += '\nEnhancements applied:\n' + result.enhancements.join('\n');
            }
            
            alert(message);
            
        } catch (error) {
            alert('Error during batch import: ' + error.message);
            document.getElementById('startBatchImport').disabled = false;
        }
        
        document.getElementById('importProgress').style.display = 'none';
    }

    async processBatchFiles(files, options) {
        const allCards = [];
        const warnings = [];
        const enhancements = [];
        let filesProcessed = 0;
        let totalCardsFound = 0;

        // Process each file
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // Update progress
            const progress = ((i + 1) / files.length) * 50; // First 50% for file processing
            this.updateImportProgress(progress, `Processing ${file.name}...`);
            
            try {
                const fileCards = await this.readFileAsCards(file);
                if (fileCards && fileCards.length > 0) {
                    allCards.push(...fileCards);
                    totalCardsFound += fileCards.length;
                    filesProcessed++;
                    enhancements.push(`${file.name}: ${fileCards.length} cards loaded`);
                } else {
                    warnings.push(`${file.name}: No valid cards found`);
                }
            } catch (error) {
                warnings.push(`${file.name}: ${error.message}`);
            }
        }

        if (allCards.length === 0) {
            throw new Error('No valid cards found in any of the selected files.');
        }

        // Update progress
        this.updateImportProgress(60, 'Removing duplicates...');
        
        // Remove duplicates if requested
        let uniqueCards = allCards;
        if (!options.allowDuplicates) {
            uniqueCards = this.removeDuplicateCards(allCards);
            if (uniqueCards.length < allCards.length) {
                enhancements.push(`Removed ${allCards.length - uniqueCards.length} duplicate cards`);
            }
        }

        // Update progress
        this.updateImportProgress(70, 'Selecting cards...');
        
        // Randomly select cards up to maxCards
        let selectedCards = uniqueCards;
        if (uniqueCards.length > options.maxCards) {
            selectedCards = this.randomlySelectCards(uniqueCards, options.maxCards);
            enhancements.push(`Randomly selected ${options.maxCards} cards from ${uniqueCards.length} available`);
        }

        // Update progress
        this.updateImportProgress(80, 'Assigning ranks and suits...');
        
        // Reassign ranks and suits if requested
        if (options.reassignRanksSuits) {
            selectedCards = this.reassignRanksAndSuits(selectedCards);
            enhancements.push('Reassigned ranks and suits to selected cards');
        }

        // Update progress
        this.updateImportProgress(90, 'Validating cards...');
        
        // Validate and enhance the final card set
        const validationResult = this.validateAndEnhanceCards(selectedCards);
        warnings.push(...validationResult.warnings);
        enhancements.push(...validationResult.enhancements);

        // Update progress
        this.updateImportProgress(100, 'Import complete!');

        return {
            cards: validationResult.cards,
            filesProcessed,
            totalCardsFound,
            warnings,
            enhancements
        };
    }

    readFileAsCards(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.cards && Array.isArray(data.cards)) {
                        resolve(data.cards);
                    } else {
                        reject(new Error('Invalid file format - no cards array found'));
                    }
                } catch (error) {
                    reject(new Error('Invalid JSON format'));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    removeDuplicateCards(cards) {
        const seen = new Set();
        return cards.filter(card => {
            // Create a unique key based on kanji and romaji
            const key = `${card.kanji}-${card.romaji}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    randomlySelectCards(cards, maxCount) {
        const shuffled = [...cards];
        this.shuffleArray(shuffled);
        return shuffled.slice(0, maxCount);
    }

    reassignRanksAndSuits(cards) {
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        
        // Create a shuffled deck of rank-suit combinations
        const deckCombinations = [];
        for (const suit of suits) {
            for (const rank of ranks) {
                deckCombinations.push({ rank, suit });
            }
        }
        this.shuffleArray(deckCombinations);
        
        // Assign new ranks and suits to cards
        return cards.map((card, index) => {
            const combination = deckCombinations[index % deckCombinations.length];
            return {
                ...card,
                rank: combination.rank,
                suit: combination.suit,
                id: `${combination.rank.toLowerCase()}_${combination.suit}_${index}`
            };
        });
    }

    updateImportProgress(percentage, text) {
        document.getElementById('progressFill').style.width = `${percentage}%`;
        document.getElementById('progressText').textContent = text;
    }

    // Library functionality
    showLibraryModal() {
        document.getElementById('libraryModal').style.display = 'block';
        this.loadLibraryIndex();
    }

    closeLibraryModal() {
        document.getElementById('libraryModal').style.display = 'none';
    }

    async loadLibraryIndex() {
        const container = document.getElementById('libraryContent');
        container.innerHTML = '<p>Loading library...</p>';
        
        try {
            const response = await fetch('decks/index.json');
            if (!response.ok) {
                throw new Error('Library not found');
            }
            
            const index = await response.json();
            this.renderLibrary(index);
        } catch (error) {
            container.innerHTML = `
                <div class="library-section">
                    <h3>📚 Built-in Library</h3>
                    <p style="color: #666;">Library not found. Make sure the decks folder is available.</p>
                    <p style="color: #888; font-size: 0.9rem;">Expected at: decks/index.json</p>
                </div>
            `;
        }
    }

    renderLibrary(index) {
        const container = document.getElementById('libraryContent');
        
        let html = `
            <div class="library-section">
                <h3>📚 ${index.name || 'Available Decks'}</h3>
                <p style="color: #666; margin-bottom: 1rem;">
                    ${index.description || ''} 
                    ${index.totalCards ? `<br><strong>Total cards:</strong> ${index.totalCards}` : ''}
                </p>
                <div class="library-grid">
        `;
        
        if (index.decks && index.decks.length > 0) {
            index.decks.forEach((deck, idx) => {
                const isLoaded = this.isDeckLoaded(deck.filename);
                html += `
                    <div class="library-item ${isLoaded ? 'loaded' : ''}" 
                         onclick="game.loadDeckFromLibrary('${deck.filename}')">
                        <div class="library-item-name">${deck.name}</div>
                        <div class="library-item-count">${deck.cardCount} cards</div>
                        ${isLoaded ? '<div class="library-item-count" style="color: #4CAF50;">✓ Loaded</div>' : ''}
                    </div>
                `;
            });
        }
        
        html += `
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    }

    isDeckLoaded(filename) {
        // Check if this deck's cards are already in our cards array
        return this.cards.some(card => card.id && card.id.startsWith('rtk_'));
    }

    async loadDeckFromLibrary(filename) {
        try {
            const response = await fetch(`decks/${filename}`);
            if (!response.ok) {
                throw new Error('Failed to load deck');
            }
            
            const deck = await response.json();
            
            if (deck.cards && deck.cards.length > 0) {
                // Replace current cards with deck cards
                this.cards = deck.cards;
                this.displayCards = null; // Reset display cards
                this.displayPreGameCards();
                this.stopPreGameTimer();
                this.startPreGameTimer();
                
                alert(`Loaded: ${deck.name}\n${deck.cards.length} cards ready to study!`);
                this.closeLibraryModal();
            } else {
                alert('This deck contains no cards.');
            }
        } catch (error) {
            alert(`Error loading deck: ${error.message}`);
        }
    }


    validateAndEnhanceCards(cards) {
        const warnings = [];
        const enhancements = [];
        const validatedCards = [];

        cards.forEach((card, index) => {
            const cardNum = index + 1;
            
            // Check for required basic fields
            const requiredFields = ['id', 'kanji', 'hiragana', 'romaji', 'english', 'rhyme'];
            const missingFields = requiredFields.filter(field => !card[field]);
            
            if (missingFields.length > 0) {
                warnings.push(`Card ${cardNum}: Missing required fields: ${missingFields.join(', ')}`);
                return; // Skip this card if basic fields are missing
            }

            // Create a copy of the card to avoid modifying the original
            const validatedCard = { ...card };

            // Check for sentence data
            if (!card.sentence) {
                warnings.push(`Card ${cardNum} (${card.kanji}): No sentence data found. Story Mode and sentence features will not work for this card.`);
            } else {
                // Validate sentence structure
                const sentenceFields = ['kanji', 'romaji', 'english'];
                const missingSentenceFields = sentenceFields.filter(field => !card.sentence[field]);
                
                if (missingSentenceFields.length > 0) {
                    warnings.push(`Card ${cardNum} (${card.kanji}): Sentence missing fields: ${missingSentenceFields.join(', ')}`);
                } else {
                    // Sentence is complete
                    enhancements.push(`Card ${cardNum} (${card.kanji}): Sentence data validated successfully`);
                }
            }

            // Check for optional card game fields (rank, suit)
            if (!card.rank || !card.suit) {
                // Add default rank and suit if missing
                const defaultRanks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
                const defaultSuits = ['hearts', 'diamonds', 'clubs', 'spades'];
                
                if (!validatedCard.rank) {
                    validatedCard.rank = defaultRanks[index % defaultRanks.length];
                    enhancements.push(`Card ${cardNum}: Added default rank (${validatedCard.rank})`);
                }
                
                if (!validatedCard.suit) {
                    validatedCard.suit = defaultSuits[Math.floor(index / defaultRanks.length) % defaultSuits.length];
                    enhancements.push(`Card ${cardNum}: Added default suit (${validatedCard.suit})`);
                }
            }

            validatedCards.push(validatedCard);
        });

        // Summary statistics
        const totalCards = cards.length;
        const validCards = validatedCards.length;
        const cardsWithSentences = validatedCards.filter(card => card.sentence && 
            card.sentence.kanji && card.sentence.romaji && card.sentence.english).length;

        if (validCards < totalCards) {
            warnings.push(`${totalCards - validCards} cards were skipped due to missing required fields`);
        }

        enhancements.push(`Successfully processed ${validCards} cards`);
        enhancements.push(`${cardsWithSentences} cards have complete sentence data`);
        
        if (cardsWithSentences === 0) {
            warnings.push('No cards have sentence data. Story Mode and sentence features will not be available.');
        } else if (cardsWithSentences < validCards) {
            warnings.push(`Only ${cardsWithSentences} out of ${validCards} cards have sentence data. Some features may be limited.`);
        }

        return {
            cards: validatedCards,
            warnings,
            enhancements
        };
    }

    // Pre-game Screen
    displayPreGameCards() {
        const container = document.getElementById('cardPairsDisplay');
        container.innerHTML = '';

        // Use displayCards array if it exists (for scrambled order), otherwise use original cards array
        const cardsToDisplay = this.displayCards || this.cards;

        cardsToDisplay.forEach(card => {
            const pairDiv = document.createElement('div');
            pairDiv.className = 'card-pair';
            pairDiv.dataset.cardId = card.id;
            
            // Add selection functionality if in selection mode
            if (this.isCardSelectionMode) {
                pairDiv.classList.add('selectable');
                if (this.selectedCards.has(card.id)) {
                    pairDiv.classList.add('selected');
                }
                pairDiv.addEventListener('click', () => this.toggleCardSelection(card.id));
            }
            
            // Kanji card
            const kanjiCard = this.createPreGameCard(card, 'kanji');
            // Romaji card
            const romajiCard = this.createPreGameCard(card, 'romaji');
            
            pairDiv.appendChild(kanjiCard);
            pairDiv.appendChild(romajiCard);
            container.appendChild(pairDiv);
        });

        // Don't add click listeners immediately - they will be added when flip functionality is used
        // This prevents the cards from being cloned and replaced immediately, which was causing them to disappear
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
        
        // Always create a card back for flip functionality
        const cardBack = document.createElement('div');
        cardBack.className = 'card-face card-back';
        cardBack.innerHTML = '<div>?</div>';
        card.appendChild(cardBack);
        
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
        
        // Use selected cards if any are selected, otherwise use all cards
        const cardsToUse = this.getCardsForGame();
        
        // Create pairs: one kanji card and one romaji card for each data entry
        cardsToUse.forEach(cardData => {
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
        const sentenceDisplay = document.getElementById('celebrationSentence');
        const cardsDisplay = document.getElementById('celebrationCards');
        
        rhymeDisplay.textContent = cardData.rhyme;
        
        // Show sentence if available
        if (cardData.sentence) {
            this.displaySentence(sentenceDisplay, cardData.sentence);
            sentenceDisplay.style.display = 'block';
        } else {
            sentenceDisplay.style.display = 'none';
        }
        
        // Show the matched cards in celebration
        cardsDisplay.innerHTML = '';
        const kanjiCard = this.createCelebrationCard(cardData, 'kanji');
        const romajiCard = this.createCelebrationCard(cardData, 'romaji');
        cardsDisplay.appendChild(kanjiCard);
        cardsDisplay.appendChild(romajiCard);
        
        modal.style.display = 'block';
        
        // Auto-close after 5 seconds (increased for sentence reading)
        setTimeout(() => {
            modal.style.display = 'none';
        }, 5000);
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
        document.getElementById('gameModeScreen').classList.remove('active');
        document.getElementById('dragDropScreen').classList.remove('active');
        document.getElementById('gameScreen').classList.add('active');
        this.displayGameBoard();
        
        // Scroll to top to ensure the game is visible
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
        
        // Update sentence if available
        const sentenceDisplay = document.getElementById('reviewSentence');
        if (currentPair.sentence) {
            this.displaySentence(sentenceDisplay, currentPair.sentence);
            sentenceDisplay.style.display = 'block';
        } else {
            sentenceDisplay.style.display = 'none';
        }
        
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

    // Print Rhymes Only Functionality
    printRhymesOnly() {
        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        
        // Generate the print HTML for rhymes only
        const printHTML = this.generateRhymesOnlyHTML();
        
        // Write the HTML to the new window
        printWindow.document.write(printHTML);
        printWindow.document.close();
        
        // Wait for content to load, then print
        printWindow.onload = () => {
            printWindow.print();
        };
    }

    generateRhymesOnlyHTML() {
        const currentDate = new Date().toLocaleDateString();
        
        let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kanji Rhymes Study Sheet</title>
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
            line-height: 1.6;
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
        
        .rhymes-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .rhyme-item {
            background: linear-gradient(135deg, #FFD700, #FFA500);
            border: 2px solid #FF6B35;
            border-radius: 15px;
            padding: 20px;
            font-size: 1.4rem;
            font-style: italic;
            font-weight: 600;
            color: #4B0082;
            text-align: center;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            break-inside: avoid;
            page-break-inside: avoid;
        }
        
        .rhyme-number {
            font-size: 0.9rem;
            font-weight: normal;
            color: #666;
            margin-bottom: 10px;
            font-style: normal;
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
            .rhymes-container {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .rhyme-item {
                break-inside: avoid;
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="print-header">
        <h1>🎵 Kanji Rhymes Study Sheet</h1>
        <p>Rhyming Phrases for Memory Practice</p>
        <p>Generated on: ${currentDate} • Total Rhymes: ${this.cards.length}</p>
    </div>
    
    <div class="study-tips">
        <h3>🎯 How to Use These Rhymes:</h3>
        <ul>
            <li><strong>Read aloud</strong> - Say each rhyme out loud to help with pronunciation</li>
            <li><strong>Visualize</strong> - Create mental images that connect to the rhyme</li>
            <li><strong>Practice regularly</strong> - Review these rhymes daily for best retention</li>
            <li><strong>Test yourself</strong> - Cover the rhymes and try to recall them from memory</li>
            <li><strong>Make connections</strong> - Link the rhymes to the actual kanji meanings</li>
        </ul>
    </div>
    
    <div class="rhymes-container">`;

        // Generate each rhyme
        this.cards.forEach((card, index) => {
            html += `
        <div class="rhyme-item">
            <div class="rhyme-number">#${index + 1}</div>
            "${card.rhyme}"
        </div>`;
        });

        html += `
    </div>
    
    <div class="print-footer">
        <p>🎵 Use these rhymes to build strong memory connections with your kanji!</p>
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
        document.getElementById('storyScreen').classList.remove('active');
        document.getElementById('focusedReadingScreen').classList.remove('active');
        document.getElementById('listenSentencesScreen').classList.remove('active');
    }

    // Drag & Drop Mode
    startDragDropMode() {
        this.isGameActive = true;
        this.attempts = 0;
        this.score = 1000;
        this.matchedPairs = [];
        this.dragDropMatches = new Set();
        this.isEnglishHidden = false;
        this.isRhymeHidden = false;
        
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

        // Use selected cards if any are selected, otherwise use all cards
        const cardsToUse = this.getCardsForGame();
        cardsToUse.forEach(card => {
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

        // Add sentence if available
        let sentence = null;
        if (cardData.sentence) {
            sentence = document.createElement('div');
            sentence.className = 'target-sentence';
            this.displaySentence(sentence, cardData.sentence);
        }

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
        if (sentence) {
            targetCard.appendChild(sentence);
        }
        targetCard.appendChild(quickAnswerBtn);

        return targetCard;
    }

    displaySourceCards() {
        const container = document.getElementById('sourceCardsContainer');
        container.innerHTML = '';

        // Use selected cards if any are selected, otherwise use all cards
        const cardsToUse = this.getCardsForGame();
        // Shuffle the cards for the source area
        const shuffledCards = [...cardsToUse];
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

    // Toggle English visibility in drag and drop mode
    toggleEnglishVisibility() {
        this.isEnglishHidden = !this.isEnglishHidden;
        
        const toggleBtn = document.getElementById('hideEnglishBtn');
        const englishElements = document.querySelectorAll('.target-english');
        
        if (this.isEnglishHidden) {
            // Hide English meanings
            englishElements.forEach(element => {
                element.classList.add('hidden');
            });
            toggleBtn.textContent = '👁️ Show English';
            toggleBtn.classList.add('active');
        } else {
            // Show English meanings
            englishElements.forEach(element => {
                element.classList.remove('hidden');
            });
            toggleBtn.textContent = '🙈 Hide English';
            toggleBtn.classList.remove('active');
        }
    }

    // Toggle rhyme visibility in drag and drop mode
    toggleRhymeVisibility() {
        this.isRhymeHidden = !this.isRhymeHidden;
        
        const toggleBtn = document.getElementById('hideRhymeBtn');
        const rhymeElements = document.querySelectorAll('.target-rhyme');
        
        if (this.isRhymeHidden) {
            // Hide rhymes
            rhymeElements.forEach(element => {
                element.classList.add('hidden');
            });
            toggleBtn.textContent = '🎵 Show Rhymes';
            toggleBtn.classList.add('active');
        } else {
            // Show rhymes
            rhymeElements.forEach(element => {
                element.classList.remove('hidden');
            });
            toggleBtn.textContent = '🎵 Hide Rhymes';
            toggleBtn.classList.remove('active');
        }
    }

    // Toggle sentence visibility in drag and drop mode
    toggleSentenceVisibility() {
        this.isSentenceHidden = !this.isSentenceHidden;
        
        const toggleBtn = document.getElementById('hideSentencesBtn');
        const sentenceElements = document.querySelectorAll('.target-sentence');
        
        if (this.isSentenceHidden) {
            // Hide sentences
            sentenceElements.forEach(element => {
                element.classList.add('hidden');
            });
            toggleBtn.textContent = '📝 Show Sentences';
            toggleBtn.classList.add('active');
        } else {
            // Show sentences
            sentenceElements.forEach(element => {
                element.classList.remove('hidden');
            });
            toggleBtn.textContent = '📝 Hide Sentences';
            toggleBtn.classList.remove('active');
        }
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

    // Card Flip Functionality for Pre-game Screen
    flipAllRomajiCards() {
        const flipBtn = document.getElementById('flipRomajiBtn');
        const isCurrentlyHidden = flipBtn.textContent.includes('Show');
        
        const cardPairs = document.querySelectorAll('.card-pair');
        cardPairs.forEach(pair => {
            const cards = pair.querySelectorAll('.playing-card');
            cards.forEach(card => {
                const content = card.querySelector('.card-content');
                if (content && content.querySelector('.romaji-content')) {
                    if (isCurrentlyHidden) {
                        // Show all romaji/english cards
                        card.classList.remove('flipped-back');
                    } else {
                        // Hide all romaji/english cards
                        card.classList.add('flipped-back');
                        
                        // Create card back if it doesn't exist
                        if (!card.querySelector('.card-back')) {
                            const cardBack = document.createElement('div');
                            cardBack.className = 'card-face card-back';
                            cardBack.innerHTML = '<div>?</div>';
                            card.appendChild(cardBack);
                        }
                    }
                    
                    // Add click event listener for individual card toggling
                    this.addCardClickListener(card);
                }
            });
        });
        
        // Update button text to indicate current state
        if (isCurrentlyHidden) {
            flipBtn.textContent = '🔄 Hide Romaji/English';
        } else {
            flipBtn.textContent = '👁️ Show Romaji/English';
        }
    }

    flipAllKanjiCards() {
        const flipBtn = document.getElementById('flipKanjiBtn');
        const isCurrentlyHidden = flipBtn.textContent.includes('Show');
        
        const cardPairs = document.querySelectorAll('.card-pair');
        cardPairs.forEach(pair => {
            const cards = pair.querySelectorAll('.playing-card');
            cards.forEach(card => {
                const content = card.querySelector('.card-content');
                if (content && content.querySelector('.kanji-content')) {
                    if (isCurrentlyHidden) {
                        // Show all kanji cards
                        card.classList.remove('flipped-back');
                    } else {
                        // Hide all kanji cards
                        card.classList.add('flipped-back');
                        
                        // Create card back if it doesn't exist
                        if (!card.querySelector('.card-back')) {
                            const cardBack = document.createElement('div');
                            cardBack.className = 'card-face card-back';
                            cardBack.innerHTML = '<div>?</div>';
                            card.appendChild(cardBack);
                        }
                    }
                    
                    // Add click event listener for individual card toggling
                    this.addCardClickListener(card);
                }
            });
        });
        
        // Update button text to indicate current state
        if (isCurrentlyHidden) {
            flipBtn.textContent = '🔄 Hide Kanji';
        } else {
            flipBtn.textContent = '👁️ Show Kanji';
        }
    }

    addCardClickListener(card) {
        // Remove any existing click listeners to avoid duplicates
        const newCard = card.cloneNode(true);
        card.parentNode.replaceChild(newCard, card);
        
        // Add click event to toggle the card back and forth
        newCard.addEventListener('click', () => {
            if (newCard.classList.contains('flipped-back')) {
                // Card is currently hidden - show it
                newCard.classList.remove('flipped-back');
                // Add a temporary highlight effect
                newCard.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
                setTimeout(() => {
                    newCard.style.boxShadow = '';
                }, 1000);
            } else {
                // Card is currently visible - hide it
                newCard.classList.add('flipped-back');
                
                // Create card back if it doesn't exist
                if (!newCard.querySelector('.card-back')) {
                    const cardBack = document.createElement('div');
                    cardBack.className = 'card-face card-back';
                    cardBack.innerHTML = '<div>?</div>';
                    newCard.appendChild(cardBack);
                }
            }
        });
    }

    resetAllCardFlips() {
        const cardPairs = document.querySelectorAll('.card-pair');
        cardPairs.forEach(pair => {
            const cards = pair.querySelectorAll('.playing-card');
            cards.forEach(card => {
                // Remove the flipped-back class to show front again
                card.classList.remove('flipped-back');
                // Remove any click event listeners by cloning the card
                const newCard = card.cloneNode(true);
                card.parentNode.replaceChild(newCard, card);
            });
        });
        
        // Reset button texts
        document.getElementById('flipRomajiBtn').textContent = '🔄 Hide Romaji/English';
        document.getElementById('flipKanjiBtn').textContent = '🔄 Hide Kanji';
        document.getElementById('hideHiraganaBtn').textContent = '👁️ Hide Hiragana';
        
        // Reset hiragana hidden state
        this.isHiraganaHidden = false;
        this.applyHiraganaVisibility();
    }

    // Hide Hiragana Functionality for Pre-game Screen
    toggleHiraganaVisibility() {
        this.isHiraganaHidden = !this.isHiraganaHidden;
        
        const toggleBtn = document.getElementById('hideHiraganaBtn');
        
        // Update button text to indicate current state
        if (this.isHiraganaHidden) {
            toggleBtn.textContent = '👁️ Show Hiragana';
        } else {
            toggleBtn.textContent = '🙈 Hide Hiragana';
        }
        
        // Apply the visibility change
        this.applyHiraganaVisibility();
    }

    applyHiraganaVisibility() {
        const hiraganaElements = document.querySelectorAll('.card-pair .hiragana');
        
        hiraganaElements.forEach(element => {
            if (this.isHiraganaHidden) {
                element.classList.add('hidden');
            } else {
                element.classList.remove('hidden');
            }
        });
    }

    // Card Scramble Functionality for Pre-game Screen
    scrambleCardOrder() {
        // Store current flip states before scrambling
        const romajiFlipState = document.getElementById('flipRomajiBtn').textContent.includes('Show');
        const kanjiFlipState = document.getElementById('flipKanjiBtn').textContent.includes('Show');
        
        // Create a copy of the cards array and shuffle it for display purposes only
        this.displayCards = [...this.cards];
        this.shuffleArray(this.displayCards);
        
        // Redisplay the cards in the new scrambled order
        this.displayPreGameCards();
        
        // Restore flip states after scrambling
        if (romajiFlipState) {
            // Romaji cards were hidden, hide them again
            const cardPairs = document.querySelectorAll('.card-pair');
            cardPairs.forEach(pair => {
                const cards = pair.querySelectorAll('.playing-card');
                cards.forEach(card => {
                    const content = card.querySelector('.card-content');
                    if (content && content.querySelector('.romaji-content')) {
                        card.classList.add('flipped-back');
                        
                        // Create card back if it doesn't exist
                        if (!card.querySelector('.card-back')) {
                            const cardBack = document.createElement('div');
                            cardBack.className = 'card-face card-back';
                            cardBack.innerHTML = '<div>?</div>';
                            card.appendChild(cardBack);
                        }
                        
                        // Add click event listener for individual card toggling
                        this.addCardClickListener(card);
                    }
                });
            });
            document.getElementById('flipRomajiBtn').textContent = '👁️ Show Romaji/English';
        }
        
        if (kanjiFlipState) {
            // Kanji cards were hidden, hide them again
            const cardPairs = document.querySelectorAll('.card-pair');
            cardPairs.forEach(pair => {
                const cards = pair.querySelectorAll('.playing-card');
                cards.forEach(card => {
                    const content = card.querySelector('.card-content');
                    if (content && content.querySelector('.kanji-content')) {
                        card.classList.add('flipped-back');
                        
                        // Create card back if it doesn't exist
                        if (!card.querySelector('.card-back')) {
                            const cardBack = document.createElement('div');
                            cardBack.className = 'card-face card-back';
                            cardBack.innerHTML = '<div>?</div>';
                            card.appendChild(cardBack);
                        }
                        
                        // Add click event listener for individual card toggling
                        this.addCardClickListener(card);
                    }
                });
            });
            document.getElementById('flipKanjiBtn').textContent = '👁️ Show Kanji';
        }
        
        // Preserve any existing selection states
        this.updateCardSelectionState();
        
        // Maintain hiragana hidden state after scramble
        this.applyHiraganaVisibility();
    }

    // Card Selection Functionality
    toggleCardSelectionMode() {
        this.isCardSelectionMode = !this.isCardSelectionMode;
        
        const toggleBtn = document.getElementById('toggleCardSelectionBtn');
        const resetBtn = document.getElementById('resetCardSelectionBtn');
        const statusDiv = document.getElementById('selectionStatus');
        
        if (this.isCardSelectionMode) {
            // Entering selection mode
            toggleBtn.textContent = '✅ Finish Selection';
            toggleBtn.classList.add('active');
            resetBtn.style.display = 'inline-block';
            statusDiv.style.display = 'inline-block';
            this.updateSelectionStatus();
        } else {
            // Exiting selection mode
            toggleBtn.textContent = '⭐ Select Specific Cards';
            toggleBtn.classList.remove('active');
            resetBtn.style.display = 'none';
            statusDiv.style.display = 'none';
        }
        
        // Update selection functionality without regenerating cards to preserve flip states
        this.updateCardSelectionState();
    }

    toggleCardSelection(cardId) {
        if (!this.isCardSelectionMode) return;
        
        if (this.selectedCards.has(cardId)) {
            this.selectedCards.delete(cardId);
        } else {
            this.selectedCards.add(cardId);
        }
        
        // Update the visual state of the card
        const cardPair = document.querySelector(`[data-card-id="${cardId}"]`);
        if (cardPair) {
            if (this.selectedCards.has(cardId)) {
                cardPair.classList.add('selected');
            } else {
                cardPair.classList.remove('selected');
            }
        }
        
        this.updateSelectionStatus();
    }

    updateSelectionStatus() {
        const selectedCount = document.getElementById('selectedCount');
        selectedCount.textContent = this.selectedCards.size;
    }

    resetCardSelection() {
        this.selectedCards.clear();
        this.updateSelectionStatus();
        
        // Remove selected class from all cards
        const cardPairs = document.querySelectorAll('.card-pair');
        cardPairs.forEach(pair => {
            pair.classList.remove('selected');
        });
        
        // Exit selection mode
        this.isCardSelectionMode = false;
        const toggleBtn = document.getElementById('toggleCardSelectionBtn');
        const resetBtn = document.getElementById('resetCardSelectionBtn');
        const statusDiv = document.getElementById('selectionStatus');
        
        toggleBtn.textContent = '⭐ Select Specific Cards';
        toggleBtn.classList.remove('active');
        resetBtn.style.display = 'none';
        statusDiv.style.display = 'none';
        
        // Refresh the card display
        this.displayPreGameCards();
    }

    updateCardSelectionState() {
        // Update existing card pairs without regenerating them to preserve flip states
        const cardPairs = document.querySelectorAll('.card-pair');
        cardPairs.forEach(pair => {
            const cardId = pair.dataset.cardId;
            
            if (this.isCardSelectionMode) {
                // Add selection functionality
                pair.classList.add('selectable');
                if (this.selectedCards.has(cardId)) {
                    pair.classList.add('selected');
                }
                
                // Remove existing click listeners to avoid duplicates
                const newPair = pair.cloneNode(true);
                pair.parentNode.replaceChild(newPair, pair);
                
                // Add selection click listener
                newPair.addEventListener('click', () => this.toggleCardSelection(cardId));
            } else {
                // Remove selection functionality
                pair.classList.remove('selectable', 'selected');
                
                // Remove click listeners by cloning, but preserve flip functionality
                const newPair = pair.cloneNode(true);
                pair.parentNode.replaceChild(newPair, pair);
                
                // Re-add individual card flip listeners for cards that were previously flipped
                const cards = newPair.querySelectorAll('.playing-card');
                cards.forEach(card => {
                    // Check if this card was previously set up for flipping by looking for:
                    // 1. Cards that have a card-back element, OR
                    // 2. Cards that have the flipped-back class (indicating they were hidden)
                    const hasCardBack = card.querySelector('.card-back');
                    const wasFlipped = card.classList.contains('flipped-back');
                    
                    if (hasCardBack || wasFlipped) {
                        // Ensure card back exists if it was flipped
                        if (wasFlipped && !hasCardBack) {
                            const cardBack = document.createElement('div');
                            cardBack.className = 'card-face card-back';
                            cardBack.innerHTML = '<div>?</div>';
                            card.appendChild(cardBack);
                        }
                        this.addCardClickListener(card);
                    }
                });
            }
        });
    }

    getCardsForGame() {
        // Use displayCards (scrambled order) if it exists, otherwise use original cards
        const cardsToUse = this.displayCards || this.cards;
        
        // If cards are selected, use only those cards (but maintain scrambled order if applicable)
        if (this.selectedCards.size > 0) {
            return cardsToUse.filter(card => this.selectedCards.has(card.id));
        }
        // Otherwise, use all cards (in scrambled order if applicable)
        return cardsToUse;
    }

    // Sentence Display Functionality
    displaySentence(container, sentence) {
        container.innerHTML = '';
        
        const kanjiDiv = document.createElement('div');
        kanjiDiv.className = 'sentence-kanji';
        kanjiDiv.textContent = sentence.kanji;
        
        const romajiDiv = document.createElement('div');
        romajiDiv.className = 'sentence-romaji';
        romajiDiv.textContent = sentence.romaji;
        
        const englishDiv = document.createElement('div');
        englishDiv.className = 'sentence-english';
        englishDiv.textContent = sentence.english;
        
        container.appendChild(kanjiDiv);
        container.appendChild(romajiDiv);
        container.appendChild(englishDiv);
    }

    // Sentence Toggle Functionality for Celebration Modal
    toggleCelebrationSentenceKanji() {
        const kanjiElements = document.querySelectorAll('#celebrationSentence .sentence-kanji');
        const toggleBtn = document.getElementById('toggleSentenceKanji');
        
        kanjiElements.forEach(element => {
            element.classList.toggle('hidden');
        });
        
        if (toggleBtn.classList.contains('hidden')) {
            toggleBtn.classList.remove('hidden');
            toggleBtn.textContent = '👁️ Kanji';
        } else {
            toggleBtn.classList.add('hidden');
            toggleBtn.textContent = '🙈 Kanji';
        }
    }

    toggleCelebrationSentenceRomaji() {
        const romajiElements = document.querySelectorAll('#celebrationSentence .sentence-romaji');
        const toggleBtn = document.getElementById('toggleSentenceRomaji');
        
        romajiElements.forEach(element => {
            element.classList.toggle('hidden');
        });
        
        if (toggleBtn.classList.contains('hidden')) {
            toggleBtn.classList.remove('hidden');
            toggleBtn.textContent = '👁️ Romaji';
        } else {
            toggleBtn.classList.add('hidden');
            toggleBtn.textContent = '🙈 Romaji';
        }
    }

    toggleCelebrationSentenceEnglish() {
        const englishElements = document.querySelectorAll('#celebrationSentence .sentence-english');
        const toggleBtn = document.getElementById('toggleSentenceEnglish');
        
        englishElements.forEach(element => {
            element.classList.toggle('hidden');
        });
        
        if (toggleBtn.classList.contains('hidden')) {
            toggleBtn.classList.remove('hidden');
            toggleBtn.textContent = '👁️ English';
        } else {
            toggleBtn.classList.add('hidden');
            toggleBtn.textContent = '🙈 English';
        }
    }

    // Review Modal Sentence Toggle Functionality
    toggleReviewSentenceKanji() {
        const kanjiElements = document.querySelectorAll('#reviewSentence .sentence-kanji');
        const toggleBtn = document.getElementById('reviewToggleSentenceKanji');
        
        kanjiElements.forEach(element => {
            element.classList.toggle('hidden');
        });
        
        if (toggleBtn.classList.contains('hidden')) {
            toggleBtn.classList.remove('hidden');
            toggleBtn.textContent = '👁️ Kanji';
        } else {
            toggleBtn.classList.add('hidden');
            toggleBtn.textContent = '🙈 Kanji';
        }
    }

    toggleReviewSentenceRomaji() {
        const romajiElements = document.querySelectorAll('#reviewSentence .sentence-romaji');
        const toggleBtn = document.getElementById('reviewToggleSentenceRomaji');
        
        romajiElements.forEach(element => {
            element.classList.toggle('hidden');
        });
        
        if (toggleBtn.classList.contains('hidden')) {
            toggleBtn.classList.remove('hidden');
            toggleBtn.textContent = '👁️ Romaji';
        } else {
            toggleBtn.classList.add('hidden');
            toggleBtn.textContent = '🙈 Romaji';
        }
    }

    toggleReviewSentenceEnglish() {
        const englishElements = document.querySelectorAll('#reviewSentence .sentence-english');
        const toggleBtn = document.getElementById('reviewToggleSentenceEnglish');
        
        englishElements.forEach(element => {
            element.classList.toggle('hidden');
        });
        
        if (toggleBtn.classList.contains('hidden')) {
            toggleBtn.classList.remove('hidden');
            toggleBtn.textContent = '👁️ English';
        } else {
            toggleBtn.classList.add('hidden');
            toggleBtn.textContent = '🙈 English';
        }
    }

    // Print Sentences with Options Functionality
    printSentencesWithOptions() {
        // Get sentence hiding settings
        const sentenceSettings = {
            hideRomaji: document.getElementById('hideSentencesRomaji').checked,
            hideEnglish: document.getElementById('hideSentencesEnglish').checked
        };

        // Close the modal
        this.closePrintClozeModal();

        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        
        // Generate the print HTML with sentence settings
        const printHTML = this.generateSentencesOnlyHTML(sentenceSettings);
        
        // Write the HTML to the new window
        printWindow.document.write(printHTML);
        printWindow.document.close();
        
        // Wait for content to load, then print
        printWindow.onload = () => {
            printWindow.print();
        };
    }

    // Print Sentences Only Functionality
    printSentencesOnly() {
        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        
        // Generate the print HTML for sentences only
        const printHTML = this.generateSentencesOnlyHTML();
        
        // Write the HTML to the new window
        printWindow.document.write(printHTML);
        printWindow.document.close();
        
        // Wait for content to load, then print
        printWindow.onload = () => {
            printWindow.print();
        };
    }

    generateSentencesOnlyHTML(sentenceSettings = null) {
        const currentDate = new Date().toLocaleDateString();
        const isHidingMode = sentenceSettings !== null;
        
        let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kanji Sentences Study Sheet</title>
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
            line-height: 1.6;
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
        
        .sentences-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .sentence-item {
            background: rgba(255, 255, 255, 0.9);
            border: 2px solid #74b9ff;
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            break-inside: avoid;
            page-break-inside: avoid;
        }
        
        .sentence-number {
            font-size: 0.9rem;
            font-weight: bold;
            color: #1e3c72;
            margin-bottom: 10px;
        }
        
        .word-definition {
            background: #e8f4fd;
            border: 1px solid #74b9ff;
            border-radius: 8px;
            padding: 10px;
            margin-bottom: 12px;
            font-size: 0.95rem;
            color: #2d3436;
        }
        
        .word-definition strong {
            color: #1e3c72;
        }
        
        .sentence-kanji {
            font-size: 1.4rem;
            font-weight: bold;
            color: #1e3c72;
            margin-bottom: 8px;
            font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'MS Gothic', sans-serif;
        }
        
        .sentence-romaji {
            font-size: 1.1rem;
            color: #636e72;
            margin-bottom: 8px;
            font-style: italic;
        }
        
        .sentence-english {
            font-size: 1rem;
            color: #2d3436;
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
            .sentences-container {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .sentence-item {
                break-inside: avoid;
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="print-header">
        <h1>📝 Kanji Sentences Study Sheet</h1>
        <p>Example Sentences with Definitions for Context Practice</p>
        <p>Generated on: ${currentDate} • Total Sentences: ${this.cards.filter(card => card.sentence).length}</p>
    </div>
    
    <div class="study-tips">
        <h3>📚 How to Use These Sentences:</h3>
        <ul>
            <li><strong>Read aloud</strong> - Practice pronunciation by reading the sentences out loud</li>
            <li><strong>Cover sections</strong> - Hide different parts to test your understanding</li>
            <li><strong>Practice writing</strong> - Write out the kanji sentences from memory</li>
            <li><strong>Make connections</strong> - Link the sentences to the vocabulary words</li>
            <li><strong>Create variations</strong> - Try making your own sentences with the same words</li>
        </ul>
    </div>
    
    <div class="sentences-container">`;

        // Generate each sentence
        let sentenceCount = 0;
        this.cards.forEach((card) => {
            if (card.sentence) {
                sentenceCount++;
                html += `
        <div class="sentence-item">
            <div class="sentence-number">#${sentenceCount} - ${card.kanji} (${card.romaji})</div>
            <div class="word-definition"><strong>Definition:</strong> ${card.english}</div>
            <div class="sentence-kanji">${card.sentence.kanji}</div>
            ${isHidingMode && sentenceSettings.hideRomaji ? 
                '<div class="sentence-romaji">_____</div>' : 
                `<div class="sentence-romaji">${card.sentence.romaji}</div>`}
            ${isHidingMode && sentenceSettings.hideEnglish ? 
                '<div class="sentence-english">_____</div>' : 
                `<div class="sentence-english">${card.sentence.english}</div>`}
        </div>`;
            }
        });

        html += `
    </div>
    
    <div class="print-footer">
        <p>📝 Use these sentences to understand kanji in context!</p>
        <p>Generated by Kanji Card Concentration Game</p>
    </div>
</body>
</html>`;

        return html;
    }

    // Print Combined (Rhymes + Sentences) Functionality
    printCombined() {
        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        
        // Generate the print HTML for combined content
        const printHTML = this.generateCombinedHTML();
        
        // Write the HTML to the new window
        printWindow.document.write(printHTML);
        printWindow.document.close();
        
        // Wait for content to load, then print
        printWindow.onload = () => {
            printWindow.print();
        };
    }

    // Big Kanji Print Modal Functionality
    showBigKanjiPrintModal() {
        document.getElementById('bigKanjiPrintModal').style.display = 'block';
    }

    closeBigKanjiPrintModal() {
        document.getElementById('bigKanjiPrintModal').style.display = 'none';
    }

    printBigKanji() {
        // Get the selected mode
        const twoPageMode = document.getElementById('twoPageMode').checked;
        const singlePageMode = document.getElementById('singlePageMode').checked;
        
        // Close the modal
        this.closeBigKanjiPrintModal();
        
        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        
        // Generate the appropriate print HTML
        let printHTML;
        if (twoPageMode) {
            printHTML = this.generateBigKanjiTwoPageHTML();
        } else {
            printHTML = this.generateBigKanjiSinglePageHTML();
        }
        
        // Write the HTML to the new window
        printWindow.document.write(printHTML);
        printWindow.document.close();
        
        // Wait for content to load, then print
        printWindow.onload = () => {
            printWindow.print();
        };
    }

    generateBigKanjiTwoPageHTML() {
        const currentDate = new Date().toLocaleDateString();
        
        // Get user-selected kanji size and line spacing
        const kanjiSize = document.getElementById('kanjiSizeSlider').value;
        const lineSpacing = document.getElementById('lineSpacingSlider').value;
        
        // Calculate font sizes based on user selection
        const baseFontSize = 20; // Base size in rem for better scaling
        const adjustedFontSize = (baseFontSize * kanjiSize) / 100;
        const adjustedLineHeight = Math.max(0.8, lineSpacing / 100); // Minimum line height to prevent overlap
        
        let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Big Kanji Study Sheets - Two Page Mode</title>
    <style>
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
        
        body {
            font-family: 'Arial', 'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'Takao', 'IPAexGothic', 'IPAPGothic', 'VL PGothic', 'Noto Sans CJK JP', sans-serif;
            margin: 0;
            padding: 0;
            background: white;
            color: black;
        }
        
        .page {
            width: 100%;
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            page-break-after: always;
            padding: 2rem;
            box-sizing: border-box;
            position: relative;
            background: white;
        }
        
        .giant-kanji {
            font-size: ${adjustedFontSize}rem;
            font-weight: bold;
            color: black;
            font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'MS Gothic', 'Takao', 'IPAexGothic', 'IPAPGothic', 'VL PGothic', 'Noto Sans CJK JP', 'Arial Unicode MS', sans-serif;
            line-height: ${adjustedLineHeight};
            margin: 0;
        }
        
        .card-number {
            position: absolute;
            top: 2rem;
            right: 2rem;
            font-size: 2rem;
            font-weight: bold;
            color: black;
            background: white;
            padding: 1rem 1.5rem;
            border: 2px solid black;
        }
        
        .info-content {
            max-width: 900px;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .hiragana-display {
            font-size: 6rem;
            font-weight: bold;
            color: black;
            margin: 1.5rem 0;
            font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'MS Gothic', sans-serif;
        }
        
        .romaji-display {
            font-size: 5rem;
            font-weight: bold;
            color: black;
            margin: 1.5rem 0;
        }
        
        .english-display {
            font-size: 4rem;
            color: black;
            margin: 1.5rem 0;
            font-style: italic;
        }
        
        .rhyme-display {
            background: white;
            border: 4px solid black;
            padding: 2rem;
            font-size: 2.5rem;
            font-style: italic;
            font-weight: 600;
            color: black;
            margin: 2rem 0;
            max-width: 100%;
            word-wrap: break-word;
        }
        
        .sentence-display {
            background: white;
            border: 4px solid black;
            padding: 2rem;
            margin: 2rem 0;
            max-width: 100%;
        }
        
        .sentence-kanji {
            font-size: 3rem;
            font-weight: bold;
            color: black;
            margin-bottom: 1rem;
            font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'MS Gothic', sans-serif;
            word-wrap: break-word;
        }
        
        .sentence-romaji {
            font-size: 2.2rem;
            color: black;
            margin-bottom: 1rem;
            font-style: italic;
            word-wrap: break-word;
        }
        
        .sentence-english {
            font-size: 2rem;
            color: black;
            word-wrap: break-word;
        }
        
        @media print {
            .page {
                width: 100%;
                height: 100vh;
                margin: 0;
                padding: 1.5rem;
            }
            
            .giant-kanji {
                font-size: ${adjustedFontSize}rem;
            }
            
            .card-number {
                font-size: 1.5rem;
                top: 1rem;
                right: 1rem;
                padding: 0.5rem 1rem;
            }
            
            .hiragana-display {
                font-size: 5rem;
            }
            
            .romaji-display {
                font-size: 4rem;
            }
            
            .english-display {
                font-size: 3rem;
            }
            
            .rhyme-display {
                font-size: 2rem;
                padding: 1.5rem;
            }
            
            .sentence-kanji {
                font-size: 2.5rem;
            }
            
            .sentence-romaji {
                font-size: 1.8rem;
            }
            
            .sentence-english {
                font-size: 1.6rem;
            }
        }
    </style>
</head>
<body>`;

        // Generate pages for each card
        this.cards.forEach((card, index) => {
            // Kanji page (front)
            html += `
    <div class="page">
        <div class="card-number">Card ${index + 1} of ${this.cards.length}</div>
        <div class="giant-kanji">${card.kanji}</div>
    </div>`;
            
            // Info page (back)
            html += `
    <div class="page">
        <div class="card-number">Card ${index + 1} of ${this.cards.length}</div>
        <div class="info-content">
            <div class="hiragana-display">${card.hiragana}</div>
            <div class="romaji-display">${card.romaji}</div>
            <div class="english-display">${card.english}</div>
            <div class="rhyme-display">"${card.rhyme}"</div>`;
            
            if (card.sentence) {
                html += `
            <div class="sentence-display">
                <div class="sentence-kanji">${card.sentence.kanji}</div>
                <div class="sentence-romaji">${card.sentence.romaji}</div>
                <div class="sentence-english">${card.sentence.english}</div>
            </div>`;
            }
            
            html += `
        </div>
    </div>`;
        });

        html += `
</body>
</html>`;

        return html;
    }

    generateBigKanjiSinglePageHTML() {
        const currentDate = new Date().toLocaleDateString();
        
        // Get user-selected kanji size and line spacing
        const kanjiSize = document.getElementById('kanjiSizeSlider').value;
        const lineSpacing = document.getElementById('lineSpacingSlider').value;
        
        // Calculate font sizes based on user selection
        const baseFontSize = 12; // Base size in rem for single page mode
        const adjustedFontSize = (baseFontSize * kanjiSize) / 100;
        const adjustedLineHeight = Math.max(0.8, lineSpacing / 100); // Minimum line height to prevent overlap
        
        let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Big Kanji Study Sheets - Single Page Mode</title>
    <style>
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
        
        body {
            font-family: 'Arial', 'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'Takao', 'IPAexGothic', 'IPAPGothic', 'VL PGothic', 'Noto Sans CJK JP', sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
            color: black;
        }
        
        .single-page {
            width: 100vw;
            height: 100vh;
            display: flex;
            page-break-after: always;
            padding: 2rem;
            box-sizing: border-box;
            gap: 3rem;
            background: white;
        }
        
        .kanji-section {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
        }
        
        .info-section {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 2rem;
        }
        
        .giant-kanji {
            font-size: ${adjustedFontSize}rem;
            font-weight: bold;
            color: black;
            font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'MS Gothic', 'Takao', 'IPAexGothic', 'IPAPGothic', 'VL PGothic', 'Noto Sans CJK JP', 'Arial Unicode MS', sans-serif;
            line-height: ${adjustedLineHeight};
            margin: 0;
        }
        
        .card-number {
            position: absolute;
            top: 2rem;
            right: 2rem;
            font-size: 2rem;
            font-weight: bold;
            color: black;
            background: white;
            padding: 1rem 1.5rem;
            border: 2px solid black;
        }
        
        .hiragana-display {
            font-size: 3.5rem;
            font-weight: bold;
            color: black;
            margin: 1.5rem 0;
            font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'MS Gothic', sans-serif;
            text-align: center;
        }
        
        .romaji-display {
            font-size: 3rem;
            font-weight: bold;
            color: black;
            margin: 1.5rem 0;
            text-align: center;
        }
        
        .english-display {
            font-size: 2.5rem;
            color: black;
            margin: 1.5rem 0;
            font-style: italic;
            text-align: center;
        }
        
        .rhyme-display {
            background: white;
            border: 3px solid black;
            padding: 1.5rem;
            font-size: 1.8rem;
            font-style: italic;
            font-weight: 600;
            color: black;
            margin: 2rem 0;
            text-align: center;
        }
        
        .sentence-display {
            background: white;
            border: 3px solid black;
            padding: 1.5rem;
            margin: 2rem 0;
            text-align: center;
        }
        
        .sentence-kanji {
            font-size: 2rem;
            font-weight: bold;
            color: black;
            margin-bottom: 0.8rem;
            font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'MS Gothic', sans-serif;
        }
        
        .sentence-romaji {
            font-size: 1.5rem;
            color: black;
            margin-bottom: 0.8rem;
            font-style: italic;
        }
        
        .sentence-english {
            font-size: 1.3rem;
            color: black;
        }
        
        @media print {
            .single-page {
                width: 100%;
                height: 100vh;
                margin: 0;
                padding: 1.5rem;
                gap: 2rem;
            }
            
            .giant-kanji {
                font-size: 12rem;
            }
            
            .card-number {
                font-size: 1.5rem;
                top: 1rem;
                right: 1rem;
                padding: 0.5rem 1rem;
            }
        }
    </style>
</head>
<body>`;

        // Generate pages for each card
        this.cards.forEach((card, index) => {
            html += `
    <div class="single-page">
        <div class="card-number">Card ${index + 1} of ${this.cards.length}</div>
        <div class="kanji-section">
            <div class="giant-kanji">${card.kanji}</div>
        </div>
        <div class="info-section">
            <div class="hiragana-display">${card.hiragana}</div>
            <div class="romaji-display">${card.romaji}</div>
            <div class="english-display">${card.english}</div>
            <div class="rhyme-display">"${card.rhyme}"</div>`;
            
            if (card.sentence) {
                html += `
            <div class="sentence-display">
                <div class="sentence-kanji">${card.sentence.kanji}</div>
                <div class="sentence-romaji">${card.sentence.romaji}</div>
                <div class="sentence-english">${card.sentence.english}</div>
            </div>`;
            }
            
            html += `
        </div>
    </div>`;
        });

        html += `
</body>
</html>`;

        return html;
    }

    generateCombinedHTML() {
        const currentDate = new Date().toLocaleDateString();
        
        let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kanji Combined Study Sheet</title>
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
            line-height: 1.6;
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
        
        .combined-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .combined-item {
            border: 2px solid #ddd;
            border-radius: 15px;
            padding: 20px;
            background: #fafafa;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            break-inside: avoid;
            page-break-inside: avoid;
        }
        
        .item-header {
            font-size: 1rem;
            font-weight: bold;
            color: #1e3c72;
            margin-bottom: 15px;
            text-align: center;
        }
        
        .rhyme-section {
            background: linear-gradient(135deg, #FFD700, #FFA500);
            border: 2px solid #FF6B35;
            border-radius: 10px;
            padding: 15px;
            font-size: 1.2rem;
            font-style: italic;
            font-weight: 600;
            color: #4B0082;
            text-align: center;
            margin-bottom: 15px;
        }
        
        .sentence-section {
            background: rgba(255, 255, 255, 0.9);
            border: 2px solid #74b9ff;
            border-radius: 10px;
            padding: 15px;
            text-align: center;
        }
        
        .sentence-kanji {
            font-size: 1.3rem;
            font-weight: bold;
            color: #1e3c72;
            margin-bottom: 8px;
            font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'MS Gothic', sans-serif;
        }
        
        .sentence-romaji {
            font-size: 1rem;
            color: #636e72;
            margin-bottom: 8px;
            font-style: italic;
        }
        
        .sentence-english {
            font-size: 0.95rem;
            color: #2d3436;
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
            .combined-container {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .combined-item {
                break-inside: avoid;
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="print-header">
        <h1>📚 Kanji Combined Study Sheet</h1>
        <p>Rhymes and Example Sentences Together</p>
        <p>Generated on: ${currentDate} • Total Items: ${this.cards.length}</p>
    </div>
    
    <div class="study-tips">
        <h3>🎯 How to Use This Combined Sheet:</h3>
        <ul>
            <li><strong>Start with rhymes</strong> - Use the rhymes to memorize pronunciation</li>
            <li><strong>Practice with sentences</strong> - See the words used in context</li>
            <li><strong>Cover and test</strong> - Hide sections to test your memory</li>
            <li><strong>Read aloud</strong> - Practice pronunciation with both rhymes and sentences</li>
            <li><strong>Make connections</strong> - Link the rhyme memory aids to real usage</li>
        </ul>
    </div>
    
    <div class="combined-container">`;

        // Generate each combined item
        this.cards.forEach((card, index) => {
            html += `
        <div class="combined-item">
            <div class="item-header">#${index + 1} - ${card.kanji} (${card.romaji})</div>
            <div style="background: #e8f4fd; border: 1px solid #74b9ff; border-radius: 8px; padding: 10px; margin-bottom: 12px; font-size: 0.95rem; color: #2d3436; text-align: center;"><strong style="color: #1e3c72;">Definition:</strong> ${card.english}</div>
            
            <div class="rhyme-section">
                "${card.rhyme}"
            </div>`;
            
            if (card.sentence) {
                html += `
            <div class="sentence-section">
                <div class="sentence-kanji">${card.sentence.kanji}</div>
                <div class="sentence-romaji">${card.sentence.romaji}</div>
                <div class="sentence-english">${card.sentence.english}</div>
            </div>`;
            } else {
                html += `
            <div class="sentence-section">
                <div style="color: #999; font-style: italic;">No example sentence available</div>
            </div>`;
            }
            
            html += `
        </div>`;
        });

        html += `
    </div>
    
    <div class="print-footer">
        <p>📚 Combine rhymes and sentences for comprehensive kanji learning!</p>
        <p>Generated by Kanji Card Concentration Game</p>
    </div>
</body>
</html>`;

        return html;
    }

    // Story Mode Functionality
    startStoryMode() {
        this.showStoryScreen();
        this.displayStory();
        this.isRomajiHidden = false;
        this.isEnglishHidden = false;
    }

    showStoryScreen() {
        document.getElementById('gameModeScreen').classList.remove('active');
        document.getElementById('preGameScreen').classList.remove('active');
        document.getElementById('gameScreen').classList.remove('active');
        document.getElementById('dragDropScreen').classList.remove('active');
        document.getElementById('storyScreen').classList.add('active');
    }

    displayStory() {
        const storyContainer = document.getElementById('storyText');
        storyContainer.innerHTML = '';

        // Create the coherent story narrative
        const storyNarrative = this.createCoherentStoryNarrative();
        
        // Create three separate story sections
        const storyWrapper = document.createElement('div');
        storyWrapper.className = 'story-wrapper';
        
        // Kanji story section
        const kanjiSection = document.createElement('div');
        kanjiSection.className = 'story-section story-kanji-section';
        kanjiSection.innerHTML = `
            <h3>Japanese (Kanji + Hiragana/Katakana)</h3>
            <div class="story-text story-kanji-text">${this.highlightVocabulary(storyNarrative.kanji, 'kanji')}</div>
        `;
        
        // Romaji story section
        const romajiSection = document.createElement('div');
        romajiSection.className = 'story-section story-romaji-section';
        romajiSection.innerHTML = `
            <h3>Romaji</h3>
            <div class="story-text story-romaji-text">${this.highlightVocabulary(storyNarrative.romaji, 'romaji')}</div>
        `;
        
        // English story section
        const englishSection = document.createElement('div');
        englishSection.className = 'story-section story-english-section';
        englishSection.innerHTML = `
            <h3>English</h3>
            <div class="story-text story-english-text">${this.highlightVocabulary(storyNarrative.english, 'english')}</div>
        `;
        
        storyWrapper.appendChild(kanjiSection);
        storyWrapper.appendChild(romajiSection);
        storyWrapper.appendChild(englishSection);
        storyContainer.appendChild(storyWrapper);
        
        // Apply current visibility settings
        this.applyStoryVisibility();
    }

    createCoherentStoryNarrative() {
        // Create a coherent story using the vocabulary words
        // This creates logically connected sentences that form a flowing narrative
        
        const storyCards = this.getCardsForStory();
        
        // Create the story text by connecting sentences logically
        const kanjiStory = storyCards.map(card => card.sentence.kanji).join(' ');
        const romajiStory = storyCards.map(card => card.sentence.romaji).join(' ');
        const englishStory = storyCards.map(card => card.sentence.english).join(' ');
        
        return {
            kanji: kanjiStory,
            romaji: romajiStory,
            english: englishStory
        };
    }

    getCardsForStory() {
        // Use cards in the exact same order as they appear on the memory screen
        // Use selected cards if any are selected, otherwise use all cards
        const cardsToUse = this.selectedCards.size > 0 
            ? this.cards.filter(card => this.selectedCards.has(card.id))
            : this.cards;
        
        // Filter out any cards that don't have sentences and return in original order
        return cardsToUse.filter(card => card && card.sentence);
    }

    createCoherentStoryOrder() {
        // Keep this method for backward compatibility with print functionality
        return this.getCardsForStory();
    }

    // Highlight vocabulary words in the story
    highlightVocabulary(text, type) {
        // For now, return the text without highlighting to avoid HTML corruption
        // This is a temporary solution until we can implement a proper HTML-safe highlighting system
        return text;
    }

    // Apply story visibility settings
    applyStoryVisibility() {
        const romajiSection = document.querySelector('.story-romaji-section');
        const englishSection = document.querySelector('.story-english-section');
        
        if (romajiSection) {
            if (this.isRomajiHidden) {
                romajiSection.classList.add('hidden');
            } else {
                romajiSection.classList.remove('hidden');
            }
        }
        
        if (englishSection) {
            if (this.isEnglishHidden) {
                englishSection.classList.add('hidden');
            } else {
                englishSection.classList.remove('hidden');
            }
        }
    }

    // Toggle romaji visibility in story mode
    toggleStoryRomaji() {
        this.isRomajiHidden = !this.isRomajiHidden;
        
        const toggleBtn = document.getElementById('hideStoryRomajiBtn');
        
        if (this.isRomajiHidden) {
            toggleBtn.textContent = '👁️ Show Romaji';
            toggleBtn.classList.add('active');
        } else {
            toggleBtn.textContent = '🙈 Hide Romaji';
            toggleBtn.classList.remove('active');
        }
        
        this.applyStoryVisibility();
    }

    // Toggle english visibility in story mode
    toggleStoryEnglish() {
        this.isEnglishHidden = !this.isEnglishHidden;
        
        const toggleBtn = document.getElementById('hideStoryEnglishBtn');
        
        if (this.isEnglishHidden) {
            toggleBtn.textContent = '👁️ Show English';
            toggleBtn.classList.add('active');
        } else {
            toggleBtn.textContent = '🙈 Hide English';
            toggleBtn.classList.remove('active');
        }
        
        this.applyStoryVisibility();
    }

    printStory() {
        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        
        // Generate the print HTML for the story
        const printHTML = this.generateStoryHTML();
        
        // Write the HTML to the new window
        printWindow.document.write(printHTML);
        printWindow.document.close();
        
        // Wait for content to load, then print
        printWindow.onload = () => {
            printWindow.print();
        };
    }

    generateStoryHTML() {
        const currentDate = new Date().toLocaleDateString();
        const storyOrder = this.createCoherentStoryOrder();
        
        // Create the coherent story narrative like Story Mode does
        const storyNarrative = this.createCoherentStoryNarrative();
        
        let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kanji Story - A Day in Japan</title>
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
            line-height: 1.8;
        }
        
        .print-header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #1e3c72;
            padding-bottom: 20px;
        }
        
        .print-header h1 {
            color: #1e3c72;
            font-size: 2.8rem;
            margin-bottom: 10px;
        }
        
        .print-header p {
            color: #666;
            font-size: 1.2rem;
            margin: 5px 0;
        }
        
        .story-container {
            max-width: 800px;
            margin: 0 auto;
            background: #fafafa;
            border: 2px solid #ddd;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .story-section {
            margin-bottom: 30px;
            padding: 20px;
            background: white;
            border-radius: 10px;
            border-left: 4px solid #74b9ff;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        
        .story-section h3 {
            color: #1e3c72;
            font-size: 1.5rem;
            margin-bottom: 15px;
            text-align: center;
            border-bottom: 2px solid #74b9ff;
            padding-bottom: 10px;
        }
        
        .story-text {
            font-size: 1.3rem;
            line-height: 1.8;
            text-align: justify;
        }
        
        .story-kanji-text {
            font-weight: bold;
            color: #1e3c72;
            font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'MS Gothic', sans-serif;
        }
        
        .story-romaji-text {
            color: #636e72;
            font-style: italic;
        }
        
        .story-english-text {
            color: #2d3436;
        }
        
        .print-footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #1e3c72;
            color: #666;
            font-size: 0.9rem;
        }
        
        .story-intro {
            background: #e8f4fd;
            border: 2px solid #74b9ff;
            border-radius: 10px;
            padding: 20px;
            margin: 30px 0;
            text-align: center;
        }
        
        .story-intro h3 {
            color: #1e3c72;
            margin-bottom: 15px;
            font-size: 1.4rem;
        }
        
        .story-intro p {
            color: #2d3436;
            font-size: 1.1rem;
            line-height: 1.6;
            margin: 0;
        }
        
        @media print {
            .story-container {
                max-width: none;
                margin: 0;
                box-shadow: none;
            }
            
            .story-section {
                break-inside: avoid;
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="print-header">
        <h1>📖 A Day in Japan</h1>
        <p>A Coherent Story Using Kanji Vocabulary</p>
        <p>Generated on: ${currentDate} • ${storyOrder.length} Connected Sentences</p>
    </div>
    
    <div class="story-intro">
        <h3>🌅 About This Story</h3>
        <p>This story connects all the kanji vocabulary words in a logical sequence, following a person through their day in Japan. The story is presented in three versions to help you understand the flow and context of the vocabulary words.</p>
    </div>
    
    <div class="story-container">
        <div class="story-section">
            <h3>Japanese (Kanji + Hiragana/Katakana)</h3>
            <div class="story-text story-kanji-text">${storyNarrative.kanji}</div>
        </div>
        
        <div class="story-section">
            <h3>Romaji</h3>
            <div class="story-text story-romaji-text">${storyNarrative.romaji}</div>
        </div>
        
        <div class="story-section">
            <h3>English</h3>
            <div class="story-text story-english-text">${storyNarrative.english}</div>
        </div>
    </div>
    
    <div class="print-footer">
        <p>📖 This story helps you see kanji vocabulary in a connected, meaningful context!</p>
        <p>Generated by Kanji Card Concentration Game</p>
    </div>
</body>
</html>`;

        return html;
    }

    // Focused Reading Mode Functionality
    startFocusedReadingMode() {
        this.showFocusedReadingScreen();
        this.displayFocusedReadingTable();
    }

    showFocusedReadingScreen() {
        document.getElementById('gameModeScreen').classList.remove('active');
        document.getElementById('preGameScreen').classList.remove('active');
        document.getElementById('gameScreen').classList.remove('active');
        document.getElementById('dragDropScreen').classList.remove('active');
        document.getElementById('storyScreen').classList.remove('active');
        document.getElementById('focusedReadingScreen').classList.add('active');
    }

    displayFocusedReadingTable() {
        const tableContainer = document.getElementById('focusedReadingTable');
        tableContainer.innerHTML = '';

        // Create the table
        const table = document.createElement('table');
        table.className = 'focused-reading-table';

        // Create table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        const vocabularyHeader = document.createElement('th');
        vocabularyHeader.textContent = 'Vocabulary Word';
        
        const romajiHeader = document.createElement('th');
        romajiHeader.textContent = 'Romaji Sentences';
        
        const kanjiHeader = document.createElement('th');
        kanjiHeader.textContent = 'Kanji/Hiragana Sentences';
        
        headerRow.appendChild(vocabularyHeader);
        headerRow.appendChild(romajiHeader);
        headerRow.appendChild(kanjiHeader);
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create table body
        const tbody = document.createElement('tbody');
        
        // Use selected cards if any are selected, otherwise use all cards
        const cardsToUse = this.getCardsForGame();
        
        // Filter cards that have sentences
        const cardsWithSentences = cardsToUse.filter(card => card.sentence && card.sentence.kanji && card.sentence.romaji);
        
        cardsWithSentences.forEach(card => {
            const row = document.createElement('tr');
            
            // Vocabulary word cell (far left)
            const vocabularyCell = document.createElement('td');
            vocabularyCell.innerHTML = `
                <div class="focused-reading-vocabulary-kanji">${card.kanji}</div>
                <div class="focused-reading-vocabulary-romaji">${card.romaji}</div>
                <div class="focused-reading-vocabulary-english">${card.english}</div>
            `;
            
            // Romaji sentence cell
            const romajiCell = document.createElement('td');
            romajiCell.innerHTML = `
                <div class="focused-reading-romaji">${card.sentence.romaji}</div>
                <div class="focused-reading-english">${card.sentence.english}</div>
            `;
            
            // Kanji sentence cell
            const kanjiCell = document.createElement('td');
            kanjiCell.innerHTML = `
                <div class="focused-reading-kanji">${card.sentence.kanji}</div>
            `;
            
            row.appendChild(vocabularyCell);
            row.appendChild(romajiCell);
            row.appendChild(kanjiCell);
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        tableContainer.appendChild(table);
    }

    printFocusedReadingTable() {
        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        
        // Generate the print HTML for the focused reading table
        const printHTML = this.generateFocusedReadingHTML();
        
        // Write the HTML to the new window
        printWindow.document.write(printHTML);
        printWindow.document.close();
        
        // Wait for content to load, then print
        printWindow.onload = () => {
            printWindow.print();
        };
    }

    generateFocusedReadingHTML() {
        const currentDate = new Date().toLocaleDateString();
        const cardsToUse = this.getCardsForGame();
        
        // Filter cards that have sentences
        const cardsWithSentences = cardsToUse.filter(card => card.sentence && card.sentence.kanji && card.sentence.romaji);
        
        let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Focused Reading Study Table</title>
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
            line-height: 1.6;
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
        
        .focused-reading-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
            border-radius: 15px;
            overflow: hidden;
        }
        
        .focused-reading-table th {
            background: #1e3c72;
            color: white;
            padding: 1.5rem;
            text-align: center;
            font-size: 1.4rem;
            font-weight: bold;
            border: 2px solid #1e3c72;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        
        .focused-reading-table td {
            padding: 1.5rem;
            border: 1px solid #ddd;
            vertical-align: middle;
            text-align: center;
            page-break-inside: avoid;
        }
        
        .focused-reading-table tr:nth-child(even) {
            background: #f8f9fa;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        
        .focused-reading-table tr:nth-child(odd) {
            background: white;
        }
        
        .focused-reading-vocabulary-kanji {
            font-size: 1.8rem;
            font-weight: bold;
            color: #1e3c72;
            margin-bottom: 0.3rem;
            font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'MS Gothic', sans-serif;
        }
        
        .focused-reading-vocabulary-romaji {
            font-size: 1.2rem;
            font-weight: bold;
            color: #636e72;
            margin-bottom: 0.3rem;
        }
        
        .focused-reading-vocabulary-english {
            font-size: 1rem;
            color: #666;
            font-style: italic;
        }
        
        .focused-reading-romaji {
            font-size: 1.4rem;
            font-weight: bold;
            color: #1e3c72;
            margin-bottom: 0.5rem;
        }
        
        .focused-reading-english {
            font-size: 1.1rem;
            color: #636e72;
            font-style: italic;
        }
        
        .focused-reading-kanji {
            font-size: 2rem;
            font-weight: bold;
            color: #1e3c72;
            margin-bottom: 0.5rem;
            font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'MS Gothic', sans-serif;
        }
        
        .focused-reading-hiragana {
            font-size: 1.2rem;
            color: #666;
            font-family: 'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'MS Gothic', sans-serif;
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
    </style>
</head>
<body>
    <div class="print-header">
        <h1>📋 Focused Reading Study Table</h1>
        <p>Clean side-by-side sentence comparison for focused study</p>
        <p>Generated on: ${currentDate} • Total Sentences: ${cardsWithSentences.length}</p>
    </div>
    
    <div class="study-tips">
        <h3>📚 How to Use This Table:</h3>
        <ul>
            <li><strong>Cover columns</strong> - Hide one side to test your reading comprehension</li>
            <li><strong>Read aloud</strong> - Practice pronunciation by reading both sides</li>
            <li><strong>Focus study</strong> - Use this clean format for concentrated sentence reading</li>
            <li><strong>Track progress</strong> - Check off sentences you've mastered</li>
            <li><strong>Review regularly</strong> - Use spaced repetition for best results</li>
        </ul>
    </div>
    
    <table class="focused-reading-table">
        <thead>
            <tr>
                <th>Vocabulary Word</th>
                <th>Romaji Sentences</th>
                <th>Kanji/Hiragana Sentences</th>
            </tr>
        </thead>
        <tbody>`;

        // Generate each row with sentences
        cardsWithSentences.forEach(card => {
            html += `
            <tr>
                <td>
                    <div class="focused-reading-vocabulary-kanji">${card.kanji}</div>
                    <div class="focused-reading-vocabulary-romaji">${card.romaji}</div>
                    <div class="focused-reading-vocabulary-english">${card.english}</div>
                </td>
                <td>
                    <div class="focused-reading-romaji">${card.sentence.romaji}</div>
                    <div class="focused-reading-english">${card.sentence.english}</div>
                </td>
                <td>
                    <div class="focused-reading-kanji">${card.sentence.kanji}</div>
                </td>
            </tr>`;
        });

        html += `
        </tbody>
    </table>
    
    <div class="print-footer">
        <p>📋 Perfect for focused sentence reading and comprehension practice!</p>
        <p>Generated by Kanji Card Concentration Game</p>
    </div>
</body>
</html>`;

        return html;
    }

    // Focused Reading Mode Column Toggle Functionality
    toggleFocusedReadingColumn(columnType) {
        const toggleBtn = document.getElementById(`toggle${columnType.charAt(0).toUpperCase() + columnType.slice(1)}Column`);
        const isCurrentlyActive = toggleBtn.classList.contains('active');
        
        if (isCurrentlyActive) {
            // Hide the column
            toggleBtn.classList.remove('active');
            this.hideFocusedReadingColumn(columnType);
        } else {
            // Show the column
            toggleBtn.classList.add('active');
            this.showFocusedReadingColumn(columnType);
        }
    }

    hideFocusedReadingColumn(columnType) {
        const table = document.querySelector('.focused-reading-table');
        if (!table) return;

        // Hide header
        const headers = table.querySelectorAll('th');
        let columnIndex = -1;
        
        if (columnType === 'vocabulary') {
            columnIndex = 0; // Vocabulary Word column
        } else if (columnType === 'romaji') {
            columnIndex = 1; // Romaji Sentences column
        } else if (columnType === 'english') {
            columnIndex = 1; // English is part of the Romaji Sentences column
            // Hide English elements within the romaji column
            const englishElements = table.querySelectorAll('.focused-reading-english');
            englishElements.forEach(element => {
                element.style.display = 'none';
            });
            return; // Don't hide the entire column for English
        } else if (columnType === 'kanji') {
            columnIndex = 2; // Kanji/Hiragana Sentences column
        }

        if (columnIndex !== -1) {
            // Hide header
            if (headers[columnIndex]) {
                headers[columnIndex].style.display = 'none';
            }
            
            // Hide all cells in this column
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells[columnIndex]) {
                    cells[columnIndex].style.display = 'none';
                }
            });
        }
    }

    showFocusedReadingColumn(columnType) {
        const table = document.querySelector('.focused-reading-table');
        if (!table) return;

        // Show header
        const headers = table.querySelectorAll('th');
        let columnIndex = -1;
        
        if (columnType === 'vocabulary') {
            columnIndex = 0; // Vocabulary Word column
        } else if (columnType === 'romaji') {
            columnIndex = 1; // Romaji Sentences column
        } else if (columnType === 'english') {
            columnIndex = 1; // English is part of the Romaji Sentences column
            // Show English elements within the romaji column
            const englishElements = table.querySelectorAll('.focused-reading-english');
            englishElements.forEach(element => {
                element.style.display = 'block';
            });
            return; // Don't show the entire column for English
        } else if (columnType === 'kanji') {
            columnIndex = 2; // Kanji/Hiragana Sentences column
        }

        if (columnIndex !== -1) {
            // Show header
            if (headers[columnIndex]) {
                headers[columnIndex].style.display = 'table-cell';
            }
            
            // Show all cells in this column
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells[columnIndex]) {
                    cells[columnIndex].style.display = 'table-cell';
                }
            });
        }
    }

    // Timed Memory Mode Functionality
    startTimedMemoryMode() {
        // Initialize timed memory mode state
        this.timedMemoryActive = true;
        this.timedMemoryCurrentIndex = 0;
        this.timedMemoryScore = 0;
        this.timedMemoryTimer = null;
        this.timedMemoryTimeLeft = this.settings.timedMemoryDuration;
        
        // Get cards to use for timed memory mode
        const cardsToUse = this.getCardsForGame();
        this.timedMemoryCards = [...cardsToUse];
        
        // Show the timed memory overlay
        this.showTimedMemoryOverlay();
        this.displayCurrentTimedMemoryCard();
        this.startTimedMemoryTimer();
    }

    showTimedMemoryOverlay() {
        const overlay = document.getElementById('timedMemoryOverlay');
        overlay.style.display = 'flex';
        
        // Update total cards count
        document.getElementById('timedMemoryTotalCards').textContent = this.timedMemoryCards.length;
        document.getElementById('timedMemoryScore').textContent = this.timedMemoryScore;
    }

    displayCurrentTimedMemoryCard() {
        if (this.timedMemoryCurrentIndex >= this.timedMemoryCards.length) {
            this.endTimedMemoryMode();
            return;
        }

        const currentCard = this.timedMemoryCards[this.timedMemoryCurrentIndex];
        const cardPairContainer = document.getElementById('timedMemoryCardPair');
        
        // Update progress
        document.getElementById('timedMemoryCurrentCard').textContent = this.timedMemoryCurrentIndex + 1;
        
        // Clear previous cards
        cardPairContainer.innerHTML = '';
        
        // Create kanji card
        const kanjiCard = this.createTimedMemoryCard(currentCard, 'kanji');
        // Create romaji card
        const romajiCard = this.createTimedMemoryCard(currentCard, 'romaji');
        
        cardPairContainer.appendChild(kanjiCard);
        cardPairContainer.appendChild(romajiCard);
        
        // Speak the word if TTS is enabled, then start timer after audio completes
        this.speakTimedMemoryCard(currentCard).then(() => {
            // Only start timer AFTER audio finishes
            this.startTimedMemoryTimer();
        });
    }

    async speakTimedMemoryCard(card) {
        if (!this.settings.openaiApiKey) {
            // No API key, no audio - just return immediately
            return;
        }
        if (!this.settings.timedMemorySpeakJapanese && !this.settings.timedMemorySpeakEnglish) {
            // Both toggles off - no audio
            return;
        }
        
        // Cancel any ongoing speech and clear queue
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        this.timedMemoryAudioQueue = [];
        this.timedMemoryAudioPlaying = false;
        
        // Build audio queue - separate calls for each language
        if (this.settings.timedMemorySpeakJapanese) {
            const japaneseText = card.hiragana || card.romaji;
            this.timedMemoryAudioQueue.push({ text: japaneseText, language: 'japanese' });
        }
        
        if (this.settings.timedMemorySpeakEnglish) {
            this.timedMemoryAudioQueue.push({ text: card.english, language: 'english' });
        }
        
        // Return a promise that resolves when ALL audio is done
        return new Promise((resolve) => {
            this.playTimedMemoryAudioQueue(resolve);
        });
    }

    async playTimedMemoryAudioQueue(onAllDone) {
        if (!this.timedMemoryAudioQueue || this.timedMemoryAudioQueue.length === 0) {
            // No audio to play
            if (onAllDone) onAllDone();
            return;
        }
        
        this.timedMemoryAudioPlaying = true;
        const item = this.timedMemoryAudioQueue.shift();
        
        try {
            const audioBlob = await this.getOpenAITTS(item.text, item.language);
            if (audioBlob && this.timedMemoryAudioPlaying) {
                this.currentAudio = new Audio(URL.createObjectURL(audioBlob));
                this.currentAudio.onended = () => {
                    // Check if we should continue (not stopped)
                    if (!this.timedMemoryAudioPlaying) {
                        if (onAllDone) onAllDone();
                        return;
                    }
                    // Play next item in queue or signal done
                    if (this.timedMemoryAudioQueue.length > 0) {
                        this.playTimedMemoryAudioQueue(onAllDone);
                    } else {
                        // All audio done
                        if (onAllDone) onAllDone();
                    }
                };
                this.currentAudio.onerror = () => {
                    // On error, try to continue
                    if (this.timedMemoryAudioQueue.length > 0 && this.timedMemoryAudioPlaying) {
                        this.playTimedMemoryAudioQueue(onAllDone);
                    } else {
                        if (onAllDone) onAllDone();
                    }
                };
                this.currentAudio.play();
            } else {
                // No blob, continue
                if (this.timedMemoryAudioQueue.length > 0 && this.timedMemoryAudioPlaying) {
                    this.playTimedMemoryAudioQueue(onAllDone);
                } else {
                    if (onAllDone) onAllDone();
                }
            }
        } catch (error) {
            console.error('TTS Error in timed memory:', error);
            if (this.timedMemoryAudioQueue.length > 0 && this.timedMemoryAudioPlaying) {
                this.playTimedMemoryAudioQueue(onAllDone);
            } else {
                if (onAllDone) onAllDone();
            }
        }
    }

    stopTimedMemoryAudio() {
        this.timedMemoryAudioPlaying = false;
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        this.timedMemoryAudioQueue = [];
    }

    createTimedMemoryCard(cardData, type) {
        const card = document.createElement('div');
        card.className = 'playing-card';
        
        // Check if this card type should be hidden based on memorize screen settings
        const shouldHideCard = this.shouldHideCardInTimedMode(type);
        
        if (shouldHideCard) {
            // Show card back instead of front
            const cardBack = document.createElement('div');
            cardBack.className = 'card-face card-back';
            cardBack.innerHTML = '<div>?</div>';
            card.appendChild(cardBack);
            return card;
        }
        
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
            const hiraganaClass = this.isHiraganaHidden ? 'hiragana hidden' : 'hiragana';
            content.innerHTML = `
                <div class="kanji-content">
                    <div class="kanji">${cardData.kanji}</div>
                    <div class="${hiraganaClass}">${cardData.hiragana}</div>
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

    startTimedMemoryTimer() {
        if (!this.settings.timedMemoryTimerEnabled) {
            // Timer is disabled - hide timer display and change button text
            document.getElementById('timedMemoryTimer').style.display = 'none';
            document.getElementById('timedMemoryThumbsUp').innerHTML = '➡️ Next Card';
            document.getElementById('timedMemoryThumbsDown').innerHTML = '⬅️ Previous Card';
            return;
        }
        
        this.timedMemoryTimeLeft = this.settings.timedMemoryDuration;
        this.updateTimedMemoryTimer();
        
        this.timedMemoryTimer = setInterval(() => {
            this.timedMemoryTimeLeft--;
            this.updateTimedMemoryTimer();
            
            if (this.timedMemoryTimeLeft <= 0) {
                this.handleTimedMemoryTimeout();
            }
        }, 1000);
    }

    updateTimedMemoryTimer() {
        document.getElementById('timedMemoryTimer').textContent = this.timedMemoryTimeLeft;
    }

    handleTimedMemoryTimeout() {
        // Time's up - reveal hidden cards then proceed after short pause
        this.stopTimedMemoryTimer();
        this.revealHiddenTimedMemoryCards();
        
        // Short pause before next card (audio is already done since timer starts after audio)
        setTimeout(() => {
            this.proceedToNextTimedMemoryCard();
        }, 1000);
    }

    revealHiddenTimedMemoryCards() {
        // Find all cards in the timed memory overlay that are currently showing card backs
        const cardPairContainer = document.getElementById('timedMemoryCardPair');
        const cards = cardPairContainer.querySelectorAll('.playing-card');
        
        cards.forEach(card => {
            const cardBack = card.querySelector('.card-back');
            const cardFront = card.querySelector('.card-front');
            
            // If this card only has a back (was hidden), create and show the front
            if (cardBack && !cardFront) {
                const currentCard = this.timedMemoryCards[this.timedMemoryCurrentIndex];
                
                // Determine card type based on position (first card is kanji, second is romaji)
                const cardIndex = Array.from(cards).indexOf(card);
                const cardType = cardIndex === 0 ? 'kanji' : 'romaji';
                
                // Create the card front
                const newCardFront = document.createElement('div');
                newCardFront.className = 'card-face card-front';
                
                // Rank and suit indicators
                const rankSuitTop = document.createElement('div');
                rankSuitTop.className = `card-rank-suit suit-${currentCard.suit}`;
                rankSuitTop.innerHTML = `${currentCard.rank}<span class="suit-symbol">${this.getSuitSymbol(currentCard.suit)}</span>`;
                
                const rankSuitBottom = document.createElement('div');
                rankSuitBottom.className = `card-rank-suit bottom suit-${currentCard.suit}`;
                rankSuitBottom.innerHTML = `${currentCard.rank}<span class="suit-symbol">${this.getSuitSymbol(currentCard.suit)}</span>`;
                
                // Card content
                const content = document.createElement('div');
                content.className = 'card-content';
                
                if (cardType === 'kanji') {
                    const hiraganaClass = this.isHiraganaHidden ? 'hiragana hidden' : 'hiragana';
                    content.innerHTML = `
                        <div class="kanji-content">
                            <div class="kanji">${currentCard.kanji}</div>
                            <div class="${hiraganaClass}">${currentCard.hiragana}</div>
                        </div>
                    `;
                } else {
                    content.innerHTML = `
                        <div class="romaji-content">
                            <div class="romaji">${currentCard.romaji}</div>
                            <div class="english">${currentCard.english}</div>
                        </div>
                    `;
                }
                
                newCardFront.appendChild(rankSuitTop);
                newCardFront.appendChild(content);
                newCardFront.appendChild(rankSuitBottom);
                card.appendChild(newCardFront);
                
                // Add flip animation by adding the flipped class
                card.classList.add('flipped');
            }
        });
    }

    handleTimedMemoryThumbsUp() {
        if (!this.timedMemoryActive) return;
        
        // Stop any TTS audio and timer
        this.stopTimedMemoryAudio();
        this.stopTimedMemoryTimer();
        
        if (!this.settings.timedMemoryTimerEnabled) {
            // Timer is disabled - this is the "Next Card" button
            this.proceedToNextTimedMemoryCard();
        } else {
            // Timer is enabled - this is the "I Know This" button
            this.timedMemoryScore += 10;
            document.getElementById('timedMemoryScore').textContent = this.timedMemoryScore;
            this.proceedToNextTimedMemoryCard();
        }
    }

    handleTimedMemoryThumbsDown() {
        if (!this.timedMemoryActive) return;
        
        // Stop any TTS audio and timer
        this.stopTimedMemoryAudio();
        this.stopTimedMemoryTimer();
        
        if (!this.settings.timedMemoryTimerEnabled) {
            // Timer is disabled - this is the "Previous Card" button
            this.proceedToPreviousTimedMemoryCard();
        } else {
            // Timer is enabled - this is the "Need More Practice" button
            this.proceedToNextTimedMemoryCard();
        }
    }

    stopTimedMemoryTimer() {
        if (this.timedMemoryTimer) {
            clearInterval(this.timedMemoryTimer);
            this.timedMemoryTimer = null;
        }
    }

    proceedToNextTimedMemoryCard() {
        // Stop any playing audio and clear queue before advancing
        this.stopTimedMemoryAudio();
        this.stopTimedMemoryTimer();
        
        this.timedMemoryCurrentIndex++;
        
        if (this.timedMemoryCurrentIndex >= this.timedMemoryCards.length) {
            this.endTimedMemoryMode();
        } else {
            // Display card and start timer (timer starts after audio in displayCurrentTimedMemoryCard)
            this.displayCurrentTimedMemoryCard();
        }
    }

    proceedToPreviousTimedMemoryCard() {
        // Stop any playing audio and clear queue before going back
        this.stopTimedMemoryAudio();
        this.stopTimedMemoryTimer();
        
        if (this.timedMemoryCurrentIndex > 0) {
            this.timedMemoryCurrentIndex--;
            // Display card and start timer (timer starts after audio)
            this.displayCurrentTimedMemoryCard();
        }
    }

    endTimedMemoryMode() {
        this.stopTimedMemoryTimer();
        this.stopTimedMemoryAudio();
        this.timedMemoryActive = false;
        
        // Show completion message
        const totalCards = this.timedMemoryCards.length;
        const maxScore = totalCards * 10;
        const percentage = Math.round((this.timedMemoryScore / maxScore) * 100);
        
        alert(`Timed Memory Mode Complete!\n\nScore: ${this.timedMemoryScore}/${maxScore} (${percentage}%)\nCards reviewed: ${totalCards}`);
        
        // Hide the overlay
        document.getElementById('timedMemoryOverlay').style.display = 'none';
    }

    exitTimedMemoryMode() {
        this.stopTimedMemoryTimer();
        this.stopTimedMemoryAudio();
        this.timedMemoryActive = false;
        
        document.getElementById('timedMemoryOverlay').style.display = 'none';
    }

    // Helper method to determine if a card should be hidden in timed memory mode
    shouldHideCardInTimedMode(cardType) {
        if (cardType === 'kanji') {
            // Check if kanji cards are currently flipped/hidden in the memorize screen
            const flipKanjiBtn = document.getElementById('flipKanjiBtn');
            return flipKanjiBtn && flipKanjiBtn.textContent.includes('Show');
        } else if (cardType === 'romaji') {
            // Check if romaji cards are currently flipped/hidden in the memorize screen
            const flipRomajiBtn = document.getElementById('flipRomajiBtn');
            return flipRomajiBtn && flipRomajiBtn.textContent.includes('Show');
        }
        return false;
    }

    // Listen to Sentences Mode Functionality
    startListenSentencesMode() {
        if (!this.settings.openaiApiKey) {
            alert('Please set your OpenAI API key in Settings to use this feature.');
            return;
        }
        this.showListenSentencesScreen();
        this.displayListenSentencesList();
    }

    showListenSentencesScreen() {
        document.getElementById('gameModeScreen').classList.remove('active');
        document.getElementById('preGameScreen').classList.remove('active');
        document.getElementById('gameScreen').classList.remove('active');
        document.getElementById('dragDropScreen').classList.remove('active');
        document.getElementById('storyScreen').classList.remove('active');
        document.getElementById('focusedReadingScreen').classList.remove('active');
        document.getElementById('listenSentencesScreen').classList.add('active');
    }

    displayListenSentencesList() {
        const listContainer = document.getElementById('listenSentencesList');
        listContainer.innerHTML = '';

        const cardsToUse = this.getCardsForGame();
        const cardsWithSentences = cardsToUse.filter(card => card.sentence && card.sentence.kanji);

        if (cardsWithSentences.length === 0) {
            listContainer.innerHTML = '<p class="no-sentences-msg">No sentences available. Import a deck with sentence data.</p>';
            return;
        }

        cardsWithSentences.forEach((card, index) => {
            const sentenceItem = document.createElement('div');
            sentenceItem.className = 'listen-sentence-item';
            sentenceItem.dataset.index = index;
            
            sentenceItem.innerHTML = `
                <div class="listen-sentence-header">
                    <span class="listen-sentence-number">${index + 1}</span>
                    <div class="listen-sentence-vocab">
                        <span class="listen-sentence-kanji">${card.kanji}</span>
                        <span class="listen-sentence-romaji-vocab">${card.romaji}</span>
                        <span class="listen-sentence-english-vocab">${card.english}</span>
                    </div>
                    <div class="listen-sentence-buttons">
                        <button class="listen-play-btn" data-index="${index}" title="Play sentence">▶️</button>
                        <button class="listen-ask-ai-btn" data-index="${index}" title="Ask AI to break down sentence">🤖</button>
                    </div>
                </div>
                <div class="listen-sentence-content">
                    <div class="listen-sentence-japanese">${card.sentence.kanji}</div>
                    <div class="listen-sentence-romaji">${card.sentence.romaji || ''}</div>
                    <div class="listen-sentence-english">${card.sentence.english || ''}</div>
                </div>
            `;
            
            listContainer.appendChild(sentenceItem);
        });

        // Store cards for later use
        this.listenSentencesCards = cardsWithSentences;

        // Add click handlers for play buttons
        listContainer.querySelectorAll('.listen-play-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.playSentence(cardsWithSentences[index], index);
            });
        });

        // Add click handlers for Ask AI buttons
        listContainer.querySelectorAll('.listen-ask-ai-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.askAiAboutSentence(cardsWithSentences[index], index);
            });
        });
    }

    async askAiAboutSentence(card, index) {
        if (!this.settings.openaiApiKey) {
            alert('Please set your OpenAI API key in Settings.');
            return;
        }

        const modal = document.getElementById('aiSentenceModal');
        const content = document.getElementById('aiSentenceContent');
        const title = document.getElementById('aiSentenceTitle');

        // Set title
        title.textContent = `🤖 AI Breakdown: ${card.kanji}`;

        // Show loading
        content.innerHTML = '<div class="ai-loading">🤔 Analyzing sentence...</div>';
        modal.style.display = 'flex';

        try {
            const sentence = card.sentence;
            const prompt = `Analyze this Japanese sentence and break it down word by word.

Sentence (Kanji): ${sentence.kanji}
Sentence (Romaji): ${sentence.romaji}
Sentence (English): ${sentence.english}

For each word in the sentence, provide:
1. The word in kanji (if applicable)
2. The word in hiragana/katakana
3. The romaji reading
4. The definition in English
5. If it's a verb: the verb stem (dictionary form), verb type (ichidan/godan), and common conjugations (present, past, te-form)
6. Any usage hints or common patterns

Format your response in a clear, structured way using markdown with sections for each word.`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.settings.openaiApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful Japanese language teacher. Provide clear, detailed breakdowns of Japanese sentences for learners. Use markdown formatting.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 2000
                })
            });

            if (!response.ok) {
                throw new Error(`OpenAI API error: ${response.status}`);
            }

            const data = await response.json();
            const aiResponse = data.choices[0].message.content;

            // Render markdown-like content
            content.innerHTML = `<div class="ai-breakdown">${this.renderMarkdown(aiResponse)}</div>`;

        } catch (error) {
            console.error('AI Error:', error);
            content.innerHTML = `<div class="ai-error">❌ Error: ${error.message}</div>`;
        }
    }

    renderMarkdown(text) {
        // Simple markdown rendering
        return text
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^- (.*$)/gim, '<li>$1</li>')
            .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
            .replace(/\n/g, '<br>')
            .replace(/<li>/g, '</li><li>')
            .replace(/^<\/li>/, '');
    }

    closeAiSentenceModal() {
        document.getElementById('aiSentenceModal').style.display = 'none';
    }

    async playSentence(card, index) {
        if (!card.sentence || (!card.sentence.kanji && !card.sentence.romaji)) {
            alert('No sentence to play for this card.');
            return;
        }

        // Stop any currently playing audio
        this.stopPlayback();

        const btn = document.querySelector(`.listen-play-btn[data-index="${index}"]`);
        if (btn) btn.textContent = '⏳';

        // Get volume settings
        const jpVolumeEl = document.getElementById('jpVolume');
        const enVolumeEl = document.getElementById('enVolume');
        const jpVolume = jpVolumeEl ? jpVolumeEl.value / 100 : 0.8;
        const enVolume = enVolumeEl ? enVolumeEl.value / 100 : 0.8;

        // Set up Media Session for lock screen playback
        this.setupMediaSession(card);

        try {
            // Use kanji for better Japanese pronunciation
            const text = card.sentence.kanji || card.sentence.romaji;
            const audioBlob = await this.getOpenAITTS(text, 'japanese');
            if (audioBlob) {
                this.currentAudio = new Audio(URL.createObjectURL(audioBlob));
                this.currentAudio.volume = jpVolume;
                this.currentAudio.onended = () => {
                    if (btn) btn.textContent = '▶️';
                    this.currentAudio = null;
                };
                this.currentAudio.play();
            }
        } catch (error) {
            console.error('TTS Error:', error);
            alert('Failed to play audio. Check your API key and try again.');
            if (btn) btn.textContent = '▶️';
        }
    }

    setupMediaSession(card) {
        // Use Media Session API to keep audio playing on lock screen
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: card.kanji || 'Japanese Sentence',
                artist: card.romaji || 'Kanji Concentration',
                album: 'Listen to Sentences',
                artwork: [
                    { src: '/favicon.ico', sizes: '96x96', type: 'image/x-icon' }
                ]
            });

            navigator.mediaSession.setActionHandler('play', () => {
                if (this.currentAudio) this.currentAudio.play();
            });

            navigator.mediaSession.setActionHandler('pause', () => {
                if (this.currentAudio) this.currentAudio.pause();
            });

            navigator.mediaSession.setActionHandler('stop', () => {
                this.stopPlayback();
            });
        }
    }

    clearTTSCache() {
        this.audioCache = {};
        alert('TTS cache cleared!');
    }

    async getOpenAITTS(text, language = 'japanese') {
        // Check cache first
        const cacheKey = `${language}:${text}`;
        if (this.audioCache[cacheKey]) {
            return this.audioCache[cacheKey];
        }
        
        // Determine instructions and voice based on language
        let instructions;
        let voice;
        let inputText = text;
        
        if (language === 'japanese') {
            instructions = 'Speak only Japanese with natural native pronunciation (標準語). Read dates and numbers in Japanese.';
            voice = 'coral';  // Female Japanese voice
            // Add Japanese punctuation if missing
            if (!inputText.endsWith('。') && !inputText.endsWith('！') && !inputText.endsWith('？')) {
                inputText = inputText + '。';
            }
        } else {
            // English - use different female voice for contrast
            instructions = 'Speak in clear, natural English. Do not use Japanese pronunciation. Read the text as normal English words.';
            voice = 'nova';  // Female English voice
            // Add English punctuation if missing
            if (!inputText.endsWith('.') && !inputText.endsWith('!') && !inputText.endsWith('?')) {
                inputText = inputText + '.';
            }
        }
        
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.settings.openaiApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini-tts',
                input: inputText,
                voice: voice,
                instructions: instructions,
                response_format: 'mp3'
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const blob = await response.blob();
        // Cache the result (use language-prefixed key)
        this.audioCache[cacheKey] = blob;
        return blob;
    }

    async playAllSentences() {
        if (this.isPlayingAll) return;
        
        const cardsToUse = this.getCardsForGame();
        const cardsWithSentences = cardsToUse.filter(card => card.sentence && card.sentence.kanji);
        
        if (cardsWithSentences.length === 0) {
            alert('No sentences to play.');
            return;
        }

        this.isPlayingAll = true;
        document.getElementById('playAllSentencesBtn').textContent = '⏳ Playing...';
        document.getElementById('playAllSentencesBtn').disabled = true;

        // Get volume settings
        const jpVolumeEl = document.getElementById('jpVolume');
        const enVolumeEl = document.getElementById('enVolume');
        const jpVolume = jpVolumeEl ? jpVolumeEl.value / 100 : 0.8;
        const enVolume = enVolumeEl ? enVolumeEl.value / 100 : 0.8;

        // Set up Media Session for lock screen controls
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: 'Listen to Sentences',
                artist: 'Kanji Concentration',
                album: 'Japanese Learning'
            });

            navigator.mediaSession.setActionHandler('play', () => {
                if (this.currentAudio) this.currentAudio.play();
            });

            navigator.mediaSession.setActionHandler('pause', () => {
                if (this.currentAudio) this.currentAudio.pause();
            });

            navigator.mediaSession.setActionHandler('stop', () => {
                this.stopPlayback();
            });

            navigator.mediaSession.setActionHandler('nexttrack', () => {
                // Skip to next sentence
                if (this.currentAudio) {
                    this.currentAudio.pause();
                    this.currentAudio = null;
                }
            });
        }

        let i = 0;
        while (this.isPlayingAll) {
            const card = cardsWithSentences[i];
            const btn = document.querySelector(`.listen-play-btn[data-index="${i}"]`);
            
            // Update Media Session with current card
            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: card.sentence.kanji || 'Japanese Sentence',
                    artist: card.romaji || 'Kanji Concentration',
                    album: `Sentence ${i + 1} of ${cardsWithSentences.length}`
                });
            }
            
            // Highlight current item
            document.querySelectorAll('.listen-sentence-item').forEach(item => {
                item.classList.remove('playing');
            });
            if (btn) {
                btn.closest('.listen-sentence-item').classList.add('playing');
                btn.textContent = '🔊';
            }

            try {
                // Play Japanese sentence with Japanese voice
                const japaneseText = card.sentence.kanji || card.sentence.romaji;
                const japaneseBlob = await this.getOpenAITTS(japaneseText, 'japanese');
                if (japaneseBlob && this.isPlayingAll) {
                    await new Promise((resolve) => {
                        this.currentAudio = new Audio(URL.createObjectURL(japaneseBlob));
                        this.currentAudio.volume = jpVolume;
                        this.currentAudio.onended = resolve;
                        this.currentAudio.onerror = resolve;
                        this.currentAudio.play();
                    });
                }
                
                // Play English translation if toggle is on (with English voice)
                if (this.listenSpeakEnglish && this.isPlayingAll && card.sentence.english) {
                    const englishBlob = await this.getOpenAITTS(card.sentence.english, 'english');
                    if (englishBlob && this.isPlayingAll) {
                        await new Promise((resolve) => {
                            this.currentAudio = new Audio(URL.createObjectURL(englishBlob));
                            this.currentAudio.volume = enVolume;
                            this.currentAudio.onended = resolve;
                            this.currentAudio.onerror = resolve;
                            this.currentAudio.play();
                        });
                    }
                }
            } catch (error) {
                console.error('TTS Error for card:', card.kanji, error);
            }

            if (btn) btn.textContent = '▶️';
            
            // Check if we should stop (before incrementing)
            if (!this.isPlayingAll) break;
            
            // Move to next card or loop back
            i++;
            if (i >= cardsWithSentences.length) {
                // Reached the end
                console.log('Reached end of sentences. Loop:', this.listenLoop, 'isPlayingAll:', this.isPlayingAll);
                if (this.listenLoop) {
                    i = 0;  // Loop back to beginning
                    console.log('Looping back to start');
                } else {
                    console.log('Not looping, stopping');
                    break;  // Stop if not looping
                }
            }
        }

        this.isPlayingAll = false;
        document.getElementById('playAllSentencesBtn').textContent = '▶️ Play All';
        document.getElementById('playAllSentencesBtn').disabled = false;
        document.querySelectorAll('.listen-sentence-item').forEach(item => {
            item.classList.remove('playing');
        });
    }

    stopPlayback() {
        this.isPlayingAll = false;
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        const playAllBtn = document.getElementById('playAllSentencesBtn');
        if (playAllBtn) {
            playAllBtn.textContent = '▶️ Play All';
            playAllBtn.disabled = false;
        }
        document.querySelectorAll('.listen-play-btn').forEach(btn => {
            btn.textContent = '▶️';
        });
        document.querySelectorAll('.listen-sentence-item').forEach(item => {
            item.classList.remove('playing');
        });
    }

    async convertToMP3() {
        const cardsToUse = this.getCardsForGame();
        const cardsWithSentences = cardsToUse.filter(card => card.sentence && card.sentence.kanji);

        if (cardsWithSentences.length === 0) {
            alert('No sentences available to convert. Import a deck with sentence data.');
            return;
        }

        if (!this.settings.openaiApiKey) {
            alert('Please set your OpenAI API key in Settings first.');
            return;
        }

        const progressDiv = document.createElement('div');
        progressDiv.className = 'conversion-progress';
        progressDiv.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
            <div class="progress-text">Preparing to convert ${cardsWithSentences.length} sentences to MP3...</div>
        `;
        document.body.appendChild(progressDiv);

        try {
            const allAudioBlobs = [];
            
            // Process each sentence
            for (let i = 0; i < cardsWithSentences.length; i++) {
                const card = cardsWithSentences[i];
                const progressFill = progressDiv.querySelector('.progress-fill');
                const progressText = progressDiv.querySelector('.progress-text');
                
                const percentage = Math.round(((i + 1) / cardsWithSentences.length) * 100);
                progressFill.style.width = `${percentage}%`;
                progressText.textContent = `Processing ${i + 1}/${cardsWithSentences.length}: ${card.kanji}`;

                // Japanese sentence
                const japaneseText = card.sentence.kanji || card.sentence.romaji;
                const japaneseAudio = await this.getOpenAITTS(japaneseText, 'japanese');
                if (japaneseAudio) allAudioBlobs.push(japaneseAudio);

                // English translation - always include it
                if (card.sentence.english) {
                    const englishAudio = await this.getOpenAITTS(card.sentence.english, 'english');
                    if (englishAudio) allAudioBlobs.push(englishAudio);
                }
            }

            // Create a single audio element with all sounds
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const mergedAudio = await this.mergeAudioBlobs(audioContext, allAudioBlobs);

            // Download the merged audio
            const blob = new Blob([mergedAudio], { type: 'audio/mp3' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'kanji-sentences.mp3';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            progressDiv.innerHTML = '<div class="success-msg">✅ MP3 conversion complete! File downloaded.</div>';
            setTimeout(() => progressDiv.remove(), 3000);

        } catch (error) {
            console.error('Conversion Error:', error);
            progressDiv.innerHTML = `<div class="error-msg">❌ Error: ${error.message}</div>`;
            setTimeout(() => progressDiv.remove(), 3000);
        }
    }

    async mergeAudioBlobs(audioContext, audioBlobs) {
        // For MP3 concatenation, we need to decode each blob and combine them
        const decodedChunks = [];
        
        // Decode each audio blob
        for (const blob of audioBlobs) {
            try {
                const arrayBuffer = await blob.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                decodedChunks.push(audioBuffer);
            } catch (e) {
                console.error('Failed to decode audio blob:', e);
            }
        }
        
        if (decodedChunks.length === 0) {
            throw new Error('No valid audio chunks to merge');
        }
        
        // Create a single buffer with combined duration
        const sampleRate = audioContext.sampleRate;
        let totalSamples = 0;
        for (const chunk of decodedChunks) {
            totalSamples += chunk.length;
        }
        
        // Create output buffer (mono for MP3 compatibility)
        const outputBuffer = audioContext.createBuffer(1, totalSamples, sampleRate);
        const outputData = outputBuffer.getChannelData(0);
        
        // Copy audio data from each chunk
        let offset = 0;
        for (const chunk of decodedChunks) {
            const chunkData = chunk.getChannelData(0);
            outputData.set(chunkData, offset);
            offset += chunk.length;
        }
        
        // Encode to WAV format (which can be played as audio)
        const wavBlob = this.encodeWAV(outputBuffer);
        return wavBlob;
    }
    
    // Create silence blob (1 second at 24kHz)
    async createSilenceBlob(audioContext, length) {
        const buffer = audioContext.createBuffer(1, length, 24000);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
            data[i] = 0; // Silence
        }
        const wavBlob = this.encodeWAV(buffer);
        return wavBlob;
    }
    
    encodeWAV(audioBuffer) {
        const numberOfChannels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = 16;
        
        let result = null;
        if (numberOfChannels === 1) {
            result = audioBuffer.getChannelData(0);
        } else if (numberOfChannels === 2) {
            result = new Float32Array(audioBuffer.length * 2);
            const left = audioBuffer.getChannelData(0);
            const right = audioBuffer.getChannelData(1);
            for (let i = 0; i < audioBuffer.length; i++) {
                result[2 * i] = left[i];
                result[2 * i + 1] = right[i];
            }
        } else {
            throw new Error('Unsupported number of channels');
        }
        
        // Convert to 16-bit PCM
        const buffer = new ArrayBuffer(44 + result.length * 2);
        const view = new DataView(buffer);
        
        // Write the WAV container
        this.writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + result.length * 2, true);
        this.writeString(view, 8, 'WAVE');
        
        // Write the fmt chunk
        this.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, numberOfChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numberOfChannels * 2, true);
        view.setUint16(32, numberOfChannels * 2, true);
        view.setUint16(34, bitDepth, true);
        
        // Write the data chunk
        this.writeString(view, 36, 'data');
        view.setUint32(40, result.length * 2, true);
        
        // Write the PCM samples
        const bytes = new Int16Array(result.length);
        for (let i = 0; i < result.length; i++) {
            bytes[i] = Math.max(-1, Math.min(1, result[i])) * 0x7FFF;
        }
        for (let i = 0; i < bytes.length; i++) {
            view.setInt16(44 + i * 2, bytes[i], true);
        }
        
        return new Blob([view], { type: 'audio/wav' });
    }
    
    writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    toggleListenSentenceVisibility(type) {
        const elements = document.querySelectorAll(`.listen-sentence-${type}`);
        const btn = document.getElementById(`toggleListen${type.charAt(0).toUpperCase() + type.slice(1)}`);
        const isVisible = btn.classList.contains('active');
        
        elements.forEach(el => {
            el.style.display = isVisible ? 'none' : 'block';
        });
        btn.classList.toggle('active');
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
            this.settings.timedMemoryDuration = parseInt(document.getElementById('timedMemoryDuration').value);
            this.settings.timedMemoryTimerEnabled = document.getElementById('timedMemoryTimerEnabled').checked;
            
            const speakJapaneseEl = document.getElementById('timedMemorySpeakJapanese');
            if (speakJapaneseEl) this.settings.timedMemorySpeakJapanese = speakJapaneseEl.checked;
            
            const speakEnglishEl = document.getElementById('timedMemorySpeakEnglish');
            if (speakEnglishEl) this.settings.timedMemorySpeakEnglish = speakEnglishEl.checked;
            
            const apiKeyInput = document.getElementById('openaiApiKey');
            if (apiKeyInput) this.settings.openaiApiKey = apiKeyInput.value;
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
        
        // Batch Import functionality
        document.getElementById('batchImportBtn').addEventListener('click', () => {
            this.showBatchImportModal();
        });
        
        // Library functionality
        document.getElementById('libraryBtn').addEventListener('click', () => {
            this.showLibraryModal();
        });
        
        document.getElementById('libraryClose').addEventListener('click', () => {
            this.closeLibraryModal();
        });
        
        // Close library modal when clicking outside
        window.addEventListener('click', (e) => {
            const libraryModal = document.getElementById('libraryModal');
            if (e.target === libraryModal) {
                this.closeLibraryModal();
            }
        });
        
        
        document.getElementById('batchImportClose').addEventListener('click', () => {
            this.closeBatchImportModal();
        });
        
        document.getElementById('batchFileSelector').addEventListener('click', () => {
            this.selectBatchFiles();
        });
        
        document.getElementById('batchFileInput').addEventListener('change', (e) => {
            this.handleBatchFileSelection(e.target.files);
        });
        
        document.getElementById('startBatchImport').addEventListener('click', () => {
            this.startBatchImport();
        });
        
        document.getElementById('cancelBatchImport').addEventListener('click', () => {
            this.closeBatchImportModal();
        });
        
        // Print cards functionality
        document.getElementById('printCardsBtn').addEventListener('click', () => {
            this.showPrintClozeModal();
        });
        
        // Print rhymes functionality
        document.getElementById('printRhymesBtn').addEventListener('click', () => {
            this.printRhymesOnly();
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
        
        document.getElementById('printSentencesWithOptions').addEventListener('click', () => {
            this.printSentencesWithOptions();
        });
        
        // Game controls
        document.getElementById('startGameBtn').addEventListener('click', () => {
            this.stopPreGameTimer();
            this.showModeSelectionScreen();
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
        document.getElementById('memoryMode').addEventListener('click', () => {
            this.showPreGameScreen();
        });
        
        document.getElementById('concentrationMode').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('dragDropMode').addEventListener('click', () => {
            this.startDragDropMode();
        });
        
        document.getElementById('storyMode').addEventListener('click', () => {
            this.startStoryMode();
        });
        
        document.getElementById('focusedReadingMode').addEventListener('click', () => {
            this.startFocusedReadingMode();
        });
        
        document.getElementById('listenSentencesMode').addEventListener('click', () => {
            this.startListenSentencesMode();
        });
        
        // Flip control event listeners
        document.getElementById('flipRomajiBtn').addEventListener('click', () => {
            this.flipAllRomajiCards();
        });
        
        document.getElementById('flipKanjiBtn').addEventListener('click', () => {
            this.flipAllKanjiCards();
        });
        
        document.getElementById('resetFlipBtn').addEventListener('click', () => {
            this.resetAllCardFlips();
        });
        
        // Hide hiragana event listener
        document.getElementById('hideHiraganaBtn').addEventListener('click', () => {
            this.toggleHiraganaVisibility();
        });
        
        // Scramble cards event listener
        document.getElementById('scrambleCardsBtn').addEventListener('click', () => {
            this.scrambleCardOrder();
        });
        
        // Card selection event listeners
        document.getElementById('toggleCardSelectionBtn').addEventListener('click', () => {
            this.toggleCardSelectionMode();
        });
        
        document.getElementById('resetCardSelectionBtn').addEventListener('click', () => {
            this.resetCardSelection();
        });
        
        // Drag & Drop mode controls
        document.getElementById('hideEnglishBtn').addEventListener('click', () => {
            this.toggleEnglishVisibility();
        });
        
        document.getElementById('hideRhymeBtn').addEventListener('click', () => {
            this.toggleRhymeVisibility();
        });
        
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
        
        // Sentence toggle buttons for celebration modal
        document.getElementById('toggleSentenceKanji').addEventListener('click', () => {
            this.toggleCelebrationSentenceKanji();
        });
        
        document.getElementById('toggleSentenceRomaji').addEventListener('click', () => {
            this.toggleCelebrationSentenceRomaji();
        });
        
        document.getElementById('toggleSentenceEnglish').addEventListener('click', () => {
            this.toggleCelebrationSentenceEnglish();
        });
        
        // Sentence toggle buttons for review modal
        document.getElementById('reviewToggleSentenceKanji').addEventListener('click', () => {
            this.toggleReviewSentenceKanji();
        });
        
        document.getElementById('reviewToggleSentenceRomaji').addEventListener('click', () => {
            this.toggleReviewSentenceRomaji();
        });
        
        document.getElementById('reviewToggleSentenceEnglish').addEventListener('click', () => {
            this.toggleReviewSentenceEnglish();
        });
        
        // Drag & Drop sentence toggle button
        document.getElementById('hideSentencesBtn').addEventListener('click', () => {
            this.toggleSentenceVisibility();
        });
        
        // Print sentences functionality - now opens modal
        document.getElementById('printSentencesBtn').addEventListener('click', () => {
            this.showPrintClozeModal();
        });
        
        // Print combined functionality
        document.getElementById('printCombinedBtn').addEventListener('click', () => {
            this.printCombined();
        });
        
        // Big Kanji Print functionality
        document.getElementById('printBigKanjiBtn').addEventListener('click', () => {
            this.showBigKanjiPrintModal();
        });
        
        document.getElementById('bigKanjiPrintClose').addEventListener('click', () => {
            this.closeBigKanjiPrintModal();
        });
        
        document.getElementById('printBigKanjiStart').addEventListener('click', () => {
            this.printBigKanji();
        });
        
        document.getElementById('cancelBigKanjiPrint').addEventListener('click', () => {
            this.closeBigKanjiPrintModal();
        });
        
        // Big Kanji Print slider controls
        document.getElementById('kanjiSizeSlider').addEventListener('input', (e) => {
            document.getElementById('kanjiSizeValue').textContent = e.target.value + '%';
        });
        
        document.getElementById('lineSpacingSlider').addEventListener('input', (e) => {
            document.getElementById('lineSpacingValue').textContent = e.target.value + '%';
        });
        
        // Story mode controls
        document.getElementById('hideStoryRomajiBtn').addEventListener('click', () => {
            this.toggleStoryRomaji();
        });
        
        document.getElementById('hideStoryEnglishBtn').addEventListener('click', () => {
            this.toggleStoryEnglish();
        });
        
        document.getElementById('printStoryBtn').addEventListener('click', () => {
            this.printStory();
        });
        
        document.getElementById('backToModeSelectFromStory').addEventListener('click', () => {
            console.log('Mode select button clicked from story mode');
            this.showModeSelectionScreen();
        });
        
        // Focused Reading Mode controls
        document.getElementById('printFocusedReadingBtn').addEventListener('click', () => {
            this.printFocusedReadingTable();
        });
        
        document.getElementById('backToModeSelectFromFocusedReading').addEventListener('click', () => {
            this.showModeSelectionScreen();
        });
        
        // Focused Reading Mode column toggle controls
        document.getElementById('toggleVocabularyColumn').addEventListener('click', () => {
            this.toggleFocusedReadingColumn('vocabulary');
        });
        
        document.getElementById('toggleRomajiColumn').addEventListener('click', () => {
            this.toggleFocusedReadingColumn('romaji');
        });
        
        document.getElementById('toggleEnglishColumn').addEventListener('click', () => {
            this.toggleFocusedReadingColumn('english');
        });
        
        document.getElementById('toggleKanjiColumn').addEventListener('click', () => {
            this.toggleFocusedReadingColumn('kanji');
        });
        
        // Listen to Sentences Mode controls
        document.getElementById('playAllSentencesBtn').addEventListener('click', () => {
            this.playAllSentences();
        });
        
        document.getElementById('stopPlaybackBtn').addEventListener('click', () => {
            this.stopPlayback();
        });
        
        document.getElementById('convertToMp3Btn').addEventListener('click', () => {
            this.convertToMP3();
        });
        
        document.getElementById('backToModeSelectFromListen').addEventListener('click', () => {
            this.stopPlayback();
            this.showModeSelectionScreen();
        });
        
        document.getElementById('toggleListenRomaji').addEventListener('click', () => {
            this.toggleListenSentenceVisibility('romaji');
        });
        
        document.getElementById('toggleListenEnglish').addEventListener('click', () => {
            this.toggleListenSentenceVisibility('english');
        });
        
        document.getElementById('toggleListenSpeakEnglish').addEventListener('click', () => {
            this.listenSpeakEnglish = !this.listenSpeakEnglish;
            document.getElementById('toggleListenSpeakEnglish').classList.toggle('active', this.listenSpeakEnglish);
        });
        
        document.getElementById('toggleListenLoop').addEventListener('click', () => {
            this.listenLoop = !this.listenLoop;
            console.log('Loop toggled to:', this.listenLoop);
            document.getElementById('toggleListenLoop').classList.toggle('active', this.listenLoop);
        });
        
        document.getElementById('clearTTSCacheBtn').addEventListener('click', () => {
            this.clearTTSCache();
        });
        
        // AI Sentence Modal
        document.getElementById('closeAiSentenceModal').addEventListener('click', () => {
            this.closeAiSentenceModal();
        });
        
        document.getElementById('aiSentenceModal').addEventListener('click', (e) => {
            if (e.target.id === 'aiSentenceModal') {
                this.closeAiSentenceModal();
            }
        });
        
        // Timed Memory Mode controls
        document.getElementById('startTimedMemoryBtn').addEventListener('click', () => {
            this.startTimedMemoryMode();
        });
        
        document.getElementById('timedMemoryThumbsUp').addEventListener('click', () => {
            this.handleTimedMemoryThumbsUp();
        });
        
        document.getElementById('timedMemoryThumbsDown').addEventListener('click', () => {
            this.handleTimedMemoryThumbsDown();
        });
        
        document.getElementById('exitTimedMemoryBtn').addEventListener('click', () => {
            this.exitTimedMemoryMode();
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
    window.game = new KanjiConcentrationGame();
});
