// ===================================
// OST - Omar's Speech Teacher
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

    // Back button
    document.getElementById('back-to-stories')?.addEventListener('click', () => {
        document.getElementById('stories-list').classList.remove('hidden');
        document.getElementById('story-reader').classList.add('hidden');
        stopStory();
    });

    // Play/Pause buttons
    document.getElementById('play-story')?.addEventListener('click', playStory);
    document.getElementById('pause-story')?.addEventListener('click', pauseStory);

    // Speed controls
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentSpeed = parseFloat(btn.dataset.speed);

            // If playing, restart with new speed
            if (state.isPlaying) {
                pauseStory();
                setTimeout(playStory, 100);
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

async function loadStory(storyId) {
    try {
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

function pauseStory() {
    state.isPlaying = false;
    document.getElementById('play-story').style.display = 'flex';
    document.getElementById('pause-story').style.display = 'none';

    if (state.synthesis) {
        state.synthesis.cancel();
    }

    // Remove all word highlights
    document.querySelectorAll('.story-word').forEach(w => {
        w.classList.remove('highlight');
    });
}

function stopStory() {
    pauseStory();
    state.currentSentenceIndex = 0;
}

function speakStory() {
    if (!state.currentStory || !state.isPlaying) return;

    const sentences = state.currentStory.sentences;

    if (state.currentSentenceIndex >= sentences.length) {
        stopStory();
        return;
    }

    const sentence = sentences[state.currentSentenceIndex];
    const sentenceElement = document.querySelector(`.story-sentence[data-index="${state.currentSentenceIndex}"]`);

    // Remove all previous highlights
    document.querySelectorAll('.story-word').forEach(w => w.classList.remove('highlight'));

    if (sentenceElement) {
        sentenceElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Speak using Web Speech API
    const utterance = new SpeechSynthesisUtterance(sentence.sentence_text);
    utterance.rate = state.currentSpeed;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = 'en-IN';

    // Get all words in current sentence
    const words = sentence.sentence_text.trim().split(/\s+/);
    let currentWordIndex = 0;

    // Highlight words as they're spoken using boundary events
    utterance.onboundary = (event) => {
        if (event.name === 'word' && currentWordIndex < words.length) {
            // Remove previous word highlight
            document.querySelectorAll('.story-word').forEach(w => w.classList.remove('highlight'));

            // Highlight current word
            const wordElement = document.querySelector(
                `.story-word[data-sentence="${state.currentSentenceIndex}"][data-word="${currentWordIndex}"]`
            );
            if (wordElement) {
                wordElement.classList.add('highlight');
            }
            currentWordIndex++;
        }
    };

    utterance.onend = () => {
        // Remove highlights when sentence ends
        document.querySelectorAll('.story-word').forEach(w => w.classList.remove('highlight'));

        state.currentSentenceIndex++;
        if (state.isPlaying) {
            setTimeout(speakStory, 500); // Pause between sentences
        }
    };

    state.synthesis.speak(utterance);
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

function listenToSentence() {
    const sentence = document.getElementById('practice-sentence').textContent;

    if (sentence && sentence !== "Click \"Start Practice\" to begin") {
        const utterance = new SpeechSynthesisUtterance(sentence);
        utterance.rate = 0.8; // Slower for practice
        utterance.lang = 'en-IN';
        state.synthesis.speak(utterance);
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
function initializeQuizPage() {
    document.getElementById('select-story-for-quiz')?.addEventListener('click', () => {
        navigateToPage('stories');
    });
}

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

async function generateRandomStory() {
    try {
        showLoading();

        const length = getSelectedLength();

        const response = await fetch(`${API_BASE}/generator/random`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ length })
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

        const response = await fetch(`${API_BASE}/generator/topic`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, length })
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
