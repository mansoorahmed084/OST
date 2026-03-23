// ===================================
// Memory Match: Twin Row Game
// ===================================

let memoryDynamicItems = [];

async function fetchMemoryCards() {
    try {
        const res = await fetch('/api/images/memory-cards');
        const data = await res.json();
        if (data.success && data.cards) {
            memoryDynamicItems = data.cards;
        }
    } catch (e) {
        console.error("Failed to fetch memory cards", e);
    }
}

function getCategoryItems(category) {
    if (category === 'mixed') {
        return memoryDynamicItems;
    }
    const catItems = memoryDynamicItems.filter(i => i.category === category);
    if (catItems.length === 0) return memoryDynamicItems; // fallback 
    return catItems;
}

const memoryState = {
    config: {
        timer: 3,           // Seconds for preview
        gridSetting: 'auto', // 'auto', '2', '3', '4', '5'
        category: 'mixed'
    },
    activeLevel: 1,         // 1: 2x2, 2: 3x2, 3: 4x2, 4: 5x2
    phase: 'idle',          // idle, preview, play, end
    items: [],              // The unique items for the current round
    matches: 0,
    errors: 0,
    roundErrors: 0,
    consecutivePerfects: 0,
    consecutiveFails: 0,

    selectedRow1Index: null,
    isProcessingMatch: false,

    // UI Elements that will be initialized
    els: {}
};

document.addEventListener('DOMContentLoaded', async () => {
    // We bind navigation change logic in app.js conceptually, but we can safely init here
    await fetchMemoryCards();
    initMemoryGame();
});

function initMemoryGame() {
    memoryState.els = {
        row1: document.getElementById('memory-row-1'),
        row2: document.getElementById('memory-row-2'),
        startBtn: document.getElementById('memory-start-btn'),
        levelStr: document.getElementById('memory-level'),
        matchesStr: document.getElementById('memory-matches'),
        errorsStr: document.getElementById('memory-errors'),
        progCont: document.getElementById('memory-progress-container'),
        progBar: document.getElementById('memory-progress-bar'),
        progText: document.getElementById('memory-progress-text'),
        feedback: document.getElementById('memory-feedback'),
        settingsBtn: document.getElementById('memory-settings-btn'),
        settingsModal: document.getElementById('memory-settings-modal'),
        closeSettings: document.getElementById('close-memory-settings'),
        saveSettings: document.getElementById('save-memory-settings-btn'),
        timerInput: document.getElementById('memory-timer-setting'),
        timerDisplay: document.getElementById('memory-timer-display'),
        gridInput: document.getElementById('memory-grid-setting'),
        catInput: document.getElementById('memory-category-setting')
    };

    if (!memoryState.els.startBtn) return; // Not on the page somehow

    memoryState.els.startBtn.addEventListener('click', startMemoryRound);

    // Settings
    memoryState.els.settingsBtn.addEventListener('click', () => {
        memoryState.els.settingsModal.classList.remove('hidden');
    });
    memoryState.els.closeSettings.addEventListener('click', () => {
        memoryState.els.settingsModal.classList.add('hidden');
    });
    memoryState.els.timerInput.addEventListener('input', (e) => {
        memoryState.els.timerDisplay.textContent = e.target.value + 's';
    });
    memoryState.els.saveSettings.addEventListener('click', () => {
        memoryState.config.timer = parseInt(memoryState.els.timerInput.value);
        memoryState.config.gridSetting = memoryState.els.gridInput.value;
        memoryState.config.category = memoryState.els.catInput.value;

        if (memoryState.config.gridSetting !== 'auto') {
            memoryState.activeLevel = parseInt(memoryState.config.gridSetting) - 1; // 2 -> level 1
        }

        memoryState.els.settingsModal.classList.add('hidden');
        resetMemoryScoreboard();
        updateMemoryStatsUI();
    });
}

function resetMemoryScoreboard() {
    memoryState.matches = 0;
    memoryState.errors = 0;
    memoryState.consecutivePerfects = 0;
    memoryState.consecutiveFails = 0;
    memoryState.phase = 'idle';
}

function getGridSize() {
    // Returns number of unique items
    return memoryState.activeLevel + 1; // Level 1 -> 2 items, Level 4 -> 5 items
}

function updateMemoryStatsUI() {
    const size = getGridSize();
    memoryState.els.levelStr.textContent = `Level ${memoryState.activeLevel} (${size}x2) | ${memoryState.config.timer}s`;
    memoryState.els.matchesStr.textContent = `Matches: ${memoryState.matches}`;
    memoryState.els.errorsStr.textContent = `Errors: ${memoryState.errors}`;
}

function startMemoryRound() {
    memoryState.phase = 'preview';
    memoryState.roundErrors = 0;
    memoryState.matches = 0;
    memoryState.selectedRow1Index = null;
    memoryState.isProcessingMatch = false;
    memoryState.els.feedback.classList.add('hidden');

    memoryState.els.startBtn.classList.add('hidden');

    updateMemoryStatsUI();

    const size = getGridSize();
    let allItems = [...getCategoryItems(memoryState.config.category)];

    // Shuffle and pick
    allItems.sort(() => Math.random() - 0.5);
    let selectedItems = allItems.slice(0, size);

    // Fill the rest with mixed random items if category didn't have enough entries
    if (selectedItems.length < size) {
        let mixedItems = [...memoryDynamicItems].filter(i => !selectedItems.some(s => s.id === i.id));
        mixedItems.sort(() => Math.random() - 0.5);
        selectedItems = selectedItems.concat(mixedItems.slice(0, size - selectedItems.length));
    }

    memoryState.items = selectedItems;

    const row2Items = [...memoryState.items].sort(() => Math.random() - 0.5);

    renderMemoryRow(memoryState.els.row1, memoryState.items, 1);

    // Show divider now that we have rows
    const divider = document.getElementById('memory-divider');
    if (divider) divider.style.display = 'block';

    renderMemoryRow(memoryState.els.row2, row2Items, 2);

    // Start Preview
    memoryState.els.progCont.style.display = 'block';

    let timeLeft = memoryState.config.timer;
    memoryState.els.progText.textContent = `Look carefully! (${timeLeft}s)`;
    memoryState.els.progBar.style.width = '100%';
    memoryState.els.progBar.style.transition = `width ${memoryState.config.timer}s linear`;

    // Force reflow
    void memoryState.els.progBar.offsetWidth;
    memoryState.els.progBar.style.width = '0%';

    const countdown = setInterval(() => {
        timeLeft--;
        if (timeLeft > 0) {
            memoryState.els.progText.textContent = `Look carefully! (${timeLeft}s)`;
        } else {
            clearInterval(countdown);
            endPreviewPhase();
        }
    }, 1000);
}

function renderMemoryRow(container, items, rowNum) {
    container.innerHTML = '';
    items.forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = 'memory-card flipped'; // Start face up (flipped)
        card.dataset.id = item.id;
        card.dataset.row = rowNum;
        card.dataset.idx = idx;

        card.innerHTML = `
            <div class="memory-card-inner">
                <div class="memory-card-face memory-card-front">
                    <span style="font-size: 2rem">❓</span>
                </div>
                <div class="memory-card-face memory-card-back" style="padding: 10px;">
                    <img src="${item.image}" alt="${item.label}" style="width: 100%; height: 100%; object-fit: contain; border-radius: var(--radius-md);">
                </div>
            </div>
        `;

        card.addEventListener('click', () => handleCardClick(card));
        container.appendChild(card);
    });
}

function endPreviewPhase() {
    memoryState.phase = 'play';
    memoryState.els.progCont.style.display = 'none';

    // Flip all down
    const cards = document.querySelectorAll('.memory-card');
    cards.forEach(card => card.classList.remove('flipped'));

    showMemoryFeedback("Find the matching pairs!", "success");
    setTimeout(() => memoryState.els.feedback.classList.add('hidden'), 2000);
}

function handleCardClick(card) {
    if (memoryState.phase !== 'play' || memoryState.isProcessingMatch) return;
    if (card.classList.contains('matched')) return;

    const row = parseInt(card.dataset.row);

    if (row === 1) {
        // Can always change mind on Row 1 choice before valid Row 2 tap
        memoryState.els.row1.querySelectorAll('.memory-card').forEach(c => {
            if (!c.classList.contains('matched')) c.classList.remove('selected', 'flipped');
        });

        card.classList.add('flipped', 'selected');
        memoryState.selectedRow1Index = card.dataset.idx;

    } else if (row === 2) {
        if (memoryState.selectedRow1Index === null) {
            // Must pick row 1 first
            return;
        }

        // Processing row 2
        card.classList.add('flipped');
        memoryState.isProcessingMatch = true;

        // Check match
        const row1Card = memoryState.els.row1.children[memoryState.selectedRow1Index];
        const isMatch = row1Card.dataset.id === card.dataset.id;

        if (isMatch) {
            handleMemoryMatch(row1Card, card);
        } else {
            handleMemoryMismatch(row1Card, card);
        }
    }
}

function handleMemoryMatch(card1, card2) {
    playMemoryDing();

    card1.classList.remove('selected');
    card1.classList.add('matched');
    card2.classList.add('matched');

    memoryState.matches++;
    updateMemoryStatsUI();

    const matchedItem = memoryState.items.find(i => i.id === card1.dataset.id);
    if (matchedItem) {
        speakMemoryWord(matchedItem.label);
    }

    memoryState.selectedRow1Index = null;
    memoryState.isProcessingMatch = false;

    const size = getGridSize();
    if (memoryState.matches === size) {
        finishMemoryRound();
    }
}

function handleMemoryMismatch(card1, card2) {
    playMemoryThud();
    memoryState.errors++;
    memoryState.roundErrors++;
    updateMemoryStatsUI();

    card1.classList.add('error');
    card2.classList.add('error');
    card1.classList.remove('selected');

    setTimeout(() => {
        card1.classList.remove('flipped', 'error');
        card2.classList.remove('flipped', 'error');
        memoryState.selectedRow1Index = null;
        memoryState.isProcessingMatch = false;
    }, 1200);
}

function finishMemoryRound() {
    memoryState.phase = 'end';

    // Submit activity progress for Daily Adventure
    if (typeof submitActivity === 'function') {
        submitActivity('memory_game', null, 100);
    }

    if (memoryState.roundErrors === 0) {
        memoryState.consecutivePerfects++;
        memoryState.consecutiveFails = 0;
        showMemoryFeedback("Perfect! Wonderful!", "success");
    } else {
        memoryState.consecutiveFails++;
        memoryState.consecutivePerfects = 0;
        showMemoryFeedback(`Great job! You made ${memoryState.roundErrors} mistakes.`, "error");
    }

    // Adaptive logic (Always on, so custom starting levels still adapt)
    if (memoryState.consecutivePerfects >= 3) {
        if (memoryState.activeLevel < 4) {
            memoryState.activeLevel++;
            memoryState.config.timer = Math.max(3, memoryState.config.timer);
            memoryState.consecutivePerfects = 0;
            // Update UI dropdown to match adapted level
            memoryState.config.gridSetting = (memoryState.activeLevel + 1).toString();
            if (memoryState.els.gridInput) memoryState.els.gridInput.value = memoryState.config.gridSetting;
        }
    } else if (memoryState.consecutiveFails >= 2 && memoryState.roundErrors > 3) {
        if (memoryState.activeLevel > 1) {
            memoryState.activeLevel--;
            memoryState.consecutiveFails = 0;
            // Update UI dropdown to match adapted level
            memoryState.config.gridSetting = (memoryState.activeLevel + 1).toString();
            if (memoryState.els.gridInput) memoryState.els.gridInput.value = memoryState.config.gridSetting;
        } else {
            memoryState.config.timer = Math.min(10, memoryState.config.timer + 2);
            memoryState.consecutiveFails = 0;
        }
    }

    setTimeout(() => {
        updateMemoryStatsUI();
        memoryState.els.startBtn.classList.remove('hidden');

        // Hide divider and old cards
        const divider = document.getElementById('memory-divider');
        if (divider) divider.style.display = 'none';
        memoryState.els.row1.innerHTML = '';
        memoryState.els.row2.innerHTML = '';
        memoryState.els.feedback.classList.add('hidden');

        memoryState.els.startBtn.innerHTML = '<span class="btn-icon">▶️</span><span>Play Next Round</span>';
    }, 2500);
}

function showMemoryFeedback(msg, type) {
    memoryState.els.feedback.textContent = msg;
    memoryState.els.feedback.className = `memory-feedback ${type}`;
}

// ----------------------------------------------------
// Audio & Voice Utilities
// ----------------------------------------------------

function playMemoryDing() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
    } catch (e) { console.warn("Audio error", e) }
}

function playMemoryThud() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
    } catch (e) { console.warn("Audio error", e) }
}

function speakMemoryWord(word) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
    }
}
