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
    selectedStories: new Set(),
    readerLayout: 'classic',  // 'classic' | 'step_by_step'
    stepByStepIndex: 0,
    stepByStepLanguage: 'en',  // 'en' | target_language (e.g. 'hi') for step-by-step narration
    stepCurrentAudio: null,    // current playing Audio in step-by-step; stop before playing next
    playMode: 'manual'         // 'manual' | 'automated' - selectable at start story
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

    initializeBuddyChat();
    initializeRecallPage();
    initializeSettings();
    initializeTinyStoriesPage();

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
        document.querySelector('.story-generator').classList.remove('hidden');
        document.querySelector('.story-management').classList.remove('hidden');
        stopStory();
        if (state.stepCurrentAudio) {
            state.stepCurrentAudio.pause();
            state.stepCurrentAudio.currentTime = 0;
            state.stepCurrentAudio = null;
        }
    });

    // Play mode toggle (Manual vs Automated) - selectable at start story
    document.getElementById('play-mode-auto')?.addEventListener('change', (e) => {
        state.playMode = e.target.checked ? 'automated' : 'manual';
        if (state.playMode === 'automated') {
            if (state.readerLayout === 'classic' && state.currentStory) playStory();
            else if (state.readerLayout === 'step_by_step' && state.currentStory && state.stepByStepLanguage != null)
                stepPlayCurrentSentence();
        } else {
            if (state.readerLayout === 'classic') pauseStory();
            else if (state.stepCurrentAudio) {
                state.stepCurrentAudio.pause();
                state.stepCurrentAudio.currentTime = 0;
                state.stepCurrentAudio = null;
            }
        }
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

    // Step-by-step reader
    document.getElementById('step-next')?.addEventListener('click', stepNext);
    document.getElementById('step-back')?.addEventListener('click', stepBack);
    document.getElementById('step-play-sentence')?.addEventListener('click', stepPlaySentence);
    document.getElementById('step-play-translation')?.addEventListener('click', stepPlayTranslation);
    document.getElementById('step-listen-english')?.addEventListener('click', () => stepChooseLanguage('en'));
    document.getElementById('step-listen-translation')?.addEventListener('click', function () {
        if (state.currentStory && state.currentStory.target_language) stepChooseLanguage(state.currentStory.target_language);
    });
    document.getElementById('step-back-to-stories')?.addEventListener('click', stepBackToStories);
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
    document.getElementById('stories-list').classList.add('hidden');
    document.querySelector('.story-generator').classList.add('hidden');
    document.querySelector('.story-management').classList.add('hidden');
    document.getElementById('story-reader').classList.remove('hidden');
    document.getElementById('story-reader-classic').classList.remove('hidden');
    document.getElementById('story-reader-step').classList.add('hidden');

    state.playMode = document.getElementById('play-mode-auto')?.checked ? 'automated' : 'manual';

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
    if (state.playMode === 'automated') setTimeout(() => playStory(), 300);
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
        const speed = (state.currentStory && state.currentStory.audio_speed != null) ? state.currentStory.audio_speed : getSelectedSpeed();
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
        if (state.currentAudio) {
            state.currentAudio.pause();
            state.currentAudio = null;
        }
        state.isPlaying = false;

        showLoading();
        const [storyRes, settingsRes] = await Promise.all([
            fetch(`${API_BASE}/stories/${storyId}`),
            fetch(`${API_BASE}/settings`)
        ]);
        const storyData = await storyRes.json();
        let settingsData = { success: true, settings: {} };
        try {
            settingsData = await settingsRes.json();
        } catch (e) { /* ignore */ }

        if (storyData.success) {
            state.currentStory = storyData.story;
            state.readerLayout = (settingsData.settings && settingsData.settings.reader_layout) || 'classic';
            if (state.readerLayout === 'step_by_step') {
                displayStoryStepByStep(storyData.story);
            } else {
                displayStory(storyData.story);
            }
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
        const speed = (state.currentStory && state.currentStory.audio_speed != null) ? state.currentStory.audio_speed : getSelectedSpeed();
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

// ===================================
// Step-by-step reader (one sentence + image at a time, Back/Next, language choice)
// ===================================
const STEP_LANG_NAMES = { hi: 'Hindi', es: 'Spanish', fr: 'French', de: 'German' };

function displayStoryStepByStep(story) {
    document.getElementById('stories-list').classList.add('hidden');
    document.querySelector('.story-generator').classList.add('hidden');
    document.querySelector('.story-management').classList.add('hidden');
    document.getElementById('story-reader').classList.remove('hidden');
    document.getElementById('story-reader-classic').classList.add('hidden');
    document.getElementById('story-reader-step').classList.remove('hidden');

    state.playMode = document.getElementById('play-mode-auto')?.checked ? 'automated' : 'manual';

    const titleEl = document.getElementById('step-story-title');
    if (story.translated_title && story.target_language && story.target_language !== 'en') {
        titleEl.innerHTML = `${story.title} <span style="font-size: 0.85em; color: var(--secondary-light);">/ ${story.translated_title}</span>`;
    } else {
        titleEl.textContent = story.title;
    }

    const isBilingual = story.target_language && story.target_language !== 'en';
    const choiceEl = document.getElementById('step-language-choice');
    const transBtn = document.getElementById('step-play-translation');
    if (isBilingual) {
        choiceEl.classList.remove('hidden');
        document.getElementById('step-translation-lang').textContent = STEP_LANG_NAMES[story.target_language] || story.target_language;
        document.getElementById('step-listen-translation').classList.remove('hidden');
        transBtn.classList.remove('hidden');
        state.stepByStepLanguage = null; // user must choose
    } else {
        choiceEl.classList.add('hidden');
        document.getElementById('step-listen-translation').classList.add('hidden');
        transBtn.classList.add('hidden');
        state.stepByStepLanguage = 'en';
    }

    state.stepByStepIndex = 0;
    updateStepByStepView();
    if (!isBilingual) {
        state.stepByStepLanguage = 'en';
        if (state.playMode === 'automated') setTimeout(() => stepPlayCurrentSentence(), 400);
    }
}

function updateStepByStepView() {
    const story = state.currentStory;
    if (!story || !story.sentences || !story.sentences.length) return;

    const idx = state.stepByStepIndex;
    const total = story.sentences.length;
    const sentence = story.sentences[idx];

    document.getElementById('step-moral-heading')?.classList.add('hidden');
    document.getElementById('step-sentence-text').textContent = sentence.sentence_text || '';
    const transEl = document.getElementById('step-sentence-translation');
    if (sentence.translated_text && story.target_language && story.target_language !== 'en') {
        transEl.textContent = sentence.translated_text;
        transEl.classList.remove('hidden');
    } else {
        transEl.textContent = '';
        transEl.classList.add('hidden');
    }

    document.getElementById('step-progress').textContent = `${idx + 1} / ${total}`;

    // First slide: only Next (no Back, Play, Play translation). Middle slides: Back + Next. End handled in stepNext.
    const navWrap = document.getElementById('step-controls-nav');
    const endWrap = document.getElementById('step-controls-end');
    const stepBackBtn = document.getElementById('step-back');
    const stepPlayBtn = document.getElementById('step-play-sentence');
    const stepPlayTransBtn = document.getElementById('step-play-translation');
    const stepNextBtn = document.getElementById('step-next');
    if (navWrap) navWrap.classList.remove('hidden');
    if (endWrap) endWrap.classList.add('hidden');
    if (idx === 0) {
        if (stepBackBtn) stepBackBtn.classList.add('hidden');
        if (stepPlayBtn) stepPlayBtn.classList.add('hidden');
        if (stepPlayTransBtn) stepPlayTransBtn.classList.add('hidden');
        if (stepNextBtn) stepNextBtn.classList.remove('hidden');
        // First slide: show Listen in English / Listen in Hindi for bilingual stories
        const choiceEl = document.getElementById('step-language-choice');
        if (choiceEl && story.target_language && story.target_language !== 'en') choiceEl.classList.remove('hidden');
    } else {
        if (stepBackBtn) stepBackBtn.classList.remove('hidden');
        if (stepPlayBtn) stepPlayBtn.classList.add('hidden');
        if (stepPlayTransBtn) stepPlayTransBtn.classList.add('hidden');
        if (stepNextBtn) stepNextBtn.classList.remove('hidden');
        // From slide 2 onward: hide language choice
        document.getElementById('step-language-choice')?.classList.add('hidden');
    }

    const imgEl = document.getElementById('step-sentence-image');
    const placeholderEl = document.getElementById('step-image-placeholder');
    placeholderEl.textContent = '🖼️';
    placeholderEl.style.display = 'block';
    imgEl.style.display = 'none';
    const imagePath = `/images/stories/story_${story.id}_sentence_${idx}.png`;
    imgEl.onerror = () => {
        if (state.currentStory && state.currentStory.id === story.id && state.stepByStepIndex === idx) {
            imgEl.style.display = 'none';
            placeholderEl.style.display = 'block';
        }
    };
    imgEl.onload = () => {
        if (state.currentStory && state.currentStory.id === story.id && state.stepByStepIndex === idx) {
            imgEl.style.display = 'block';
            placeholderEl.style.display = 'none';
        }
    };
    imgEl.src = imagePath;
}

function ensureSentenceImage(storyId, sentenceOrder, prompt, storyTitle) {
    const promptText = (prompt || 'A scene for a children story.').trim().substring(0, 200);
    const payload = {
        story_id: storyId,
        sentence_order: sentenceOrder,
        prompt: promptText
    };
    if (storyTitle) payload.story_title = storyTitle;
    return fetch(`${API_BASE}/images/generate-sentence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then(r => r.json()).then(data => {
        if (data.success && data.image_url) return data.image_url;
        throw new Error(data.error || 'Image failed');
    });
}

function stepNext() {
    if (state.stepCurrentAudio) {
        state.stepCurrentAudio.pause();
        state.stepCurrentAudio.currentTime = 0;
        state.stepCurrentAudio = null;
    }
    const story = state.currentStory;
    if (!story || !story.sentences) return;
    if (state.stepByStepIndex >= story.sentences.length) return;
    if (state.stepByStepIndex < story.sentences.length - 1) {
        state.stepByStepIndex++;
        updateStepByStepView();
        stepPlayCurrentSentence();
    } else {
        state.stepByStepIndex = story.sentences.length;
        const moral = story.moral;
        const moralHeading = document.getElementById('step-moral-heading');
        if (moral) {
            moralHeading?.classList.remove('hidden');
            document.getElementById('step-sentence-text').textContent = moral;
        } else {
            moralHeading?.classList.add('hidden');
            document.getElementById('step-sentence-text').textContent = 'The End';
        }
        document.getElementById('step-sentence-translation').classList.add('hidden');
        document.getElementById('step-sentence-image').style.display = 'none';
        document.getElementById('step-image-placeholder').style.display = 'block';
        document.getElementById('step-image-placeholder').textContent = '✨';
        document.getElementById('step-progress').textContent = 'The End';
        document.getElementById('step-controls-nav')?.classList.add('hidden');
        document.getElementById('step-controls-end')?.classList.remove('hidden');
    }
}

function stepBack() {
    if (state.stepCurrentAudio) {
        state.stepCurrentAudio.pause();
        state.stepCurrentAudio.currentTime = 0;
        state.stepCurrentAudio = null;
    }
    const story = state.currentStory;
    if (!story || !story.sentences) return;
    if (state.stepByStepIndex >= story.sentences.length) {
        state.stepByStepIndex = story.sentences.length - 1;
    } else if (state.stepByStepIndex > 0) {
        state.stepByStepIndex--;
    } else {
        return;
    }
    updateStepByStepView();
    stepPlayCurrentSentence();
}

function stepPlayCurrentSentence() {
    if (state.stepByStepLanguage == null) return;
    const story = state.currentStory;
    if (!story || !story.sentences) return;
    const idx = state.stepByStepIndex;
    if (idx >= story.sentences.length) return;
    const lang = state.stepByStepLanguage;
    const text = lang === 'en' ? story.sentences[idx].sentence_text : (story.sentences[idx].translated_text || story.sentences[idx].sentence_text);
    if (!text) return;
    stepTtsPlay(text, lang, idx);
}

async function stepTtsPlay(text, language, expectedIndex) {
    if (state.stepCurrentAudio) {
        state.stepCurrentAudio.pause();
        state.stepCurrentAudio.currentTime = 0;
        state.stepCurrentAudio = null;
    }
    try {
        const speed = (state.currentStory && state.currentStory.audio_speed != null) ? state.currentStory.audio_speed : getSelectedSpeed();
        const response = await fetch(`${API_BASE}/speech/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text, speed: speed, language: language || 'en' })
        });
        const data = await response.json();
        if (data.success && state.stepByStepIndex === expectedIndex) {
            const audio = new Audio(data.audio_url);
            state.stepCurrentAudio = audio;
            audio.onended = () => {
                state.stepCurrentAudio = null;
                if (state.playMode === 'automated') stepNext();
            };
            audio.onerror = () => { state.stepCurrentAudio = null; };
            audio.play();
        }
    } catch (e) {
        console.error('Step TTS error', e);
        state.stepCurrentAudio = null;
    }
}

async function stepPlaySentence() {
    stepPlayCurrentSentence();
}

async function stepPlayTranslation() {
    const story = state.currentStory;
    if (!story || !story.sentences || !story.target_language || story.target_language === 'en') return;
    const idx = state.stepByStepIndex;
    if (idx >= story.sentences.length) return;
    const text = story.sentences[idx].translated_text;
    if (!text) return;
    stepTtsPlay(text, story.target_language, idx);
}

function stepChooseLanguage(lang) {
    state.stepByStepLanguage = lang;
    // Keep language choice visible on first slide; it is hidden when moving to slide 2+ in updateStepByStepView
    stepPlayCurrentSentence();
}

function stepBackToStories() {
    document.getElementById('back-to-stories')?.click();
}

// Deprecated single sentence player
async function playSentenceAudio(text) {
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
            selectOption('reader-layout', data.settings.reader_layout || 'classic');

            // API Keys
            if (data.api_keys) {
                document.getElementById('settings-google-key').value = data.api_keys.google || '';
                document.getElementById('settings-openai-key').value = data.api_keys.openai || '';
                document.getElementById('settings-groq-key').value = data.api_keys.groq || '';
                document.getElementById('settings-hf-token').value = data.api_keys.hf_token || '';
            }
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
        { id: 'tinystories', name: 'TinyStories-33M', desc: 'Local & Kid Friendly' },
        { id: 'gemini', name: 'Google Gemini', desc: 'Creative, Smart' },
        { id: 'openai', name: 'OpenAI GPT', desc: 'Premium Quality' },
        { id: 'groq', name: 'Groq Llama 3', desc: 'Fast Open Source' }
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
        story_tone: getSelectedValue('tone'),
        reader_layout: getSelectedValue('reader-layout'),
        google_api_key: document.getElementById('settings-google-key').value.trim(),
        openai_api_key: document.getElementById('settings-openai-key').value.trim(),
        groq_api_key: document.getElementById('settings-groq-key').value.trim(),
        hf_token: document.getElementById('settings-hf-token').value.trim()
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
            loadSettings(); // Refresh to update provider availability
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showError('Failed to save settings');
    }
}

// Global for onclick
window.checkQuizAnswer = checkQuizAnswer;

// ===================================
// Buddy AI Chat
// ===================================
function initializeBuddyChat() {
    const input = document.getElementById('buddy-input');
    const sendBtn = document.getElementById('buddy-send');
    const resetBtn = document.getElementById('buddy-reset');

    sendBtn?.addEventListener('click', () => sendBuddyMessage());
    input?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendBuddyMessage();
    });
    resetBtn?.addEventListener('click', resetBuddyChat);

    // Initial Load
    loadBuddyHistory();
}

async function sendBuddyMessage() {
    const input = document.getElementById('buddy-input');
    const message = input.value.trim();
    if (!message) return;

    // Clear input
    input.value = '';

    // Add Omar's message to UI
    appendChatMessage('omar', message);

    try {
        const response = await fetch(`${API_BASE}/chatbot/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        const data = await response.json();

        if (data.success) {
            appendChatMessage('buddy', data.response);
        } else {
            appendChatMessage('buddy', "Sorry, I'm having a little trouble thinking. Can you try again? 😊");
        }
    } catch (err) {
        console.error(err);
        appendChatMessage('buddy', "Oh no! My internet brain is sleepy. 😴");
    }
}

async function loadBuddyHistory() {
    const container = document.getElementById('buddy-messages');
    try {
        const response = await fetch(`${API_BASE}/chatbot/history`);
        const data = await response.json();
        if (data.success && data.messages.length > 0) {
            container.innerHTML = '';
            data.messages.forEach(m => {
                appendChatMessage(m.role === 'user' ? 'omar' : 'buddy', m.content);
            });
        }
    } catch (err) {
        console.error(err);
    }
}

async function resetBuddyChat() {
    if (!confirm("Start a new chat with Buddy? This will clear our talk!")) return;
    try {
        await fetch(`${API_BASE}/chatbot/reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: 'omar_default' })
        });
        const container = document.getElementById('buddy-messages');
        container.innerHTML = `
            <div class="message buddy">
                <div class="message-content">Hi Omar! Let's talk about something new! 😊</div>
            </div>
        `;
    } catch (err) {
        console.error(err);
    }
}

function appendChatMessage(role, content) {
    const container = document.getElementById('buddy-messages');
    if (!container) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    msgDiv.innerHTML = `<div class="message-content">${content}</div>`;
    container.appendChild(msgDiv);

    // Auto Scroll
    container.scrollTop = container.scrollHeight;
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
        const speed = parseFloat(document.getElementById('gen-speed')?.value || '0.8') || 0.8;

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
        const speed = parseFloat(document.getElementById('gen-speed')?.value || '0.8') || 0.8;

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
// ===================================
// TinyStories Feature
// ===================================

function initializeTinyStoriesPage() {
    loadTinyStories();

    // Event listeners
    document.getElementById('ts-generate-btn')?.addEventListener('click', () => generateTinyStory());
    document.getElementById('ts-random-btn')?.addEventListener('click', () => generateTinyStory('random'));
    document.getElementById('ts-back-btn')?.addEventListener('click', () => {
        document.getElementById('ts-reader').classList.add('hidden');
        document.getElementById('ts-generator-box').classList.remove('hidden');
        document.getElementById('ts-list').classList.remove('hidden');
    });

    document.getElementById('ts-start-test-btn')?.addEventListener('click', () => {
        document.getElementById('ts-test-section').classList.remove('hidden');
        document.getElementById('ts-start-test-btn').classList.add('hidden');
    });

    document.getElementById('ts-regen-assets-btn')?.addEventListener('click', () => {
        const id = document.getElementById('ts-reader').dataset.currentId;
        if (id) regenTinyStoryAssets(id);
    });
}

async function loadTinyStories() {
    try {
        // Fetch progress stats
        fetch(`${API_BASE}/tinystories/vocabulary`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const total = data.vocabulary.length;
                    const learned = data.vocabulary.filter(i => i.status === 'mastered').length;
                    document.getElementById('ts-learned-count').innerText = learned;
                    document.getElementById('ts-seen-count').innerText = total;
                    document.getElementById('ts-progress-container').style.display = total > 0 ? 'flex' : 'none';
                }
            });

        const response = await fetch(`${API_BASE}/tinystories/`);
        const data = await response.json();
        const container = document.getElementById('ts-list');

        if (data.success) {
            if (data.stories.length === 0) {
                container.innerHTML = '<p class="text-center">No stories yet. Generate one!</p>';
                return;
            }

            container.innerHTML = data.stories.map(story => `
                <div class="story-card" data-id="${story.id}">
                    <div class="story-card-img-container">
                        ${story.image_url
                    ? `<img src="${story.image_url}" class="story-thumbnail" alt="${story.title}">`
                    : `<div class="story-card-icon">🧸</div>`
                }
                    </div>
                    <h3>${story.title}</h3>
                </div>
            `).join('');

            container.querySelectorAll('.story-card').forEach(c => {
                c.addEventListener('click', () => loadTinyStoryDetail(c.dataset.id));
            });
        }
    } catch (e) {
        console.error(e);
    }
}

async function generateTinyStory(forcedTopic = null) {
    let topic = forcedTopic || document.getElementById('ts-topic').value.trim();
    if (!topic) {
        alert("Please enter a topic!");
        return;
    }

    const btn = document.getElementById('ts-generate-btn');
    const randomBtn = document.getElementById('ts-random-btn');
    const speed = document.getElementById('ts-gen-speed')?.value || '0.8';
    const ogHtml = btn.innerHTML;
    try {
        btn.innerHTML = 'Generating... (Takes ~10s)';
        btn.disabled = true;
        if (randomBtn) randomBtn.disabled = true;

        const response = await fetch(`${API_BASE}/tinystories/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, speed })
        });
        const data = await response.json();

        if (data.success) {
            document.getElementById('ts-topic').value = '';
            await loadTinyStories();
            await loadTinyStoryDetail(data.story_id);
        } else {
            alert("Error: " + data.error);
        }
    } catch (e) {
        console.error(e);
        alert("Generation failed");
    } finally {
        btn.innerHTML = ogHtml;
        btn.disabled = false;
        if (randomBtn) randomBtn.disabled = false;
    }
}

async function loadTinyStoryDetail(id) {
    try {
        const response = await fetch(`${API_BASE}/tinystories/${id}`);
        const data = await response.json();
        if (data.success) {
            const story = data.story;
            document.getElementById('ts-reader').dataset.currentId = id;

            // UI toggles
            document.getElementById('ts-list').classList.add('hidden');
            document.getElementById('ts-generator-box').classList.add('hidden');
            document.getElementById('ts-reader').classList.remove('hidden');
            document.getElementById('ts-test-section').classList.add('hidden');
            document.getElementById('ts-start-test-btn').classList.remove('hidden');

            // Populate Content
            document.getElementById('ts-title').innerText = story.title;
            const textEl = document.getElementById('ts-text');
            const words = story.content.split(/\s+/);
            textEl.innerHTML = words.map((w, idx) => `<span class="story-word" data-idx="${idx}">${w} </span>`).join('');
            document.getElementById('ts-moral-text').innerText = story.moral || "Be kind and good.";

            // Image
            const imgContainer = document.getElementById('ts-featured-image-container');
            const imgEl = document.getElementById('ts-featured-image');
            if (story.image_url) {
                imgEl.src = story.image_url;
                imgContainer.classList.remove('hidden');
            } else {
                imgContainer.classList.add('hidden');
                imgEl.src = '';
            }

            // Audio
            const audioContainer = document.getElementById('ts-audio-player-container');
            const audioEl = document.getElementById('ts-audio-player');
            if (story.audio_url) {
                audioEl.src = story.audio_url;
                audioContainer.classList.remove('hidden');

                // Audio sync
                audioEl.onplay = () => {
                    startTinyStorySync(audioEl, words.length);
                };
                audioEl.onpause = () => {
                    // Sync loop should stop automatically if audio is paused
                };
                audioEl.onended = () => {
                    document.querySelectorAll('.story-word').forEach(w => w.classList.remove('highlight'));
                };
            } else {
                audioContainer.classList.add('hidden');
                audioEl.src = '';
            }

            // If assets are missing, poll once or twice
            if (!story.image_url || !story.audio_url) {
                setTimeout(() => {
                    const currentId = document.getElementById('ts-reader').dataset.currentId;
                    if (currentId == id) loadTinyStoryDetail(id);
                }, 10000); // Wait 10s then check again
            }

            // Vocab
            const vocabContainer = document.getElementById('ts-vocab-list');
            if (story.vocab && story.vocab.length) {
                // Fetch current vocab progress to show badges
                const vResponse = await fetch(`${API_BASE}/tinystories/vocabulary`);
                const vData = await vResponse.json();
                const masteredWords = (vData.vocabulary || [])
                    .filter(item => item.status === 'mastered')
                    .map(item => item.word.toLowerCase());

                vocabContainer.innerHTML = story.vocab.map(v => {
                    const isMastered = masteredWords.includes(v.word.toLowerCase());
                    return `
                        <div class="vocab-card ${isMastered ? 'mastered' : ''}" id="vocab-${v.word.replace(/\s+/g, '-')}">
                            <div style="display: flex; justify-content: space-between; align-items: start; width: 100%;">
                                <span class="vocab-word">${v.word}</span>
                                ${isMastered ? '<span class="badge mastered">✅ Learned</span>' : '<span class="badge new">🆕 New</span>'}
                            </div>
                            <span class="vocab-def">${v.meaning}</span>
                            <button class="control-btn mini" 
                                    style="margin-top: 0.5rem; font-size: 0.75rem; width: 100%;"
                                    onclick="updateTsVocabStatus('${v.word}', '${isMastered ? 'learning' : 'mastered'}')">
                                ${isMastered ? 'Mark for Review' : 'Mark as Learned'}
                            </button>
                        </div>
                    `;
                }).join('');
                document.getElementById('ts-vocab-box').classList.remove('hidden');
            } else {
                document.getElementById('ts-vocab-box').classList.add('hidden');
            }

            // FIB
            const fibContainer = document.getElementById('ts-fib-list');
            if (story.fill_in_blanks && story.fill_in_blanks.length) {
                fibContainer.innerHTML = story.fill_in_blanks.map((q, idx) => `
                    <div style="margin-bottom: 1rem;">
                        <p><strong>${idx + 1}.</strong> ${q.sentence.replace('____', '<span style="border-bottom: 2px solid; padding: 0 10px; color: var(--primary);">____</span>')}</p>
                        <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap;">
                            ${q.options.map(o => `
                                <button class="control-btn" style="font-size: 0.9rem;" onclick="checkTsAnswer(this, '${o}', '${q.answer}')">${o}</button>
                            `).join('')}
                        </div>
                    </div>
                `).join('');
            } else {
                fibContainer.innerHTML = "<p>No questions generated.</p>";
            }

            // MCQ
            const mcqContainer = document.getElementById('ts-mcq-list');
            if (story.mcqs && story.mcqs.length) {
                mcqContainer.innerHTML = story.mcqs.map((q, idx) => `
                    <div style="margin-bottom: 1rem;">
                        <p><strong>${idx + 1}.</strong> ${q.question}</p>
                        <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem;">
                            ${q.options.map(o => `
                                <button class="control-btn" style="text-align: left;" onclick="checkTsAnswer(this, '${o}', '${q.correct_answer}')">${o}</button>
                            `).join('')}
                        </div>
                    </div>
                `).join('');
            } else {
                mcqContainer.innerHTML = "<p>No questions generated.</p>";
            }

            // Moral Qs
            const moralQContainer = document.getElementById('ts-moral-q-list');
            if (story.moral_questions && story.moral_questions.length) {
                moralQContainer.innerHTML = story.moral_questions.map((q, idx) => `
                    <div style="margin-bottom: 1rem;">
                        <p><strong>${idx + 1}.</strong> ${q.question}</p>
                        <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem;">
                            ${q.options.map(o => `
                                <button class="control-btn" style="text-align: left;" onclick="checkTsAnswer(this, '${o}', '${q.correct_answer}')">${o}</button>
                            `).join('')}
                        </div>
                    </div>
                `).join('');
            } else {
                moralQContainer.innerHTML = "<p>No questions generated.</p>";
            }

        }
    } catch (e) {
        console.error(e);
    }
}

window.checkTsAnswer = function (btn, selected, correct) {
    if (selected === correct) {
        btn.style.backgroundColor = 'var(--success-color, #10b981)';
        btn.style.color = 'white';
        btn.innerText += ' ✅';
    } else {
        btn.style.backgroundColor = 'var(--danger-color, #ef4444)';
        btn.style.color = 'white';
        btn.innerText += ' ❌';
    }
    // Disable siblings
    Array.from(btn.parentElement.children).forEach(b => b.disabled = true);
};

async function regenTinyStoryAssets(id) {
    const btn = document.getElementById('ts-regen-assets-btn');
    const ogHtml = btn.innerHTML;
    try {
        btn.innerHTML = '✨ Generating...';
        btn.disabled = true;
        const response = await fetch(`${API_BASE}/tinystories/assets/${id}`, { method: 'POST' });
        const data = await response.json();
        if (data.success) {
            alert("Asset generation started! They will appear automatically in a few seconds.");
            // Detail will auto-refresh due to polling in loadTinyStoryDetail
        } else {
            alert("Error: " + data.error);
        }
    } catch (e) {
        console.error(e);
        alert("Failed to start asset generation");
    } finally {
        btn.innerHTML = ogHtml;
        btn.disabled = false;
    }
}

function startTinyStorySync(audio, totalWords) {
    const SILENCE_PADDING = 0.1;
    const updateLoop = () => {
        if (audio.paused || audio.ended) return;

        const totalDuration = audio.duration;
        if (!totalDuration) {
            requestAnimationFrame(updateLoop);
            return;
        }

        const effectiveTime = Math.max(0, audio.currentTime - SILENCE_PADDING);
        const contentDuration = Math.max(0, totalDuration - SILENCE_PADDING);

        // Simple proportional mapping
        const wordIndex = Math.floor((effectiveTime / contentDuration) * totalWords);

        // Highlight logic
        const words = document.querySelectorAll('.story-word');
        words.forEach((w, idx) => {
            if (idx === wordIndex) {
                w.classList.add('highlight');
                // Scroll into view if needed
                if (idx % 10 === 0) w.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                w.classList.remove('highlight');
            }
        });

        requestAnimationFrame(updateLoop);
    };

    requestAnimationFrame(updateLoop);
}

async function updateTsVocabStatus(word, status) {
    try {
        const response = await fetch(`${API_BASE}/tinystories/vocabulary/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word, status })
        });
        const data = await response.json();
        if (data.success) {
            // Refresh current story detail to update UI badges
            const id = document.getElementById('ts-reader').dataset.currentId;
            if (id) loadTinyStoryDetail(id);
        } else {
            alert("Update failed: " + data.error);
        }
    } catch (e) {
        console.error(e);
        alert("Failed to update vocabulary status");
    }
}
