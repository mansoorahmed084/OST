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
    playMode: 'manual',         // 'manual' | 'automated' - selectable at start story
    tsQuizScore: 0,
    tsQuizTotal: 0,
    // Scramble game state
    scrambleSentences: [],
    scrambleCurrentIndex: 0,
    scrambleWorkspace: []
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
    initializeVocabularyPage();
    initializeScramblePage();

    // Initialize Speech Recognition if available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        state.recognition = new SpeechRecognition();
        state.recognition.continuous = false;
        state.recognition.interimResults = true; // Show results in real time
        state.recognition.lang = 'en-IN'; // Indian accent focus
        console.log('Speech Recognition initialized');
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

        if (pageName === 'recall') {
            updateAdventureProgress();
        } else if (pageName === 'achievements') {
            loadAchievements();
        } else if (pageName === 'tinystories') {
            loadTinyStories();
        } else if (pageName === 'vocabulary') {
            loadVocabularyPage();
        } else if (pageName === 'scramble') {
            loadScrambleStoriesPicker();
        } else if (pageName === 'home') {
            updateAdventureProgress();
        }
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

    // Refresh progress on load
    updateAdventureProgress();
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
    console.log("deleteSelectedStories clicked!", state.selectedStories);
    if (state.selectedStories.size === 0) {
        console.log("No stories selected, returning");
        return;
    }

    const isConfirmed = await new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.7)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '9999';
        overlay.style.backdropFilter = 'blur(3px)';

        const modal = document.createElement('div');
        modal.style.backgroundColor = 'var(--bg-card)';
        modal.style.padding = '2rem';
        modal.style.borderRadius = '12px';
        modal.style.textAlign = 'center';
        modal.style.minWidth = '300px';
        modal.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';

        modal.innerHTML = `
            <div style="font-size: 2.5rem; margin-bottom: 1rem;">🗑️</div>
            <h3 style="margin-top:0; font-size: 1.5rem;">Delete Stories</h3>
            <p style="color: var(--text-secondary); margin-bottom: 2rem;">Are you sure you want to delete ${state.selectedStories.size} stories?</p>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button id="btn-cancel-delete" class="control-btn" style="flex: 1;">Cancel</button>
                <button id="btn-confirm-delete" class="control-btn" style="flex: 1; background: var(--error-color); color: white;">Delete</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        document.getElementById('btn-cancel-delete').onclick = () => {
            document.body.removeChild(overlay);
            resolve(false);
        };

        document.getElementById('btn-confirm-delete').onclick = () => {
            document.body.removeChild(overlay);
            resolve(true);
        };
    });

    if (!isConfirmed) {
        console.log("User cancelled deletion");
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

            // Log that the user finished reading/listening to the story
            submitActivity('story_read', state.currentStory.id, 100);
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

        // Log that the user finished reading the story manually
        submitActivity('story_read', state.currentStory.id, 100);
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
    document.getElementById('start-practice')?.addEventListener('click', () => {
        stopBuddy();
        startPractice();
    });
    document.getElementById('listen-sentence')?.addEventListener('click', () => {
        stopBuddy();
        listenToSentence();
    });
    document.getElementById('record-speech')?.addEventListener('click', () => {
        stopBuddy();
        recordSpeech();
    });
}

async function startPractice() {
    try {
        const response = await fetch(`${API_BASE}/stories/random-sentence`);
        const data = await response.json();
        const sentence = data.success ? data.sentence : "The dog is happy";

        // Create Word Bubbles UI
        const container = document.getElementById('practice-sentence');
        container.innerHTML = '';

        const words = sentence.split(/\s+/);
        words.forEach((word) => {
            const bubble = document.createElement('span');
            bubble.className = 'word-bubble';
            bubble.textContent = word;
            bubble.dataset.word = word.toLowerCase().replace(/[^a-z]/g, '');
            container.appendChild(bubble);
        });

        // Hide feedback
        document.getElementById('practice-feedback').classList.add('hidden');

        // Store original string for evaluation
        container.dataset.fullSentence = sentence;
    } catch (e) {
        console.error("Failed to load practice sentence", e);
        showError("Could not load a new sentence. Please try again.");
    }
}

async function listenToSentence() {
    const container = document.getElementById('practice-sentence');
    const sentence = container.dataset.fullSentence;

    if (sentence && container.children.length > 0) {
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

    const container = document.getElementById('practice-sentence');
    const sentence = container.dataset.fullSentence;
    if (!sentence || container.children.length === 0 || sentence === "Click \"Start Practice\" to begin") {
        showError('Please start practice first');
        return;
    }

    const recordBtn = document.getElementById('record-speech');
    recordBtn.classList.add('recording');
    recordBtn.querySelector('span:last-child').textContent = 'Listening...';

    // Clear previous handlers to avoid leaks
    state.recognition.onresult = null;
    state.recognition.onerror = null;
    state.recognition.onend = null;

    state.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }

        // Show live feedback
        if (interimTranscript) {
            recordBtn.querySelector('span:last-child').textContent = '...' + interimTranscript;
        }

        if (finalTranscript) {
            console.log('Final Transcript:', finalTranscript);
            evaluateSpeech(sentence, finalTranscript);
        }
    };

    state.recognition.onsoundstart = () => {
        console.log('Mic is receiving sound...');
        recordBtn.style.boxShadow = '0 0 20px var(--primary-color)';
    };

    state.recognition.onsoundend = () => {
        recordBtn.style.boxShadow = 'none';
    };

    state.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        recordBtn.classList.remove('recording');
        recordBtn.querySelector('span:last-child').textContent = 'Record Your Voice';

        let msg = 'Could not recognize speech. Please try again.';
        if (event.error === 'not-allowed') {
            msg = 'Microphone access denied. Please click the icon in your browser address bar to allow microphone access.';
        } else if (event.error === 'no-speech') {
            msg = 'No speech detected. Please check your microphone and speak louder.';
        } else if (event.error === 'network') {
            msg = 'Network error. Speech recognition requires an internet connection.';
        } else if (event.error === 'audio-capture') {
            msg = 'No microphone was found or it is disabled. Please check your microphone connection and Windows Sound Settings.';
        } else {
            msg = `Speech recognition error: ${event.error}. Please try again.`;
        }
        showError(msg);
    };

    state.recognition.onend = () => {
        console.log('Speech recognition ended');
        recordBtn.classList.remove('recording');
        recordBtn.querySelector('span:last-child').textContent = 'Record Your Voice';
    };

    try {
        state.recognition.stop(); // Stop any pending instance
    } catch (e) { }

    setTimeout(() => {
        try {
            state.recognition.start();
            console.log('Speech recognition started');
        } catch (e) {
            console.error('Failed to start recognition:', e);
            recordBtn.classList.remove('recording');
            recordBtn.querySelector('span:last-child').textContent = 'Record Your Voice';
            showError('Could not start microphone. Is another app using it?');
        }
    }, 100);
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
            if (data.accuracy >= 70) {
                checkAchievements('practice', data.accuracy);
            }
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

    // Highlight/Pop Word Bubbles
    const container = document.getElementById('practice-sentence');
    const bubbles = container.querySelectorAll('.word-bubble');

    // Spoken Text matching
    const spokenWords = (data.spoken_text || '').toLowerCase().split(/\s+/);

    bubbles.forEach(bubble => {
        const targetWord = bubble.dataset.word;
        if (spokenWords.includes(targetWord)) {
            bubble.classList.add('popped');
        } else {
            bubble.classList.add('missed');
        }
    });

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

    // Buddy speaks feedback
    speakBuddy(data.feedback + " " + data.encouragement);

    // Complete activity if accuracy is good
    if (data.accuracy >= 70) {
        updateAdventureProgress(); // Refresh progress bar explicitly
        showStickerReward();
    }
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

// === Daily Adventure / Recall Management ===
async function submitActivity(activityType, storyId = null, score = 0, details = null) {
    try {
        await fetch(`${API_BASE}/quiz/submit`, { // Re-using existing progress save route for generic activities
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                story_id: storyId || 0,
                activity_type: activityType,
                score: score,
                details: details
            })
        });
        updateAdventureProgress();
        checkAchievements(activityType, score);
    } catch (e) {
        console.error("Failed to submit activity", e);
    }
}

async function updateAdventureProgress() {
    try {
        const response = await fetch(`${API_BASE}/recall/daily-progress`);
        const data = await response.json();

        if (data.success) {
            const missions = data.missions;
            const progress = data.percentage;

            // Update Home Progress Bar
            const bar = document.getElementById('adventure-progress-fill');
            const text = document.getElementById('adventure-progress-text');
            if (bar) bar.style.width = `${progress}%`;
            if (text) text.textContent = `${data.completed}/${data.total} Missions`;

            // Update Recall Page Cards
            updateMissionCard('mission-read', missions.read);
            updateMissionCard('mission-practice', missions.practice);
            updateMissionCard('mission-chat', missions.chat);
            updateMissionCard('mission-scramble', missions.scramble);

            // If all done, maybe a special celebration?
            if (data.completed === data.total && !state.dailyCelebrated) {
                state.dailyCelebrated = true;
                // show celebration?
            }
        }
    } catch (e) {
        console.error("Failed to update daily progress", e);
    }
}

function updateMissionCard(id, isCompleted) {
    const card = document.getElementById(id);
    if (!card) return;

    if (isCompleted) {
        card.classList.add('completed');
        card.querySelector('.mission-status').textContent = '✅';
    } else {
        card.classList.remove('completed');
        card.querySelector('.mission-status').textContent = '⏳';
    }
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

// Helper to stop Buddy's voice immediately
function stopBuddy() {
    if (state.currentBuddyAudio) {
        state.currentBuddyAudio.pause();
        state.currentBuddyAudio.currentTime = 0;
    }
}

// Helper to speak text using Buddy's voice
async function speakBuddy(text) {
    try {
        stopBuddy();
        const response = await fetch(`${API_BASE}/speech/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                speed: 0.8 // Kid-friendly slow speed
            })
        });
        const data = await response.json();
        if (data.success) {
            if (state.currentBuddyAudio) state.currentBuddyAudio.pause();
            const audio = new Audio(data.audio_url);
            state.currentBuddyAudio = audio;
            audio.play().catch(e => console.error("Audio play error", e));
        }
    } catch (e) {
        console.error("Buddy TTS error", e);
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

    // Buddy speaks the question
    speakBuddy(question.question);
}

function showStickerReward() {
    const stickers = ['🌟', '⭐', '🎈', '🎉', '🚀', '🌈', '🍦', '🦁', '🦖', '⚽'];
    const sticker = stickers[Math.floor(Math.random() * stickers.length)];

    const div = document.createElement('div');
    div.className = 'sticker-reward';
    div.textContent = sticker;
    document.body.appendChild(div);

    // Remove after animation
    setTimeout(() => div.remove(), 1500);
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

        // Buddy praises
        speakBuddy(title.textContent + " " + msg.textContent);

        // Show Sticker
        showStickerReward();

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

        // Buddy hints
        speakBuddy(title.textContent + " " + msg.textContent);

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
            })
        });

        let percentage = (score / total) * 100;
        if (percentage === 100) {
            checkAchievements('quiz_perfect', 100);
        } else {
            checkAchievements('quiz', percentage);
        }
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

    // Initial Load - Update progress when entering recall or home
    document.querySelector('.nav-btn[data-page="recall"]')?.addEventListener('click', updateAdventureProgress);
    document.querySelector('.nav-btn[data-page="home"]')?.addEventListener('click', updateAdventureProgress);

    // Periodically update
    setInterval(updateAdventureProgress, 60000);
    updateAdventureProgress();

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
            checkAchievements('chat', 0);
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
        document.getElementById('daily-missions-list').classList.remove('hidden');
        document.getElementById('writing-exercise').classList.add('hidden');
    });

    // Scramble Controls
    document.getElementById('check-scramble')?.addEventListener('click', checkScrambleSentence);
    document.getElementById('reset-scramble')?.addEventListener('click', () => renderScrambleSentence(state.scrambleCurrentIndex));
    document.getElementById('next-scramble')?.addEventListener('click', nextScrambleSentence);

    // Story Builder mission card click
    document.getElementById('mission-scramble')?.addEventListener('click', startRandomScramble);

    // Other mission card clicks - navigate to their respective pages
    document.getElementById('mission-read')?.addEventListener('click', () => navigateToPage('stories'));
    document.getElementById('mission-practice')?.addEventListener('click', () => navigateToPage('practice'));
    document.getElementById('mission-chat')?.addEventListener('click', () => navigateToPage('chat'));
}

// Modify navigateToPage to load data
// (This needs a separate hook or simple check in navigateToPage, but let's just make sure we call it)


async function startWritingExercise(storyId) {
    try {
        showLoading();

        // Load prompt with sentences
        const response = await fetch(`${API_BASE}/recall/prompt/${storyId}`);
        const data = await response.json();

        if (data.success) {
            // Update UI
            document.getElementById('writing-story-title').textContent = data.story_title;

            // Start Scramble Game with the story's sentences
            state.scrambleSentences = data.sentences || [];
            state.scrambleCurrentIndex = 0;

            if (state.scrambleSentences.length > 0) {
                document.getElementById('scramble-total').textContent = state.scrambleSentences.length;
                renderScrambleSentence(0);
            }

            // Show exercise, hide missions & stories list
            document.getElementById('daily-missions-list').classList.add('hidden');
            document.getElementById('writing-exercise').classList.remove('hidden');
        } else {
            showError('Failed to load scramble challenge');
        }
    } catch (error) {
        console.error('Error starting scramble exercise:', error);
        showError('Failed to load exercise');
    } finally {
        hideLoading();
    }
}

// Start a random scramble from any available story
async function startRandomScramble() {
    try {
        showLoading();
        // First try recall/due stories
        let response = await fetch(`${API_BASE}/recall/due`);
        let data = await response.json();

        if (data.success && data.stories && data.stories.length > 0) {
            const randomStory = data.stories[Math.floor(Math.random() * data.stories.length)];
            await startWritingExercise(randomStory.id);
            return;
        }

        // Fallback: try any read story from the stories list
        response = await fetch(`${API_BASE}/stories`);
        data = await response.json();

        if (data.success && data.stories && data.stories.length > 0) {
            const readStories = data.stories.filter(s => s.last_read);
            if (readStories.length > 0) {
                const randomStory = readStories[Math.floor(Math.random() * readStories.length)];
                await startWritingExercise(randomStory.id);
                return;
            }
        }

        showToast('Read some stories first to unlock Story Builder!', '📖');
    } catch (e) {
        console.error('Random scramble error:', e);
        showToast('Failed to start scramble game.', '❌');
    } finally {
        hideLoading();
    }
}

// === Scramble Game Engine ===
function renderScrambleSentence(index) {
    if (index >= state.scrambleSentences.length) {
        finishScrambleGame();
        return;
    }

    const sentence = state.scrambleSentences[index];
    state.scrambleWorkspace = [];
    state.scrambleCurrentIndex = index;

    // Update Progress
    document.getElementById('scramble-current').textContent = index + 1;
    document.getElementById('writing-feedback').classList.add('hidden');
    document.getElementById('next-scramble').classList.add('hidden');

    // Prepare Workspace
    const workspace = document.getElementById('scramble-workspace');
    workspace.innerHTML = '<div class="placeholder-text">Click the words below to build the sentence!</div>';

    // Prepare Words Pool
    const pool = document.getElementById('scramble-words');
    pool.innerHTML = '';

    // Split into words and keep track of original indices
    const words = sentence.trim().split(/\s+/);
    // Create shuffled word list with unique IDs to handle duplicate words
    const wordItems = words.map((word, idx) => ({ word, id: idx }));
    const shuffled = [...wordItems].sort(() => Math.random() - 0.5);

    shuffled.forEach((item) => {
        const chip = document.createElement('div');
        chip.className = 'scramble-chip';
        chip.textContent = item.word;
        chip.dataset.wordId = item.id;
        chip.onclick = () => {
            if (chip.classList.contains('used')) return;

            // Remove placeholder if first word
            if (state.scrambleWorkspace.length === 0) workspace.innerHTML = '';

            state.scrambleWorkspace.push(item);
            chip.classList.add('used');

            const wsChip = document.createElement('div');
            wsChip.className = 'scramble-chip';
            wsChip.textContent = item.word;
            wsChip.onclick = () => {
                // Remove from workspace
                state.scrambleWorkspace = state.scrambleWorkspace.filter(w => w.id !== item.id);
                wsChip.remove();
                chip.classList.remove('used');
                if (state.scrambleWorkspace.length === 0) {
                    workspace.innerHTML = '<div class="placeholder-text">Click the words below to build the sentence!</div>';
                }
            };
            workspace.appendChild(wsChip);
        };
        pool.appendChild(chip);
    });
}

function checkScrambleSentence() {
    const original = state.scrambleSentences[state.scrambleCurrentIndex];
    const built = state.scrambleWorkspace.map(w => w.word).join(' ');

    // Normalize for comparison (ignore case, punctuation)
    const normalize = (s) => s.toLowerCase().replace(/[.,!?;:'"-]/g, '').replace(/\s+/g, ' ').trim();
    const isCorrect = normalize(original) === normalize(built);

    const feedbackSection = document.getElementById('writing-feedback');
    const feedbackTitle = document.getElementById('feedback-title');
    const feedbackMsg = document.getElementById('feedback-message');
    const nextBtn = document.getElementById('next-scramble');

    feedbackSection.classList.remove('hidden');

    if (isCorrect) {
        feedbackTitle.textContent = '🌟 Perfect!';
        feedbackMsg.innerHTML = `<div class="feedback-message success">"${built}" — That's exactly right!</div>`;
        nextBtn.classList.remove('hidden');
        if (typeof speakBuddy === 'function') speakBuddy('Amazing! You got it right!');
    } else {
        feedbackTitle.textContent = '💡 Not quite yet';
        feedbackMsg.innerHTML = `<div class="feedback-message error">Keep trying! Check the word order.</div>`;
        if (typeof speakBuddy === 'function') speakBuddy('Almost there! Try again.');
    }
}

function nextScrambleSentence() {
    state.scrambleCurrentIndex++;
    renderScrambleSentence(state.scrambleCurrentIndex);
}

function finishScrambleGame() {
    const feedbackSection = document.getElementById('writing-feedback');
    feedbackSection.classList.remove('hidden');
    feedbackSection.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">🏆</div>
            <h2>Story Completed!</h2>
            <p>You rebuilt the entire story sentence by sentence. Amazing job, Omar!</p>
            <button class="control-btn primary" onclick="document.getElementById('back-to-recall').click()" style="margin-top: 1rem;">Finish Challenge</button>
        </div>
    `;
    submitActivity('writing', null, 100);
    checkAchievements('writing', 100);
}

// ===================================
// Standalone Scramble Page (TinyStories-based, Adaptive)
// ===================================
let spState = {
    sentences: [],
    steps: [],
    currentIndex: 0,
    workspace: [],
    difficulty: 'easy',
    correctCount: 0,
    attemptCount: 0,
    storyTitle: '',
    completedText: []  // array of completed chunk strings
};

const DIFFICULTY_LABELS = {
    easy: '🟢 Easy',
    medium: '🟡 Medium',
    hard: '🔴 Hard'
};

function initializeScramblePage() {
    document.getElementById('scramble-random-btn')?.addEventListener('click', () => spStartAdaptive(spState.difficulty));
    document.getElementById('back-to-scramble-picker')?.addEventListener('click', () => {
        document.getElementById('scramble-story-picker').classList.remove('hidden');
        document.getElementById('scramble-game-area').classList.add('hidden');
    });
    document.getElementById('sp-check-scramble')?.addEventListener('click', spCheckSentence);
    document.getElementById('sp-reset-scramble')?.addEventListener('click', () => spRenderSentence(spState.currentIndex));
    document.getElementById('sp-next-scramble')?.addEventListener('click', spNextSentence);

    // Difficulty selector buttons
    document.querySelectorAll('.sp-diff-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.sp-diff-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            spState.difficulty = btn.dataset.diff;
        });
    });
}

async function loadScrambleStoriesPicker() {
    const grid = document.getElementById('scramble-stories-grid');
    if (!grid) return;

    // Reset to picker view
    document.getElementById('scramble-story-picker').classList.remove('hidden');
    document.getElementById('scramble-game-area').classList.add('hidden');

    grid.innerHTML = '<p style="text-align:center; color:var(--text-secondary); grid-column: 1/-1;">Loading Read & Learn stories...</p>';

    try {
        // Fetch from TinyStories
        const response = await fetch(`${API_BASE}/tinystories/`);
        const data = await response.json();

        if (data.success && data.stories && data.stories.length > 0) {
            grid.innerHTML = data.stories.map(s => `
                <div class="story-card scramble-pick-card" data-story-id="${s.id}" style="cursor:pointer;">
                    <div class="story-card-icon">🧩</div>
                    <h3>${s.title}</h3>
                    <p style="font-size:0.85rem; color:var(--text-secondary);">Read & Learn Story</p>
                </div>
            `).join('');

            grid.querySelectorAll('.scramble-pick-card').forEach(card => {
                card.addEventListener('click', () => {
                    const storyId = parseInt(card.dataset.storyId);
                    spStartGame(storyId);
                });
            });
        } else {
            grid.innerHTML = '<div style="text-align:center; grid-column:1/-1; padding:2rem;"><div style="font-size:3rem; margin-bottom:1rem;">📭</div><p style="color:var(--text-secondary)">No Read & Learn stories yet! Generate some in the Read & Learn page first.</p></div>';
        }
    } catch (e) {
        console.error('Failed to load scramble stories', e);
        grid.innerHTML = '<p style="color:var(--error-color); text-align:center; grid-column:1/-1;">Failed to load stories.</p>';
    }
}

// Start adaptive mode
async function spStartAdaptive(difficulty) {
    try {
        showLoading();
        const response = await fetch(`${API_BASE}/tinystories/scramble/adaptive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ difficulty })
        });
        const data = await response.json();

        if (data.success) {
            spState.sentences = data.sentences || [];
            spState.steps = data.steps || [];
            spState.storyTitle = data.story_title || 'Mixed Stories';
            spState.currentIndex = 0;
            spState.correctCount = 0;
            spState.attemptCount = 0;
            spState.completedText = [];
            spState.struggledSentences = []; // Analytics array
            spState.difficulty = difficulty;

            document.getElementById('scramble-page-title').textContent =
                `${DIFFICULTY_LABELS[difficulty]} - ${spState.storyTitle}`;

            if (spState.sentences.length > 0) {
                document.getElementById('sp-scramble-total').textContent = spState.sentences.length;
                spRenderSentence(0);
            }

            spResetPad();
            document.getElementById('scramble-story-picker').classList.add('hidden');
            document.getElementById('scramble-game-area').classList.remove('hidden');
        } else {
            showToast(data.error || 'No sentences available. Generate more stories!', '📖');
        }
    } catch (e) {
        console.error('Adaptive scramble error:', e);
        showToast('Failed to start adaptive game.', '❌');
    } finally {
        hideLoading();
    }
}

// Start from a specific TinyStory
async function spStartGame(storyId) {
    try {
        showLoading();
        const diff = spState.difficulty || 'easy';
        const response = await fetch(`${API_BASE}/tinystories/scramble/${storyId}?difficulty=${diff}`);
        const data = await response.json();

        if (data.success) {
            spState.sentences = data.sentences || [];
            spState.steps = data.steps || [];
            spState.storyTitle = data.story_title;
            spState.currentIndex = 0;
            spState.correctCount = 0;
            spState.attemptCount = 0;
            spState.completedText = [];
            spState.struggledSentences = [];

            document.getElementById('scramble-page-title').textContent =
                `${DIFFICULTY_LABELS[diff]} - ${data.story_title}`;

            if (spState.sentences.length > 0) {
                document.getElementById('sp-scramble-total').textContent = spState.sentences.length;
                spRenderSentence(0);
            }

            spResetPad();
            document.getElementById('scramble-story-picker').classList.add('hidden');
            document.getElementById('scramble-game-area').classList.remove('hidden');
        } else {
            showToast('Failed to load story', '❌');
        }
    } catch (e) {
        console.error('Scramble game start error:', e);
        showToast('Error loading scramble game', '❌');
    } finally {
        hideLoading();
    }
}

// Story pad helpers
function spResetPad() {
    const pad = document.getElementById('sp-story-text');
    if (pad) {
        pad.classList.remove('sp-story-complete');
        pad.innerHTML = '<span class="sp-pad-placeholder">Your story will appear here as you build it, word by word...</span>';
    }
}

function spUpdatePad() {
    const pad = document.getElementById('sp-story-text');
    if (!pad) return;

    // Keep placeholder until first chunk is completed
    if (spState.completedText.length === 0) return;

    // Build the visible text from completed chunks
    let html = '<span class="sp-completed-text">' + spState.completedText.join(' ') + '</span>';

    // Add a blinking cursor to show we're still writing
    if (spState.currentIndex < spState.sentences.length) {
        html += '<span class="sp-current-chunk"> ▋</span>';
    }

    pad.innerHTML = html;

    // Auto-scroll to bottom
    pad.scrollTop = pad.scrollHeight;
}

function spShowFullStory() {
    const pad = document.getElementById('sp-story-text');
    if (!pad) return;

    // Reconstruct the full story from steps metadata
    let fullStory = '';
    if (spState.steps && spState.steps.length > 0) {
        let lastSentIdx = -1;
        for (const step of spState.steps) {
            if (step.sentence_index !== lastSentIdx && lastSentIdx !== -1) {
                fullStory += ' '; // space between sentences
            }
            if (step.chunk_index === 0 && lastSentIdx !== -1) {
                // nothing extra needed
            }
            fullStory += (fullStory ? ' ' : '') + step.text;
            lastSentIdx = step.sentence_index;
        }
    } else {
        fullStory = spState.completedText.join(' ');
    }

    pad.classList.add('sp-story-complete');
    pad.innerHTML = '<span class="sp-completed-text">' + fullStory + '</span>';
    pad.scrollTop = 0;
}

function spRenderSentence(index) {
    if (index >= spState.sentences.length) {
        spFinishGame();
        return;
    }

    const sentence = spState.sentences[index];
    const step = spState.steps[index];
    spState.workspace = [];
    spState.currentIndex = index;

    const wordCount = sentence.trim().split(/\s+/).length;

    document.getElementById('sp-scramble-current').textContent = index + 1;
    document.getElementById('sp-writing-feedback').classList.add('hidden');
    document.getElementById('sp-next-scramble').classList.add('hidden');
    document.getElementById('sp-scramble-workspace').classList.remove('hidden');
    document.getElementById('sp-scramble-words').classList.remove('hidden');
    const checkBtn = document.getElementById('sp-check-scramble');
    if (checkBtn) checkBtn.disabled = false;

    // Build context hint
    let contextHint = '';
    if (step && step.total_chunks_in_sentence > 1) {
        contextHint = ` — Part ${step.chunk_index + 1} of sentence ${step.sentence_index + 1}`;
    } else if (step) {
        contextHint = ` — Sentence ${step.sentence_index + 1}`;
    }

    const workspace = document.getElementById('sp-scramble-workspace');
    workspace.innerHTML = `<div class="placeholder-text">Arrange ${wordCount} words in order!${contextHint}</div>`;

    const pool = document.getElementById('sp-scramble-words');
    pool.innerHTML = '';

    const words = sentence.trim().split(/\s+/);
    const wordItems = words.map((word, idx) => ({ word, id: idx }));
    const shuffled = [...wordItems].sort(() => Math.random() - 0.5);

    shuffled.forEach((item) => {
        const chip = document.createElement('div');
        chip.className = 'scramble-chip';
        chip.textContent = item.word;
        chip.dataset.wordId = item.id;
        chip.onclick = () => {
            if (chip.classList.contains('used')) return;
            if (spState.workspace.length === 0) workspace.innerHTML = '';
            spState.workspace.push(item);
            chip.classList.add('used');

            const wsChip = document.createElement('div');
            wsChip.className = 'scramble-chip';
            wsChip.textContent = item.word;
            wsChip.onclick = () => {
                spState.workspace = spState.workspace.filter(w => w.id !== item.id);
                wsChip.remove();
                chip.classList.remove('used');
                if (spState.workspace.length === 0) {
                    workspace.innerHTML = `<div class="placeholder-text">Arrange ${wordCount} words in order!${contextHint}</div>`;
                }
            };
            workspace.appendChild(wsChip);
        };
        pool.appendChild(chip);
    });
}

function spCheckSentence() {
    // Prevent re-checking after already correct
    const checkBtn = document.getElementById('sp-check-scramble');
    if (checkBtn && checkBtn.disabled) return;

    const original = spState.sentences[spState.currentIndex];
    const built = spState.workspace.map(w => w.word).join(' ');
    const normalize = (s) => s.toLowerCase().replace(/[.,!?;:'"\\-]/g, '').replace(/\s+/g, ' ').trim();
    const isCorrect = normalize(original) === normalize(built);

    spState.attemptCount++;

    const feedbackSection = document.getElementById('sp-writing-feedback');
    const feedbackTitle = document.getElementById('sp-feedback-title');
    const feedbackMsg = document.getElementById('sp-feedback-message');
    const nextBtn = document.getElementById('sp-next-scramble');

    feedbackSection.classList.remove('hidden');

    if (isCorrect) {
        spState.correctCount++;
        // Add completed chunk to story pad
        spState.completedText.push(built);
        spUpdatePad();
        // Disable check button to prevent duplicates
        if (checkBtn) checkBtn.disabled = true;
        feedbackTitle.textContent = '🌟 Perfect!';
        feedbackMsg.textContent = `${spState.correctCount}/${spState.currentIndex + 1} correct`;
        nextBtn.classList.remove('hidden');
        if (typeof speakBuddy === 'function') speakBuddy('Amazing! You got it right!');
    } else {
        // Record sentence struggled with
        if (!spState.struggledSentences.includes(original)) {
            spState.struggledSentences.push(original);
        }

        feedbackTitle.textContent = '💡 Not quite';
        feedbackMsg.textContent = 'Check the word order.';
        if (typeof speakBuddy === 'function') speakBuddy('Almost there! Try again.');
    }
}

function spNextSentence() {
    spState.currentIndex++;
    spRenderSentence(spState.currentIndex);
}

function spFinishGame() {
    const total = spState.sentences.length;
    const correct = spState.correctCount;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Determine next difficulty suggestion
    let nextDifficulty = spState.difficulty;
    if (pct >= 80 && spState.difficulty === 'easy') nextDifficulty = 'medium';
    else if (pct >= 80 && spState.difficulty === 'medium') nextDifficulty = 'hard';

    const emoji = pct >= 80 ? '🏆' : pct >= 50 ? '⭐' : '💪';

    // Hide game elements
    document.getElementById('sp-scramble-workspace').classList.add('hidden');
    document.getElementById('sp-scramble-words').classList.add('hidden');

    // Replace controls row with finish content
    const controlsRow = document.querySelector('.sp-controls-row');
    if (controlsRow) {
        controlsRow.innerHTML = `
            <div style="display:flex; align-items:center; gap:0.8rem; flex-wrap:wrap; width:100%;">
                <span style="font-size:1.5rem;">${emoji}</span>
                <span style="font-weight:700;">Done! ${correct}/${total} correct (${pct}%)</span>
                <div style="display:flex; gap:0.5rem; margin-left:auto;">
                    <button class="control-btn primary sp-compact-btn" onclick="spStartAdaptive('${nextDifficulty}')">
                        ➡️ Next (${DIFFICULTY_LABELS[nextDifficulty]})
                    </button>
                    <button class="control-btn sp-compact-btn" onclick="document.getElementById('back-to-scramble-picker').click()">
                        📚 Stories
                    </button>
                </div>
            </div>
        `;
    }

    // Show the full story in the pad
    spShowFullStory();

    // Submit activity with detailed JSON body
    submitActivity('writing', null, pct, {
        "struggled_sentences": spState.struggledSentences,
        "total_sentences": total
    });
    checkAchievements('writing', pct);
}




// === Toast System ===
function showToast(message, icon = '✨') {
    let toast = document.getElementById('app-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'app-toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

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

    document.getElementById('ts-submit-quiz-btn')?.addEventListener('click', () => {
        const id = document.getElementById('ts-reader').dataset.currentId;
        if (!id) return;

        const score = state.tsQuizTotal > 0 ? (state.tsQuizScore / state.tsQuizTotal) * 100 : 0;
        submitActivity('quiz', id, Math.round(score));
        // Also ensure it counts as read if they finish the quiz
        submitActivity('story_read', id, 100);

        if (score === 100) {
            checkAchievements('quiz_perfect', 100);
            showStickerReward();
            if (typeof speakBuddy === 'function') speakBuddy("Amazing! A perfect score on your test!");
        } else {
            if (typeof speakBuddy === 'function') speakBuddy("Well done! You completed the test!");
        }

        showError("Success! Your test result has been saved. 🌟");
        navigateToPage('home');
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

            // Initialize quiz progress
            state.tsQuizScore = 0;
            state.tsQuizTotal = (story.fill_in_blanks?.length || 0) +
                (story.mcqs?.length || 0) +
                (story.moral_questions?.length || 0);

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
                    submitActivity('story_read', id, 100);
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
                                <button class="control-btn" style="font-size: 0.9rem;" onclick="checkTsAnswer(this, '${escapeAttr(o)}', '${escapeAttr(q.answer)}')">${o}</button>
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
                                <button class="control-btn" style="text-align: left;" onclick="checkTsAnswer(this, '${escapeAttr(o)}', '${escapeAttr(q.correct_answer)}')">${o}</button>
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
                                <button class="control-btn" style="text-align: left;" onclick="checkTsAnswer(this, '${escapeAttr(o)}', '${escapeAttr(q.correct_answer)}')">${o}</button>
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

// Helper to escape strings for HTML attributes
function escapeAttr(str) {
    if (!str) return "";
    return str.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

window.checkTsAnswer = function (btn, selected, correct) {
    console.log("TS Quiz Check:", { selected, correct });

    // Normalize strings for comparison (remove punctuation, lower case)
    const normalize = (s) => s.toLowerCase().replace(/[.,!?;:]/g, "").trim();

    const sNorm = normalize(selected);
    const cNorm = normalize(correct);

    // Standard match OR prefix match (e.g., "A. Option" starts with "A")
    const isMatch = (sNorm === cNorm) || sNorm.startsWith(cNorm + " ");

    if (isMatch) {
        btn.classList.add('correct');
        btn.innerHTML += ' ✅';
        state.tsQuizScore++;
        // Buddy praises
        if (typeof speakBuddy === 'function') speakBuddy("Correct! Great job!");
    } else {
        btn.classList.add('wrong');
        btn.innerHTML += ' ❌';
        // Buddy hints
        if (typeof speakBuddy === 'function') speakBuddy("Not quite. Try again!");
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
            // Refresh list counters
            loadTinyStories();
        } else {
            alert("Update failed: " + data.error);
        }
    } catch (e) {
        console.error(e);
        alert("Failed to update vocabulary status");
    }
}

// ===================================
// Achievements
// ===================================

async function loadAchievements() {
    const gridShort = document.getElementById('grid-short');
    const gridMedium = document.getElementById('grid-medium');
    const gridLong = document.getElementById('grid-long');
    if (!gridShort) return;

    // Clear
    [gridShort, gridMedium, gridLong].forEach(g => g.innerHTML = '<p style="color:var(--text-secondary);">Loading...</p>');

    try {
        const response = await fetch(`${API_BASE}/achievements/list`);
        const data = await response.json();

        if (data.success) {
            const achievements = data.achievements;
            const unlocked = achievements.filter(a => a.is_unlocked === 1).length;
            const total = achievements.length;
            const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0;

            document.getElementById('badge-unlocked-count').textContent = unlocked;
            document.getElementById('badge-total-count').textContent = total;
            document.getElementById('badge-progress-pct').textContent = pct + '%';

            // Group by category
            const groups = { short: [], medium: [], long: [] };
            achievements.forEach(ach => {
                const cat = ach.category || 'short';
                if (groups[cat]) groups[cat].push(ach);
                else groups.short.push(ach);
            });

            // Render each tier
            const renderBadge = (ach) => {
                const isUnlocked = ach.is_unlocked === 1;
                return `
                    <div class="trophy-badge ${isUnlocked ? 'unlocked' : 'locked'}">
                        <div class="trophy-emoji">${ach.emoji}</div>
                        <h4 class="trophy-title">${ach.title}</h4>
                        <p class="trophy-desc">${ach.description}</p>
                        ${isUnlocked ? '<div class="trophy-status">✨ Unlocked</div>' : '<div class="trophy-status locked-status">🔒 Locked</div>'}
                    </div>
                `;
            };

            gridShort.innerHTML = groups.short.map(renderBadge).join('') || '<p>No badges in this tier.</p>';
            gridMedium.innerHTML = groups.medium.map(renderBadge).join('') || '<p>No badges in this tier.</p>';
            gridLong.innerHTML = groups.long.map(renderBadge).join('') || '<p>No badges in this tier.</p>';
        }
    } catch (e) {
        console.error(e);
        gridShort.innerHTML = '<p style="color:var(--error-color);">Failed to load badges.</p>';
        gridMedium.innerHTML = '';
        gridLong.innerHTML = '';
    }
}

async function checkAchievements(activityType, score = 0) {
    try {
        const response = await fetch(`${API_BASE}/achievements/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activity_type: activityType, score })
        });
        const data = await response.json();
        if (data.success && data.newly_unlocked.length > 0) {
            data.newly_unlocked.forEach((ach, index) => {
                setTimeout(() => {
                    showAchievementUnlockedModal(ach);
                }, index * 4500); // Sequence if multiple
            });
        }
    } catch (e) {
        console.error("Failed to check achievements", e);
    }
}

function showAchievementUnlockedModal(ach) {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.bottom = '20px';
    modal.style.right = '20px';
    modal.style.background = 'white';
    modal.style.padding = '20px';
    modal.style.borderRadius = '15px';
    modal.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.gap = '15px';
    modal.style.zIndex = '9999';
    modal.style.transform = 'translateY(100px)';
    modal.style.opacity = '0';
    modal.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

    modal.innerHTML = `
        <div style="font-size: 45px;">${ach.emoji}</div>
        <div>
            <h4 style="margin: 0; color: var(--primary-color, #8b5cf6); font-size: 1.1rem;">Achievement Unlocked!</h4>
            <p style="margin: 5px 0 0 0; font-weight: bold; font-size: 1.2rem; color: #1e293b;">${ach.title}</p>
        </div>
    `;

    document.body.appendChild(modal);

    // Animate in
    requestAnimationFrame(() => {
        setTimeout(() => {
            modal.style.transform = 'translateY(0)';
            modal.style.opacity = '1';
        }, 50);
    });

    // Remove after 4 seconds
    setTimeout(() => {
        modal.style.transform = 'translateY(100px)';
        modal.style.opacity = '0';
        setTimeout(() => modal.remove(), 500);
    }, 4000);
}

// ===================================
// Vocabulary Gallery
// ===================================
let vocabList = [];
let vocabFilteredList = [];
let vocabCurrentIndex = 0;
let vocabCurrentFilter = 'all';

function initializeVocabularyPage() {
    // Filter buttons
    document.querySelectorAll('.vocab-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.vocab-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            vocabCurrentFilter = btn.dataset.filter;
            renderVocabGrid();
        });
    });

    // Flashcard controls
    document.getElementById('close-flashcard')?.addEventListener('click', closeFlashcard);
    document.getElementById('vocab-mark-mastered')?.addEventListener('click', () => updateVocabFromCard('mastered'));
    document.getElementById('vocab-mark-learning')?.addEventListener('click', () => updateVocabFromCard('learning'));
    document.getElementById('vocab-prev')?.addEventListener('click', () => navigateFlashcard(-1));
    document.getElementById('vocab-next')?.addEventListener('click', () => navigateFlashcard(1));
    document.getElementById('vocab-listen')?.addEventListener('click', listenToVocabWord);

    // Load when tab is clicked
    document.querySelector('.nav-btn[data-page="vocabulary"]')?.addEventListener('click', loadVocabularyPage);
}

async function loadVocabularyPage() {
    try {
        const response = await fetch(`${API_BASE}/tinystories/vocabulary`);
        const data = await response.json();
        if (data.success) {
            vocabList = data.vocabulary || [];
            updateVocabCounters();
            renderVocabGrid();
        }
    } catch (e) {
        console.error('Failed to load vocabulary', e);
    }
}

function updateVocabCounters() {
    const total = vocabList.length;
    const mastered = vocabList.filter(v => v.status === 'mastered').length;
    const learning = vocabList.filter(v => v.status === 'learning').length;

    document.getElementById('vocab-total-count').textContent = total;
    document.getElementById('vocab-mastered-count').textContent = mastered;
    document.getElementById('vocab-learning-count').textContent = learning;
}

function renderVocabGrid() {
    const grid = document.getElementById('vocab-grid');

    vocabFilteredList = vocabCurrentFilter === 'all'
        ? [...vocabList]
        : vocabList.filter(v => v.status === vocabCurrentFilter);

    if (vocabFilteredList.length === 0) {
        grid.innerHTML = `
            <div style="text-align: center; grid-column: 1/-1; padding: 2rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
                <p style="color: var(--text-secondary);">No words here yet. Read some stories in Read & Learn to discover new words!</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = vocabFilteredList.map((v, idx) => {
        const statusBadge = v.status === 'mastered' ? '✅'
            : v.status === 'learning' ? '📖' : '🆕';
        const borderColor = v.status === 'mastered' ? 'var(--success-color)'
            : v.status === 'learning' ? 'var(--warning-color)' : 'var(--border-color)';

        return `
            <div class="vocab-card" data-idx="${idx}" style="
                background: var(--bg-card);
                border: 1px solid ${borderColor};
                border-radius: var(--radius-lg);
                padding: 1.2rem;
                cursor: pointer;
                transition: all 0.3s ease;
                text-align: center;
            ">
                <div style="font-size: 0.75rem; margin-bottom: 0.5rem;">${statusBadge}</div>
                <h3 style="margin: 0; font-size: 1.3rem; color: var(--primary-light); text-transform: capitalize;">${v.word}</h3>
                <p style="margin: 0.4rem 0 0 0; font-size: 0.85rem; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${v.meaning || 'Click to explore'}</p>
                <div style="margin-top: 0.5rem; font-size: 0.75rem; opacity: 0.5;">Seen ${v.occurrence_count || 1}x</div>
            </div>
        `;
    }).join('');

    // Add click listeners
    grid.querySelectorAll('.vocab-card').forEach(card => {
        card.addEventListener('click', () => {
            vocabCurrentIndex = parseInt(card.dataset.idx);
            openFlashcard(vocabCurrentIndex);
        });
    });
}

function openFlashcard(idx) {
    const word = vocabFilteredList[idx];
    if (!word) return;

    vocabCurrentIndex = idx;

    document.getElementById('card-word').textContent = word.word;
    document.getElementById('card-meaning').textContent = word.meaning || 'No meaning available yet.';
    document.getElementById('card-seen-count').textContent = `Seen ${word.occurrence_count || 1} times`;

    // Reset flip
    document.getElementById('flashcard-inner').classList.remove('flipped');

    document.getElementById('flashcard-modal').classList.remove('hidden');
}

function closeFlashcard() {
    document.getElementById('flashcard-modal').classList.add('hidden');
}

window.flipFlashcard = function () {
    document.getElementById('flashcard-inner').classList.toggle('flipped');
};

function navigateFlashcard(direction) {
    vocabCurrentIndex += direction;
    if (vocabCurrentIndex < 0) vocabCurrentIndex = vocabFilteredList.length - 1;
    if (vocabCurrentIndex >= vocabFilteredList.length) vocabCurrentIndex = 0;
    openFlashcard(vocabCurrentIndex);
}

async function listenToVocabWord() {
    const word = vocabFilteredList[vocabCurrentIndex];
    if (!word) return;
    try {
        const response = await fetch(`${API_BASE}/speech/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: word.word, speed: 0.7 })
        });
        const data = await response.json();
        if (data.success) {
            const audio = new Audio(data.audio_url);
            audio.play().catch(e => console.error('Audio play error', e));
        }
    } catch (e) {
        console.error('Failed to play vocab word', e);
    }
}

async function updateVocabFromCard(status) {
    const word = vocabFilteredList[vocabCurrentIndex];
    if (!word) return;

    try {
        const response = await fetch(`${API_BASE}/tinystories/vocabulary/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word: word.word, status })
        });
        const data = await response.json();
        if (data.success) {
            // Visual feedback on the card
            const cardInner = document.getElementById('flashcard-inner');
            if (cardInner) {
                cardInner.classList.add('success-animate');
                setTimeout(() => cardInner.classList.remove('success-animate'), 500);
            }

            // Toast feedback
            if (status === 'mastered') {
                showToast(`Mastered: ${word.word}!`, '✅');
            } else {
                showToast(`Still learning: ${word.word}`, '📖');
            }

            // Update local data
            word.status = status;
            const masterWord = vocabList.find(v => v.word === word.word);
            if (masterWord) masterWord.status = status;

            updateVocabCounters();
            renderVocabGrid();

            // Wait a tiny bit for the animation before moving
            setTimeout(() => {
                // Move to next card if we're not filtering or if it was the last one
                if (vocabFilteredList.length > 1) {
                    navigateFlashcard(1);
                } else {
                    closeFlashcard();
                }
            }, 400);
        }
    } catch (e) {
        console.error('Failed to update vocab status', e);
        showToast('Operation failed', '❌');
    }
}
