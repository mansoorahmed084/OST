// ===================================
// OST - Omar's Speech Trainer
// Main Application Logic
// ===================================

// API Base URL
const API_BASE = '/api';

// Global State
const state = {
    currentPage: 'home',
    currentStory: null,
    currentSpeed: 1.0,
    isPlaying: false,
    currentSentenceIndex: 0,
    recognition: null,
    synthesis: window.speechSynthesis,
    currentUtterance: null,
    isSelectMode: false,
    selectedStories: new Set()
};

// ... (lines 20-186)

function displayStory(story) {
    // Hide stories list, show reader
    document.getElementById('stories-list').classList.add('hidden');
    // Hide generator and controls when reading
    document.querySelector('.story-generator').classList.add('hidden');
    document.querySelector('.story-management').classList.add('hidden');

    document.getElementById('story-reader').classList.remove('hidden');

    // Set title
    document.getElementById('story-title').textContent = story.title;

    // Set image (placeholder for now)
    const imageContainer = document.querySelector('.story-image-container');
    imageContainer.innerHTML = `
        <div style="width: 100%; height: 400px; display: flex; align-items: center; justify-content: center; font-size: 5rem;">
            ${getThemeEmoji(story.theme)}
        </div>
    `;

    // Display sentences with word-level wrapping
    const textContainer = document.getElementById('story-text');
    textContainer.innerHTML = story.sentences.map((s, sentenceIdx) => {
        // Split sentence into words
        const words = s.sentence_text.trim().split(/\s+/);
        const wordsHtml = words.map((word, wordIdx) =>
            `<span class="story-word" data-sentence="${sentenceIdx}" data-word="${wordIdx}">${word}</span>`
        ).join(' ');
        return `<span class="story-sentence" data-index="${sentenceIdx}">${wordsHtml} </span>`;
    }).join('');

    // Display Moral
    const moralContainer = document.getElementById('story-moral');
    const moralText = document.getElementById('moral-text');

    if (story.moral) {
        moralText.textContent = story.moral;
        moralContainer.classList.remove('hidden');
    } else {
        moralContainer.classList.add('hidden');
    }

    state.currentSentenceIndex = 0;
}

// ===================================
// Initialization
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeHomePage();
    initializeStoriesPage();
    initializePracticePage();
    initializeQuizPage();

    initializeChatPage();
    initializeRecallPage();
    initializeSettings();

    // Initialize Speech Recognition if available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        state.recognition = new SpeechRecognition();
        state.recognition.continuous = false;
        state.recognition.interimResults = false;
        state.recognition.lang = 'en-IN'; // Indian English
    }
});

// ===================================
// Navigation
// ===================================
function initializeNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            navigateToPage(page);
        });
    });
}

function navigateToPage(pageName) {
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === pageName);
    });

    // Update pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    const targetPage = document.getElementById(`${pageName}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
        state.currentPage = pageName;
    }
}

// ===================================
// Home Page
// ===================================
function initializeHomePage() {
    const heroCards = document.querySelectorAll('.hero-card');

    heroCards.forEach(card => {
        card.addEventListener('click', () => {
            const page = card.dataset.navigate;
            if (page) {
                navigateToPage(page);
            }
        });
    });
}

// ===================================
// Stories Page
// ===================================
function initializeStoriesPage() {
    loadStories();
    // Ensure visibility
    document.querySelector('.story-generator').classList.remove('hidden');
    document.querySelector('.story-management').classList.remove('hidden');

    // Back button
    document.getElementById('back-to-stories')?.addEventListener('click', () => {
        document.getElementById('stories-list').classList.remove('hidden');
        document.getElementById('story-reader').classList.add('hidden');
        // Unhide controls
        document.querySelector('.story-generator').classList.remove('hidden');
        document.querySelector('.story-management').classList.remove('hidden');
        stopStory();
    });

    // Play/Pause buttons
    document.getElementById('play-story')?.addEventListener('click', playStory);
    document.getElementById('pause-story')?.addEventListener('click', pauseStory);
    document.getElementById('stop-story')?.addEventListener('click', () => {
        // Explicit Hard Reset for "Start from Beginning"
        stopStory(); // Use stopStory to clean up state and reset UI (including translation button)

        // Wait a tick for UI to reset before playing again
        setTimeout(() => {
            playStory();
        }, 50);
    });

    // Speed controls
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentSpeed = parseFloat(btn.dataset.speed);

            // If playing, we need to reload with new speed
            if (state.isPlaying) {
                pauseStory(); // Stop current
                speakStory(); // Restart with new speed
            }
        });
    });

    // Story length selection
    document.querySelectorAll('.length-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.length-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Random story generation
    document.getElementById('generate-random-story')?.addEventListener('click', generateRandomStory);

    // Topic-based story generation
    document.getElementById('generate-topic-story')?.addEventListener('click', generateTopicStory);

    // Story Management
    document.getElementById('toggle-select-mode')?.addEventListener('click', toggleSelectMode);
    document.getElementById('delete-selected')?.addEventListener('click', deleteSelectedStories);
}

async function loadStories() {
    try {
        showLoading();
        const response = await fetch(`${API_BASE}/stories`);
        const data = await response.json();

        if (data.success) {
            displayStories(data.stories);
        } else {
            showError('Failed to load stories');
        }
    } catch (error) {
        console.error('Error loading stories:', error);
        showError('Failed to load stories');
    } finally {
        hideLoading();
    }
}

function displayStories(stories) {
    const container = document.getElementById('stories-list');

    if (stories.length === 0) {
        container.innerHTML = '<p class="text-center">No stories available yet.</p>';
        return;
    }

    container.innerHTML = stories.map(story => `
        <div class="story-card ${state.isSelectMode ? 'select-mode' : ''} ${state.selectedStories.has(story.id.toString()) ? 'selected' : ''}" 
             data-story-id="${story.id}">
            <input type="checkbox" class="story-checkbox" ${state.selectedStories.has(story.id.toString()) ? 'checked' : ''}>
            <div class="story-card-icon">📖</div>
            <h3>${story.title}</h3>
            <span class="story-card-theme">${story.theme || 'General'}</span>
            ${story.moral ? '<span style="font-size: 0.8rem; color: var(--success-color);">🌟</span>' : ''}
        </div>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.story-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const storyId = card.dataset.storyId;

            if (state.isSelectMode) {
                // Toggle selection
                const checkbox = card.querySelector('.story-checkbox');
                if (checkbox) {
                    const isSelected = !state.selectedStories.has(storyId);
                    checkbox.checked = isSelected;
                    if (isSelected) {
                        state.selectedStories.add(storyId);
                        card.classList.add('selected');
                    } else {
                        state.selectedStories.delete(storyId);
                        card.classList.remove('selected');
                    }
                    updateDeleteButton();
                }
            } else {
                // Open story
                loadStory(storyId);
            }
        });
    });
}

async function generateTopicStory() {
    const topicInput = document.getElementById('story-topic');
    const topic = topicInput.value.trim();

    if (!topic) {
        showError('Please enter a topic');
        return;
    }

    // Get Settings
    const lengthBtn = document.querySelector('.length-btn.active');
    const length = lengthBtn ? lengthBtn.dataset.length : 'short';
    const speed = getSelectedSpeed();
    const languageSelect = document.getElementById('gen-language');
    const language = languageSelect ? languageSelect.value : 'en';

    const btn = document.getElementById('generate-topic-story');
    const originalText = btn.innerHTML;

    try {
        btn.innerHTML = '<span class="loading-spinner"></span> Generating...';
        btn.disabled = true;

        const response = await fetch(`${API_BASE}/generator/topic`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                topic: topic,
                length: length,
                speed: speed,
                language: language
            })
        });

        const data = await response.json();

        if (data.success) {
            // Poll for audio availability
            // But first load the story to show text immediately
            await loadStory(data.story_id);
        } else {
            showError(data.error || 'Failed to generate story');
        }

    } catch (error) {
        console.error('Generation error:', error);
        showError('Failed to connect to server');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ... (other functions)

function displayStory(story) {
    // Hide stories list, show reader
    document.getElementById('stories-list').classList.add('hidden');
    document.querySelector('.story-generator').classList.add('hidden');
    document.querySelector('.story-management').classList.add('hidden');
    document.getElementById('story-reader').classList.remove('hidden');

    // Set title
    const titleEl = document.getElementById('story-title');
    if (story.translated_title && story.target_language && story.target_language !== 'en') {
        titleEl.innerHTML = `${story.title}<br><span style="font-size: 0.6em; color: var(--secondary-light);">${story.translated_title}</span>`;
    } else {
        titleEl.textContent = story.title;
    }

    // Image logic
    const imageContainer = document.querySelector('.story-image-container');
    let imgSrc = 'https://cdn-icons-png.flaticon.com/512/3408/3408506.png';
    if (story.image_category && story.image_category.startsWith('/')) {
        imgSrc = story.image_category;
    } else {
        if (typeof generateImage === 'function') generateImage(story);
    }
    imageContainer.innerHTML = `<img id="story-image" src="${imgSrc}" class="story-image" style="object-fit: contain; width: 100%; height: 100%;">`;

    // Display sentences 
    const textContainer = document.getElementById('story-text');
    const isBilingual = story.target_language && story.target_language !== 'en';

    if (isBilingual) {
        // Bilingual Rendering (Interleaved)
        textContainer.innerHTML = story.sentences.map((s, sentenceIdx) => {
            const words = s.sentence_text.trim().split(/\s+/);
            const wordsHtml = words.map((word, wordIdx) =>
                `<span class="story-word" data-sentence="${sentenceIdx}" data-word="${wordIdx}">${word}</span>`
            ).join(' ');

            const transText = s.translated_text || '';

            return `
                 <div class="bilingual-sentence" data-index="${sentenceIdx}">
                    <div class="story-sentence" data-index="${sentenceIdx}" style="display:block; margin-bottom: 5px;">${wordsHtml}</div>
                    <div class="translated-text">${transText}</div>
                 </div>
            `;
        }).join('');

        // Show Translation Play Button
        const playTransBtn = document.getElementById('play-translation');
        if (playTransBtn) {
            playTransBtn.classList.remove('hidden');
            // Remove old listeners to avoid duplicates if any (simple cloning trick or just direct assign)
            const newBtn = playTransBtn.cloneNode(true);
            playTransBtn.parentNode.replaceChild(newBtn, playTransBtn);
            newBtn.addEventListener('click', () => speakTranslation());
        }

    } else {
        // Standard English Rendering
        textContainer.innerHTML = story.sentences.map((s, sentenceIdx) => {
            const words = s.sentence_text.trim().split(/\s+/);
            const wordsHtml = words.map((word, wordIdx) =>
                `<span class="story-word" data-sentence="${sentenceIdx}" data-word="${wordIdx}">${word}</span>`
            ).join(' ');
            return `<span class="story-sentence" data-index="${sentenceIdx}">${wordsHtml} </span>`;
        }).join('');

        // Hide Translation Play Button
        const playTransBtn = document.getElementById('play-translation');
        if (playTransBtn) playTransBtn.classList.add('hidden');
    }

    // Vocab & Moral (Standard) ... same as before
    // Display Moral
    const moralContainer = document.getElementById('story-moral');
    const moralText = document.getElementById('moral-text');
    if (story.moral) {
        moralText.textContent = story.moral;
        moralContainer.classList.remove('hidden');
    } else {
        moralContainer.classList.add('hidden');
    }

    // Display Vocab
    const vocabContainer = document.getElementById('story-vocab');
    const vocabList = document.getElementById('vocab-list');
    let vocabData = story.vocab;
    if (!vocabData && story.vocab_json) {
        try { vocabData = JSON.parse(story.vocab_json); } catch (e) { }
    }
    if (vocabData && Object.keys(vocabData).length > 0) {
        vocabList.innerHTML = Object.entries(vocabData).map(([word, def]) => `
            <div class="vocab-card">
                <span class="vocab-word">${word}</span>
                <span class="vocab-def">${def}</span>
            </div>
        `).join('');
        vocabContainer.classList.remove('hidden');
    } else {
        vocabContainer.classList.add('hidden');
    }

    state.currentSentenceIndex = 0;
}

// ...

async function speakTranslation() {
    if (!state.currentStory) return;

    // Stop English if playing
    if (state.isPlaying) stopStory();

    state.isPlaying = true;
    state.currentSentenceIndex = -1; // Force first sentence to be highlighted when sync starts
    document.querySelectorAll('.active-sentence').forEach(el => el.classList.remove('active-sentence'));
    document.querySelectorAll('.active-translation').forEach(el => el.classList.remove('active-translation'));

    // UI Updates
    document.getElementById('play-translation').classList.add('hidden'); // Hide self? Or show pause? 
    // Simplified: Just toggle Play/Pause icons generally or share the main Play/Pause UI?
    // Let's share the main Pause button for simplicity
    document.getElementById('play-story').style.display = 'flex'; // Reset English button
    document.getElementById('pause-story').style.display = 'flex'; // Show Pause
    // Hide Translation Play button temporarily? Or keep it? 
    // Let's hide it to show we are playing
    document.getElementById('play-translation').style.display = 'none';

    try {
        const speed = getSelectedSpeed();
        // Request Translated Audio
        const response = await fetch(`${API_BASE}/speech/story/${state.currentStory.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                speed: speed,
                language: state.currentStory.target_language
            })
        });
        const data = await response.json();

        if (!data.success) {
            showError("Could not load translation audio.");
            resetAudioUI();
            return;
        }

        const audio = new Audio(data.audio_url);
        state.currentAudio = audio;

        audio.onended = () => {
            resetAudioUI();
        };

        audio.play().catch(e => console.error("Play error", e));

        // Helper to start sync safely
        const triggerSync = () => {
            if (state.currentStory.sentences && state.currentAudio === audio) {
                startVisualSync(audio, state.currentStory.sentences, 'translation');
            }
        };

        if (audio.readyState >= 1) {
            triggerSync();
        } else {
            audio.addEventListener('loadedmetadata', triggerSync);
        }

    } catch (e) {
        console.error("Translation Play Error", e);
        resetAudioUI();
    }
}

function resetAudioUI() {
    state.isPlaying = false;
    state.currentAudio = null;
    document.getElementById('play-story').style.display = 'flex';
    document.getElementById('pause-story').style.display = 'none';

    // Restore Translation button if bilingual
    const story = state.currentStory;
    if (story && story.target_language && story.target_language !== 'en') {
        document.getElementById('play-translation').style.display = 'flex';
        document.getElementById('play-translation').classList.remove('hidden');
    }
}

// (Monkey patches removed - Logic moved to main functions)


// Visual Sync (mode: 'normal' = highlight English, 'translation' = highlight Hindi/translated text)
function startVisualSync(audio, sentences, mode = 'normal') {

    const totalDuration = audio.duration;
    // Calculate total words
    let totalWords = 0;
    const sentenceWords = sentences.map(s => {
        // Use word count from the relevant text based on mode
        const text = mode === 'translation' ? (s.translated_text || s.sentence_text) : s.sentence_text;
        const count = text.split(/\s+/).length;
        totalWords += count;
        return count;
    });

    // Map end times
    let accumulatedWords = 0;
    const contentDuration = Math.max(0, totalDuration - SILENCE_PADDING);

    const sentenceEndTimes = sentenceWords.map(count => {
        accumulatedWords += count;
        return (accumulatedWords / totalWords) * contentDuration;
    });

    // Visual Sync Loop
    const updateVisuals = () => {
        if (!state.isPlaying || !state.currentAudio) return;

        // Paranoid check: If we are in translation mode, ensure audio matches
        if (mode === 'translation' && state.currentAudio !== audio) return;

        const effectiveTime = Math.max(0, audio.currentTime - SILENCE_PADDING);

        // Find which sentence we are in
        let activeIndex = -1;
        for (let i = 0; i < sentenceEndTimes.length; i++) {
            if (effectiveTime < sentenceEndTimes[i]) {
                activeIndex = i;
                break;
            }
        }
        if (activeIndex === -1 && effectiveTime < contentDuration) activeIndex = sentenceEndTimes.length - 1;
        if (audio.currentTime < SILENCE_PADDING) activeIndex = 0;

        // Sync UI
        if (activeIndex !== -1 && activeIndex !== state.currentSentenceIndex) {
            // Cleanup old
            document.querySelectorAll('.active-sentence').forEach(el => el.classList.remove('active-sentence'));
            if (mode === 'translation') {
                document.querySelectorAll('.active-translation').forEach(el => el.classList.remove('active-translation'));
            }

            state.currentSentenceIndex = activeIndex;

            // Highlight Target
            if (mode === 'translation') {
                // Highlight Translated Text (Hindi)
                const biContainer = document.querySelector(`.bilingual-sentence[data-index="${activeIndex}"]`);
                if (biContainer) {
                    const transEl = biContainer.querySelector('.translated-text');
                    if (transEl) transEl.classList.add('active-translation');
                    biContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            } else {
                // Standard Highlight
                // console.log(`DEBUG: Highlighting English Index ${activeIndex}`);
                const target = document.querySelector(`.story-sentence[data-index="${activeIndex}"]`);
                if (target) {
                    target.classList.add('active-sentence');
                    // Check bilingual parent
                    const parentBi = target.closest('.bilingual-sentence');
                    if (parentBi) {
                        parentBi.classList.add('active-sentence'); // This highlights the box for English
                        parentBi.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } else {
                        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            }
        }

        if (!audio.paused && !audio.ended) {
            requestAnimationFrame(updateVisuals);
        }
    };

    requestAnimationFrame(updateVisuals);
}

async function loadStory(storyId) {
    try {
        // Clear previous story audio state
        if (state.currentAudio) {
            state.currentAudio.pause();
            state.currentAudio = null;
        }
        state.isPlaying = false;

        showLoading();
        const response = await fetch(`${API_BASE}/stories/${storyId}`);
        const data = await response.json();

        if (data.success) {
            state.currentStory = data.story;
            displayStory(data.story);
        } else {
            showError('Failed to load story');
        }
    } catch (error) {
        console.error('Error loading story:', error);
        showError('Failed to load story');
    } finally {
        hideLoading();
    }
}

// ===================================
// Story Management Functions
// ===================================

function toggleSelectMode() {
    state.isSelectMode = !state.isSelectMode;
    state.selectedStories.clear();

    // Update UI
    const container = document.getElementById('stories-list');
    const cards = container.querySelectorAll('.story-card');
    const toggleBtn = document.getElementById('toggle-select-mode');

    if (state.isSelectMode) {
        toggleBtn.classList.add('active');
        toggleBtn.innerHTML = '<span class="btn-icon">✖️</span><span>Cancel Selection</span>';
        cards.forEach(card => card.classList.add('select-mode'));
        document.getElementById('delete-selected').classList.remove('hidden');
    } else {
        toggleBtn.classList.remove('active');
        toggleBtn.innerHTML = '<span class="btn-icon">☑️</span><span>Manage Stories</span>';
        cards.forEach(card => {
            card.classList.remove('select-mode', 'selected');
            const checkbox = card.querySelector('.story-checkbox');
            if (checkbox) checkbox.checked = false;
        });
        document.getElementById('delete-selected').classList.add('hidden');
    }

    updateDeleteButton();
}

function updateDeleteButton() {
    const deleteBtn = document.getElementById('delete-selected');
    const count = state.selectedStories.size;

    if (count > 0) {
        deleteBtn.innerHTML = `<span class="btn-icon">🗑️</span><span>Delete Selected (${count})</span>`;
        deleteBtn.disabled = false;
    } else {
        deleteBtn.innerHTML = `<span class="btn-icon">🗑️</span><span>Delete Selected</span>`;
        deleteBtn.disabled = true;
    }
}

async function deleteSelectedStories() {
    if (state.selectedStories.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${state.selectedStories.size} stories?`)) {
        return;
    }

    try {
        showLoading();

        const response = await fetch(`${API_BASE}/stories/batch-delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ story_ids: Array.from(state.selectedStories) })
        });

        const data = await response.json();

        if (data.success) {
            // Exit select mode
            toggleSelectMode();
            // Reload stories
            await loadStories();
            showError(data.message); // Should be showSuccess ideally, using showError as alert for now
        } else {
            showError(data.error || 'Failed to delete stories');
        }
    } catch (error) {
        console.error('Error deleting stories:', error);
        showError('Failed to delete stories');
    } finally {
        hideLoading();
    }
}

function getThemeEmoji(theme) {
    const emojis = {
        'animals': '🐕',
        'vehicles': '🚌',
        'family': '👨‍👩‍👦',
        'nature': '🌳',
        'food': '🍎'
    };
    return emojis[theme] || '📖';
}

function playStory() {
    if (!state.currentStory) return;

    state.isPlaying = true;
    document.getElementById('play-story').style.display = 'none';
    document.getElementById('pause-story').style.display = 'flex';

    speakStory();
}

function stopStory() {
    state.isPlaying = false;
    document.getElementById('play-story').style.display = 'flex';
    document.getElementById('pause-story').style.display = 'none';

    if (state.currentAudio) {
        state.currentAudio.pause();
        state.currentAudio.currentTime = 0; // Reset
    }

    state.currentSentenceIndex = 0;
    // Clear highlights
    document.querySelectorAll('.active-sentence').forEach(el => el.classList.remove('active-sentence'));
    document.querySelectorAll('.active-translation').forEach(el => el.classList.remove('active-translation'));

    // Restore UI elements (Translation button)
    resetAudioUI();
}

function pauseStory() {
    state.isPlaying = false;
    document.getElementById('play-story').style.display = 'flex';
    document.getElementById('pause-story').style.display = 'none';

    if (state.currentAudio) {
        state.currentAudio.pause();
    }

    // Remove all word highlights
    document.querySelectorAll('.story-word').forEach(w => {
        w.classList.remove('highlight');
    });
}



// Helper to delay
const SILENCE_PADDING = 0.1; // 300ms

async function speakStory() {
    if (!state.currentStory || !state.isPlaying) return;

    // RESUME logic: If audio exists AND matches current story, just play
    const expectedFilename = `story_${state.currentStory.id}_`;

    if (state.currentAudio) {
        // Check if this audio belongs to the current story
        if (state.currentAudio.src && state.currentAudio.src.includes(expectedFilename)) {
            // If it was finished, reset
            if (state.currentAudio.ended) {
                state.currentAudio.currentTime = 0;
                state.currentSentenceIndex = -1;
            }

            state.currentAudio.play().catch(e => console.error("Play error", e));
            startVisualSync(state.currentAudio, state.currentStory.sentences);
            return;
        } else {
            // Mismatch - pause and clear old audio
            state.currentAudio.pause();
            state.currentAudio = null;
        }
    }

    try {
        // 1. Get Full Story Audio (Better Intonation)
        const speed = getSelectedSpeed();
        const response = await fetch(`${API_BASE}/speech/story/${state.currentStory.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ speed: speed })
        });
        const data = await response.json();

        if (!data.success) {
            showError("Could not load audio.");
            stopStory();
            return;
        }

        const audio = new Audio(data.audio_url);
        state.currentAudio = audio;

        audio.onloadedmetadata = () => {
            startVisualSync(audio, state.currentStory.sentences);
            audio.play().catch(e => console.error("Play error", e));
        };

        audio.onended = () => {
            stopStory();
            state.currentSentenceIndex = 0;
            document.querySelectorAll('.active-sentence').forEach(el => el.classList.remove('active-sentence'));
        };

        audio.onerror = (e) => {
            console.error("Audio Playback Error", e);
            stopStory();
        };

    } catch (e) {
        console.error("Setup Error", e);
        stopStory();
    }
}

// startVisualSync is defined above (single definition with mode support).
// speakStory uses default mode 'normal' (highlights English); speakTranslation passes 'translation' (highlights Hindi/translated text).



// Deprecated single sentence player
async function playSentenceAudio(text) {
    // ... kept for fallback if needed, but unused now
    return;
}

// ===================================
// Practice Page
// ===================================
function initializePracticePage() {
    document.getElementById('start-practice')?.addEventListener('click', startPractice);
    document.getElementById('listen-sentence')?.addEventListener('click', listenToSentence);
    document.getElementById('record-speech')?.addEventListener('click', recordSpeech);
}

function startPractice() {
    // For now, use a simple sentence
    // In Phase 3, we'll integrate with stories
    const sentences = [
        "The dog is happy.",
        "I like to play.",
        "The sun is bright.",
        "I love my family.",
        "The car is red."
    ];

    const randomSentence = sentences[Math.floor(Math.random() * sentences.length)];
    document.getElementById('practice-sentence').textContent = randomSentence;

    // Hide feedback
    document.getElementById('practice-feedback').classList.add('hidden');
}

async function listenToSentence() {
    const sentence = document.getElementById('practice-sentence').textContent;

    if (sentence && sentence !== "Click \"Start Practice\" to begin") {
        // Use Backend TTS for consistency
        try {
            const speed = getSelectedSpeed();
            const response = await fetch(`${API_BASE}/speech/tts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: sentence, speed: speed })
            });
            const data = await response.json();

            if (data.success) {
                const audio = new Audio(data.audio_url);
                audio.play();
            } else {
                console.error("TTS Failed");
            }
        } catch (e) {
            console.error("TTS Error", e);
        }
    }
}

function recordSpeech() {
    if (!state.recognition) {
        showError('Speech recognition is not supported in your browser');
        return;
    }

    const sentence = document.getElementById('practice-sentence').textContent;
    if (sentence === "Click \"Start Practice\" to begin") {
        showError('Please start practice first');
        return;
    }

    const recordBtn = document.getElementById('record-speech');
    recordBtn.classList.add('recording');
    recordBtn.querySelector('span:last-child').textContent = 'Listening...';

    state.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        evaluateSpeech(sentence, transcript);
    };

    state.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        recordBtn.classList.remove('recording');
        recordBtn.querySelector('span:last-child').textContent = 'Record Your Voice';
        showError('Could not recognize speech. Please try again.');
    };

    state.recognition.onend = () => {
        recordBtn.classList.remove('recording');
        recordBtn.querySelector('span:last-child').textContent = 'Record Your Voice';
    };

    state.recognition.start();
}

async function evaluateSpeech(expectedText, spokenText) {
    try {
        const response = await fetch(`${API_BASE}/speech/evaluate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                expected_text: expectedText,
                spoken_text: spokenText
            })
        });

        const data = await response.json();

        if (data.success) {
            displayPracticeFeedback(data);
        }
    } catch (error) {
        console.error('Error evaluating speech:', error);
        showError('Failed to evaluate speech');
    }
}

function displayPracticeFeedback(data) {
    const feedbackContainer = document.getElementById('practice-feedback');

    const feedbackClass = data.accuracy >= 70 ? 'success' : 'info';
    const icon = data.accuracy >= 70 ? '🌟' : '💙';

    feedbackContainer.className = `practice-feedback ${feedbackClass}`;
    feedbackContainer.innerHTML = `
        <div class="feedback-icon">${icon}</div>
        <div class="feedback-text">${data.feedback}</div>
        <div class="feedback-encouragement">${data.encouragement}</div>
        ${data.words_to_practice && data.words_to_practice.length > 0 ? `
            <div style="margin-top: 1rem; font-size: 0.9rem; color: var(--text-secondary);">
                Practice these words: ${data.words_to_practice.join(', ')}
            </div>
        ` : ''}
    `;

    feedbackContainer.classList.remove('hidden');
}

// ===================================
// Quiz Page
// ===================================
// ===================================
// Quiz Page
// ===================================
function initializeQuizPage() {
    // When quiz page is accessed via nav, load stories
    document.querySelector('.nav-btn[data-page="quiz"]')?.addEventListener('click', loadQuizStories);
    document.querySelector('.hero-card[data-navigate="quiz"]')?.addEventListener('click', loadQuizStories);

    // Quit button
    document.getElementById('quit-quiz')?.addEventListener('click', () => {
        if (confirm("Are you sure you want to quit the quiz?")) {
            resetQuizUI();
        }
    });

    // Back to home from results
    document.getElementById('quiz-home-btn')?.addEventListener('click', () => {
        resetQuizUI();
        navigateToPage('stories');
    });

    // Next button
    document.getElementById('quiz-next-btn')?.addEventListener('click', () => {
        state.currentQuestionIndex++;
        if (state.currentQuestionIndex < state.currentQuestions.length) {
            showQuizQuestion(state.currentQuestionIndex);
        } else {
            finishQuiz();
        }
    });
}

function resetQuizUI() {
    document.getElementById('quiz-interface').classList.add('hidden');
    document.getElementById('quiz-results').classList.add('hidden');
    document.getElementById('quiz-story-selection').classList.remove('hidden');
    loadQuizStories();
}

async function loadQuizStories() {
    try {
        const container = document.getElementById('quiz-stories-list');
        container.innerHTML = '<p class="text-center">Loading stories...</p>';

        const response = await fetch(`${API_BASE}/stories`);
        const data = await response.json();

        if (data.success) {
            if (data.stories.length === 0) {
                container.innerHTML = '<p class="text-center">No stories available. Create one first!</p>';
                return;
            }

            container.innerHTML = data.stories.map(story => `
                <div class="story-card" data-quiz-story-id="${story.id}">
                    <div class="story-card-icon">🎯</div>
                    <h3>${story.title}</h3>
                    <span class="story-card-theme">${story.theme || 'General'}</span>
                </div>
            `).join('');

            // Add click handlers
            container.querySelectorAll('.story-card').forEach(card => {
                card.addEventListener('click', () => startQuiz(card.dataset.quizStoryId));
            });
        }
    } catch (error) {
        console.error('Error loading quiz stories:', error);
    }
}

async function startQuiz(storyId) {
    try {
        showLoading();
        state.currentQuizStoryId = storyId;

        const response = await fetch(`${API_BASE}/quiz/generate/${storyId}`, { method: 'POST' });
        const data = await response.json();

        if (data.success && data.questions.length > 0) {
            state.currentQuestions = data.questions;
            state.currentQuestionIndex = 0;
            state.quizScore = 0;

            // Show Interface
            document.getElementById('quiz-story-selection').classList.add('hidden');
            document.getElementById('quiz-interface').classList.remove('hidden');

            showQuizQuestion(0);
        } else {
            showError('Could not generate quiz for this story.');
        }
    } catch (error) {
        console.error('Error starting quiz:', error);
        showError('Failed to start quiz');
    } finally {
        hideLoading();
    }
}

function showQuizQuestion(index) {
    const question = state.currentQuestions[index];

    // Update Progress
    document.getElementById('quiz-current-num').textContent = index + 1;
    document.getElementById('quiz-total-num').textContent = state.currentQuestions.length;

    // Set text
    document.getElementById('quiz-question').textContent = question.question;

    // Render Options
    const optionsContainer = document.getElementById('quiz-options');
    optionsContainer.innerHTML = question.options.map((opt, idx) => `
        <button class="quiz-option-btn" onclick="checkQuizAnswer(this, '${opt.replace(/'/g, "\\'")}')">
            <span style="background: rgba(255,255,255,0.1); padding: 0.5rem 1rem; border-radius: 50%; margin-right: 1rem;">${String.fromCharCode(65 + idx)}</span>
            ${opt}
        </button>
    `).join('');

    // Setup Feedback (Hidden)
    document.getElementById('quiz-feedback').classList.add('hidden');
    document.getElementById('quiz-feedback').className = 'quiz-feedback hidden';

    // Disable next button initially (shown only after correct answer)
}

function checkQuizAnswer(btn, selectedAnswer) {
    // Prevent multiple clicks if already solved
    if (btn.parentElement.querySelector('.correct')) return;

    const question = state.currentQuestions[state.currentQuestionIndex];
    const isCorrect = selectedAnswer === question.correct_answer;

    const feedbackBox = document.getElementById('quiz-feedback');
    const title = document.getElementById('feedback-title');
    const msg = document.getElementById('feedback-message');
    const icon = document.getElementById('feedback-icon');

    if (isCorrect) {
        // Style Logic
        btn.classList.add('correct');
        // Disable other buttons
        btn.parentElement.querySelectorAll('.quiz-option-btn').forEach(b => {
            if (b !== btn) b.style.opacity = '0.5';
            b.disabled = true;
        });

        // Feedback
        feedbackBox.className = 'quiz-feedback success';
        title.textContent = "Correct!";
        msg.textContent = question.explanation || "Great job!";
        icon.textContent = "🌟";

        state.quizScore++;

        // Show Next Button
        feedbackBox.classList.remove('hidden');
        document.getElementById('quiz-next-btn').classList.remove('hidden');

    } else {
        // Wrong Answer
        btn.classList.add('wrong');
        btn.disabled = true; // Disable just this one

        // Feedback
        feedbackBox.className = 'quiz-feedback hint';
        title.textContent = "Not quite...";
        msg.textContent = question.hint || "Try again!";
        icon.textContent = "🤔";

        feedbackBox.classList.remove('hidden');
        document.getElementById('quiz-next-btn').classList.add('hidden'); // Hide next until correct
    }
}

async function finishQuiz() {
    document.getElementById('quiz-interface').classList.add('hidden');
    document.getElementById('quiz-results').classList.remove('hidden');

    const score = state.quizScore;
    const total = state.currentQuestions.length;

    document.getElementById('quiz-score').textContent = `${score}/${total}`;

    let encouragement = "";
    if (score === total) encouragement = "Perfect score! You're a super reader! 🌟";
    else if (score > total / 2) encouragement = "Great job! Keep reading! 📚";
    else encouragement = "Good effort! Practice makes perfect! 💪";

    document.getElementById('quiz-encouragement').textContent = encouragement;

    // Save Result
    try {
        await fetch(`${API_BASE}/quiz/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                story_id: state.currentQuizStoryId,
                score: (score / total) * 100
            })
        });
    } catch (e) {
        console.error("Failed to save quiz score", e);
    }
}

// ===================================
// Settings
// ===================================
function initializeSettings() {
    // Open Modal
    document.getElementById('settings-btn')?.addEventListener('click', () => {
        document.getElementById('settings-modal').classList.remove('hidden');
        loadSettings();
    });

    // Close Modal
    document.getElementById('close-settings')?.addEventListener('click', () => {
        document.getElementById('settings-modal').classList.add('hidden');
    });

    // Option Selection Logic
    document.querySelectorAll('.settings-options-grid').forEach(grid => {
        grid.addEventListener('click', (e) => {
            const option = e.target.closest('.settings-option');
            if (option && !option.classList.contains('disabled')) {
                // Deselect others in same grid
                grid.querySelectorAll('.settings-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
            }
        });
    });

    // Save
    document.getElementById('save-settings-btn')?.addEventListener('click', saveSettings);
}

async function loadSettings() {
    try {
        const response = await fetch(`${API_BASE}/settings`);
        const data = await response.json();

        if (data.success) {
            renderProviderOptions('llm', data.available_providers.llm, data.settings.llm_provider);
            renderProviderOptions('tts', data.available_providers.tts, data.settings.tts_provider);

            // Select Preset and Tone
            selectOption('voice-preset', data.settings.voice_preset || 'default');
            selectOption('tone', data.settings.story_tone || 'default');
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        showError('Failed to load settings');
    }
}

function renderProviderOptions(type, available, current) {
    const container = document.getElementById(`${type}-options`);
    container.innerHTML = '';

    // Define all known providers
    const allProviders = type === 'llm' ? [
        { id: 'default', name: 'Templates (Offline)', desc: 'Fast, Simple' },
        { id: 'gemini', name: 'Google Gemini', desc: 'Creative, Smart' },
        { id: 'openai', name: 'OpenAI GPT', desc: 'Premium Quality' }
    ] : [
        { id: 'default', name: 'Basic (Offline)', desc: 'Robotic Voice' },
        { id: 'edge_tts', name: 'Microsoft Edge', desc: 'Natural, Free' },
        { id: 'openai', name: 'OpenAI HD', desc: 'Ultra Realistic' },
        { id: 'elevenlabs', name: 'ElevenLabs', desc: 'Clone/Premium' }
    ];

    allProviders.forEach(p => {
        const isAvailable = available.includes(p.id);
        const div = document.createElement('div');
        div.className = `settings-option ${isAvailable ? '' : 'disabled'} ${current === p.id ? 'selected' : ''}`;
        div.dataset.value = p.id;
        div.innerHTML = `
            <div>
                <div class="option-label">${p.name}</div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">${p.desc}</div>
            </div>
            ${!isAvailable ? '<span class="option-tag">Key Missing</span>' : ''}
        `;
        container.appendChild(div);
    });
}

function selectOption(gridId, value) {
    const grid = document.getElementById(`${gridId}-options`);
    grid.querySelectorAll('.settings-option').forEach(opt => {
        if (opt.dataset.value === value) opt.classList.add('selected');
        else opt.classList.remove('selected');
    });
}

function getSelectedValue(gridId) {
    const selected = document.querySelector(`#${gridId}-options .settings-option.selected`);
    return selected ? selected.dataset.value : 'default';
}

async function saveSettings() {
    const settings = {
        llm_provider: getSelectedValue('llm'),
        tts_provider: getSelectedValue('tts'),
        voice_preset: getSelectedValue('voice-preset'),
        story_tone: getSelectedValue('tone')
    };

    try {
        const response = await fetch(`${API_BASE}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });

        const data = await response.json();
        if (data.success) {
            document.getElementById('settings-modal').classList.add('hidden');
            showError('Settings Saved!'); // Using Error toast as generic notification for now
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showError('Failed to save settings');
    }
}

// Global for onclick
window.checkQuizAnswer = checkQuizAnswer;

// ===================================
// Chat Page
// ===================================
function initializeChatPage() {
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send');

    chatSendBtn?.addEventListener('click', () => {
        const prompt = chatInput.value.trim();
        if (prompt) {
            processChatRequest(prompt);
        }
    });

    chatInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const prompt = chatInput.value.trim();
            if (prompt) {
                processChatRequest(prompt);
            }
        }
    });

    // Suggestion chips
    document.querySelectorAll('.suggestion-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const prompt = chip.dataset.prompt;
            chatInput.value = prompt;
            processChatRequest(prompt);
        });
    });
}

async function processChatRequest(prompt) {
    try {
        showLoading();

        const response = await fetch(`${API_BASE}/chatmode/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });

        const data = await response.json();

        if (data.success) {
            if (data.is_safe) {
                displayChatResponse(data);
            } else {
                displayChatSuggestion(data);
            }
        } else {
            showError('Failed to process request');
        }
    } catch (error) {
        console.error('Error processing chat request:', error);
        showError('Failed to process request');
    } finally {
        hideLoading();
    }
}

function displayChatResponse(data) {
    const imageArea = document.getElementById('chat-image-area');
    const explanationArea = document.getElementById('chat-explanation');

    // Display image (placeholder for now - will add actual images in Phase 6)
    const emoji = getCategoryEmoji(data.category);
    imageArea.innerHTML = `
        <div style="font-size: 10rem; text-align: center;">
            ${emoji}
        </div>
    `;

    // Display explanation
    explanationArea.classList.remove('hidden');
    explanationArea.innerHTML = data.explanation.map(text =>
        `<p class="explanation-text">${text}</p>`
    ).join('');

    // Optionally speak the explanation
    speakExplanation(data.explanation.join(' '));
}

function displayChatSuggestion(data) {
    const explanationArea = document.getElementById('chat-explanation');

    explanationArea.classList.remove('hidden');
    explanationArea.innerHTML = `
        <p class="explanation-text">${data.message}</p>
        <div style="margin-top: 1rem;">
            ${data.suggestions.map(s =>
        `<button class="suggestion-chip" onclick="document.getElementById('chat-input').value='show me a ${s}'; processChatRequest('show me a ${s}');">
                    ${s}
                </button>`
    ).join('')}
        </div>
    `;
}

function getCategoryEmoji(category) {
    const emojis = {
        'animals': '🐕',
        'vehicles': '🚗',
        'fruits': '🍎',
        'objects': '⚽',
        'nature': '🌳'
    };
    return emojis[category] || '📦';
}

function speakExplanation(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.lang = 'en-IN';
    state.synthesis.speak(utterance);
}

// ===================================
// Story Generator Functions
// ===================================
function getSelectedLength() {
    const activeBtn = document.querySelector('.length-btn.active');
    return activeBtn ? activeBtn.dataset.length : 'short';
}

function getSelectedSpeed() {
    // Check if we are in the generator page (dropdown)
    const dropdown = document.getElementById('gen-speed');
    if (dropdown && dropdown.offsetParent !== null) {
        return parseFloat(dropdown.value);
    }

    // Otherwise check the player buttons
    const activeBtn = document.querySelector('.speed-btn.active');
    if (activeBtn) {
        if (activeBtn.id === 'speed-slow') return 0.6;
        if (activeBtn.id === 'speed-normal') return 0.8;
        if (activeBtn.id === 'speed-fast') return 1.0;
    }
    return 0.8; // Default to 0.8
}

async function generateRandomStory() {
    try {
        showLoading();

        const length = getSelectedLength();
        const speed = getSelectedSpeed();

        // Get Language
        const languageSelect = document.getElementById('gen-language');
        const language = languageSelect ? languageSelect.value : 'en';

        const response = await fetch(`${API_BASE}/generator/random`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ length, speed, language })
        });

        const data = await response.json();

        if (data.success) {
            // Reload stories list
            await loadStories();

            // Show success message
            alert(`✨ ${data.message}\n\nStory: "${data.title}"`);

            // Optionally load the new story immediately
            if (data.story_id) {
                loadStory(data.story_id);
            }
        } else {
            showError('Failed to generate story');
        }
    } catch (error) {
        console.error('Error generating random story:', error);
        showError('Failed to generate story');
    } finally {
        hideLoading();
    }
}

async function generateTopicStory() {
    try {
        const topicInput = document.getElementById('story-topic');
        const topic = topicInput.value.trim();

        if (!topic) {
            showError('Please enter a topic for the story!');
            topicInput.focus();
            return;
        }

        showLoading();

        const length = getSelectedLength();
        const speed = parseFloat(document.getElementById('gen-speed').value || 1.0);

        // Get Language
        const languageSelect = document.getElementById('gen-language');
        const language = languageSelect ? languageSelect.value : 'en';

        const response = await fetch(`${API_BASE}/generator/topic`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, length, speed, language })
        });

        const data = await response.json();

        if (data.success) {
            // Clear the input
            topicInput.value = '';

            // Reload stories list
            await loadStories();

            // Show success message
            alert(`✨ ${data.message}\n\nStory: "${data.title}"`);

            // Load the new story immediately
            if (data.story_id) {
                loadStory(data.story_id);
            }
        } else {
            showError(data.error || 'Failed to generate story');
        }
    } catch (error) {
        console.error('Error generating topic story:', error);
        showError('Failed to generate story');
    } finally {
        hideLoading();
    }
}

// ===================================
// Recall & Writing Page
// ===================================
function initializeRecallPage() {
    // Back button
    document.getElementById('back-to-recall')?.addEventListener('click', () => {
        document.getElementById('due-stories-list').classList.remove('hidden');
        document.getElementById('writing-exercise').classList.add('hidden');
    });

    // Check Writing button
    document.getElementById('check-writing')?.addEventListener('click', checkWriting);

    // Load due stories when tab is clicked
    document.querySelector('.nav-btn[data-page="recall"]')?.addEventListener('click', loadDueStories);
    // Also from home page card
    // Note: The click handler for .hero-card in initializeHomePage handles navigation to 'recall' page
    // We just need to ensure loadDueStories is called when we enter the page.
    // We can modify navigateToPage to trigger load if it's recall page, OR just call it here.
    // For now, let's rely on the tab click or explicit call.
}

// Modify navigateToPage to load data
// (This needs a separate hook or simple check in navigateToPage, but let's just make sure we call it)

async function loadDueStories() {
    try {
        showLoading();
        const response = await fetch(`${API_BASE}/recall/due`);
        const data = await response.json();

        if (data.success) {
            displayDueStories(data.stories);
        } else {
            showError('Failed to load daily challenges');
        }
    } catch (error) {
        console.error('Error loading due stories:', error);
        showError('Failed to load challenges');
    } finally {
        hideLoading();
    }
}

function displayDueStories(stories) {
    const container = document.getElementById('due-stories-list');

    if (stories.length === 0) {
        container.innerHTML = `
            <div class="text-center" style="grid-column: 1/-1;">
                <h3>🎉 All caught up!</h3>
                <p>You've reviewed everything. Check back tomorrow!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = stories.map(story => `
        <div class="story-card" data-story-id="${story.id}">
            <div class="story-card-icon">
                ${story.status === 'due' ? '⚡' : '📝'}
            </div>
            <h3>${story.title}</h3>
            <span class="story-card-theme" style="background: ${story.status === 'due' ? 'var(--warning-color)' : 'var(--bg-secondary)'}">
                ${story.message}
            </span>
        </div>
    `).join('');

    // Add listeners
    container.querySelectorAll('.story-card').forEach(card => {
        card.addEventListener('click', () => startWritingExercise(card.dataset.storyId));
    });

    // Ensure visibility
    container.classList.remove('hidden');
    document.getElementById('writing-exercise').classList.add('hidden');
}

async function startWritingExercise(storyId) {
    try {
        showLoading();

        // Load prompt
        const response = await fetch(`${API_BASE}/recall/prompt/${storyId}`);
        const data = await response.json();

        if (data.success) {
            // Update UI
            document.getElementById('writing-story-title').textContent = data.story_title;
            document.getElementById('writing-prompt').textContent = data.prompt;

            // Set keywords
            const keywordsContainer = document.getElementById('writing-keywords');
            keywordsContainer.innerHTML = data.keywords.map(k =>
                `<span class="keyword-tag">${k}</span>`
            ).join('');

            // Reset input
            const input = document.getElementById('writing-input');
            input.value = '';
            input.dataset.keywords = JSON.stringify(data.keywords); // Store for checking

            // Reset feedback
            document.getElementById('writing-feedback').classList.add('hidden');


            // Show exercise
            document.getElementById('due-stories-list').classList.add('hidden');
            document.getElementById('writing-exercise').classList.remove('hidden');

        } else {
            showError('Failed to load writing exercise');
        }
    } catch (error) {
        console.error('Error starting writing exercise:', error);
        showError('Failed to load exercise');
    } finally {
        hideLoading();
    }
}

async function checkWriting() {
    const input = document.getElementById('writing-input');
    const text = input.value.trim();
    const keywords = JSON.parse(input.dataset.keywords || '[]');

    if (!text) {
        showError('Please write something first!');
        return;
    }

    try {
        showLoading();

        const response = await fetch(`${API_BASE}/recall/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, keywords })
        });

        const data = await response.json();

        if (data.success) {
            // Show feedback
            const feedbackSection = document.getElementById('writing-feedback');
            const feedbackTitle = document.getElementById('feedback-title');
            const feedbackList = document.getElementById('feedback-list');

            feedbackTitle.textContent = `${data.emoji} ${data.message} (Score: ${data.score}/100)`;
            feedbackList.innerHTML = data.feedback.map(f => `<li>${f}</li>`).join('');

            feedbackSection.classList.remove('hidden');
        } else {
            showError('Failed to check writing');
        }
    } catch (error) {
        console.error('Error checking writing:', error);
        showError('Failed to check writing');
    } finally {
        hideLoading();
    }
}

// ===================================
// Utility Functions
// ===================================
function showLoading() {
    document.getElementById('loading-overlay')?.classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-overlay')?.classList.add('hidden');
}

function showError(message) {
    alert(message); // Simple for now, can be enhanced with a toast notification
}

// Make processChatRequest available globally for inline onclick
window.processChatRequest = processChatRequest;

// ===================================
// Image Generation Helper
// ===================================
async function generateImage(story) {
    if (!story) return;

    // Avoid re-generating if we already have one (handled in displayStory, but safety check)
    if (story.image_category && story.image_category.startsWith('/')) return;

    console.log("Generating image for story:", story.id);
    const imgEl = document.getElementById('story-image');

    try {
        const response = await fetch(`${API_BASE}/images/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: `A scene from the story: ${story.title}. \n\n${story.content.substring(0, 200)}`,
                story_id: story.id
            })
        });

        const data = await response.json();

        if (data.success && data.image_url) {
            // Update UI
            if (imgEl) {
                imgEl.src = data.image_url;
                // Also update local state so we don't regen
                story.image_category = data.image_url;
            }
        } else {
            console.warn("Image gen failed:", data.error);
        }
    } catch (e) {
        console.error("Image Gen Error", e);
    }
}
