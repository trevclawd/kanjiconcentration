# Kanji Card Concentration Game

A web-based memory game that helps you learn Japanese Kanji characters through a concentration/memory card game format. Match Kanji cards with their corresponding Romaji translations while enjoying beautiful rhyming phrases that aid memorization.

## Features

### Game Mechanics
- **52 Card Pairs**: Complete deck with playing card designs (Hearts, Diamonds, Clubs, Spades)
- **Two-sided Cards**: Kanji/Hiragana on one side, Romaji/English on the other
- **Memory Rhymes**: Each card pair includes a memorable rhyming phrase
- **Progressive Difficulty**: 4 rounds with increasing challenge levels

### Game Rounds
1. **Round 1**: Shows rank + suit + content (easiest)
2. **Round 2**: Shows rank + content only
3. **Round 3**: Shows suit + content only  
4. **Round 4**: Shows content only (hardest)

### Pre-Game Study Phase
- View all 52 card pairs simultaneously
- Study both sides of each card with rank/suit identifiers
- Optional auto-advance timer or manual start
- Perfect for memorization before gameplay

### Customizable Settings
- **Match Behavior**: Choose whether matched pairs stay visible or disappear
- **Auto-Advance**: Enable/disable automatic progression from study phase
- **Timer Duration**: Set study time (10-300 seconds)
- **Data Import**: Load your own Kanji sets via JSON file

### Beautiful Celebrations
- Animated celebration modal for successful matches
- Display of the rhyming phrase to reinforce learning
- Visual feedback with matched card pairs

## How to Play

1. **Study Phase**: Review all card pairs to memorize the Kanji-Romaji relationships
2. **Start Game**: Begin with Round 1 (easiest) or jump to any round
3. **Match Cards**: Click cards to flip them and find matching Kanji-Romaji pairs
4. **Enjoy Rhymes**: Celebrate successful matches with memorable phrases
5. **Progress**: Advance through rounds as visual aids are gradually removed

## File Structure

```
kanjiconcentration/
├── index.html          # Main HTML structure
├── styles.css          # Complete styling with card animations
├── script.js           # Game logic and state management
├── sample-data.json    # 52 sample Kanji cards with rhymes
└── README.md           # This documentation
```

## Data Format

Import your own Kanji sets using this JSON structure:

```json
{
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
    }
  ]
}
```

### Required Fields
- `id`: Unique identifier (suggest: rank_suit format)
- `rank`: Playing card rank (A, 2-10, J, Q, K)
- `suit`: Playing card suit (hearts, diamonds, clubs, spades)
- `kanji`: Japanese Kanji character(s)
- `hiragana`: Hiragana reading
- `romaji`: Romanized pronunciation
- `english`: English translation
- `rhyme`: Memorable rhyming phrase for learning

## Technical Features

- **Responsive Design**: Works on desktop and mobile devices
- **Local Storage**: Saves settings between sessions
- **Smooth Animations**: Card flip effects and celebrations
- **File Import**: Drag-and-drop JSON file support
- **Progressive Enhancement**: Works without JavaScript for basic viewing

## Getting Started

1. Open `index.html` in a web browser
2. Review the pre-loaded sample cards in study mode
3. Adjust settings if desired (gear icon)
4. Click "Start Game" to begin Round 1
5. Import your own Kanji data using the "Import Data" button

## Browser Compatibility

- Modern browsers with ES6+ support
- Chrome, Firefox, Safari, Edge
- Mobile browsers supported

## Educational Benefits

- **Visual Memory**: Playing card associations aid recall
- **Spaced Repetition**: Multiple rounds reinforce learning
- **Mnemonic Devices**: Rhyming phrases improve retention
- **Progressive Challenge**: Gradual removal of visual cues
- **Active Recall**: Memory testing through gameplay

Perfect for Japanese language learners, students, and anyone interested in Kanji memorization through gamification!
