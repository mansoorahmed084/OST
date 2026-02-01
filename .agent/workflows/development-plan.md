---
description: OST Development Roadmap - Phase-by-Phase Implementation
---

# OST (Omar's Speech Teacher) - Development Plan

## Project Overview
A web application designed to help Omar improve his speech, reading comprehension, and language skills through interactive storytelling, speaking practice, quizzes, and visual learning.

## Technology Stack
- **Backend**: Flask (Python)
- **Frontend**: HTML, CSS, JavaScript
- **TTS/STT**: Google Cloud Speech APIs / Web Speech API
- **Database**: SQLite
- **AI/LLM**: Optional LangChain for advanced features
- **Image Source**: Local curated library → Bing Image Search API (later)

---

## Phase 0 – Core Platform (Foundation) ✅ START HERE

### Objectives
- Set up Flask application structure
- Create REST API endpoints
- Build basic frontend interface
- Implement story input and display

### Tasks
1. Initialize Flask project structure
2. Set up SQLite database with stories table
3. Create REST API endpoints:
   - `POST /api/stories` - Add new story
   - `GET /api/stories` - List all stories
   - `GET /api/stories/<id>` - Get specific story
4. Build basic frontend with navigation
5. Implement story display page
6. Add text-to-speech using Web Speech API

### Test Criteria
✓ Story can be added via API
✓ Story displays with text
✓ Basic audio playback works

---

## Phase 1 – Storytelling + Image Support

### Objectives
- Add visual context to stories
- Create image library structure
- Implement theme-based image mapping

### Tasks
1. Create image directory structure
2. Add sample images for common themes
3. Implement image API endpoint
4. Link stories to image categories
5. Display story-related images

### Test Criteria
✓ Story about animals shows relevant animal image
✓ Images load correctly for different themes

---

## Phase 2 – Subtitle Highlighting + Speed Control

### Objectives
- Synchronize text highlighting with audio
- Add playback speed controls

### Tasks
1. Implement sentence-level text splitting
2. Add word/sentence highlighting during playback
3. Create speed control UI (0.5x, 0.75x, 1x, 1.25x)
4. Sync highlighting with different speeds

### Test Criteria
✓ Words highlight in sync with audio
✓ Highlighting works at slow speed
✓ Speed controls function properly

---

## Phase 3 – Speaking Practice Mode

### Objectives
- Enable Omar to practice speaking
- Provide gentle, encouraging feedback

### Tasks
1. Implement audio recording functionality
2. Add speech-to-text conversion
3. Create comparison logic (gentle evaluation)
4. Build encouragement response system
5. Design practice mode UI

### Test Criteria
✓ Audio recording works
✓ Speech is transcribed
✓ Feedback is encouraging and helpful

---

## Phase 4 – Comprehension Quizzes

### Objectives
- Test understanding of stories
- Support both text and voice answers

### Tasks
1. Create quiz question templates
2. Build quiz generation logic
3. Implement MCQ interface
4. Add voice answer option
5. Create scoring with positive reinforcement

### Test Criteria
✓ Quizzes generate from story content
✓ Both text and voice answers work
✓ Feedback is encouraging

---

## Phase 5 – Next-Day Recall & Writing

### Objectives
- Reinforce learning through spaced repetition
- Add writing practice

### Tasks
1. Implement story history tracking
2. Create recall question generator
3. Add writing input interface
4. Build word meaning exercises
5. Implement sentence formation practice

### Test Criteria
✓ App remembers previous day's stories
✓ Recall questions are appropriate
✓ Writing exercises work correctly

---

## Phase 6 – ChatMode MVP (Image + Explanation)

### Objectives
- Allow Omar to explore concepts visually
- Provide simple, safe explanations

### Tasks
1. Create ChatMode UI with input box
2. Implement prompt validation (whitelist)
3. Build local image database
4. Create simple explanation templates
5. Add safety filters

### Allowed Topics (Whitelist)
- Animals (dog, cat, elephant, etc.)
- Vehicles (car, bus, train, etc.)
- Fruits (apple, banana, mango, etc.)
- Objects (ball, book, chair, etc.)
- Nature (tree, flower, sun, etc.)

### Test Criteria
✓ Safe prompts return images and explanations
✓ Unsafe prompts are gently redirected
✓ Explanations use simple vocabulary

---

## Phase 7 – ChatMode + Voice + TTS

### Objectives
- Add voice input to ChatMode
- Read explanations aloud

### Tasks
1. Add voice input to ChatMode
2. Implement TTS for explanations
3. Add word highlighting during explanation
4. Create voice-first interaction flow

### Test Criteria
✓ Omar can ask questions by speaking
✓ Explanations are read aloud
✓ Words highlight during reading

---

## Phase 8 – Smart ChatMode (Optional AI)

### Objectives
- Add intelligent responses using LLM
- Maintain safety and simplicity

### Tasks
1. Integrate LangChain
2. Create controlled prompt engineering
3. Implement content safety filters
4. Add response simplification layer

### Test Criteria
✓ AI responses are age-appropriate
✓ Language remains simple
✓ Safety filters work correctly

---

## Phase 9 – Bilingual Support & Advanced Audio
215: 
216: ### Objectives
217: - Support bilingual story generation and reading
218: - Provide native-quality audio for multiple languages
219: - Enable side-by-side learning text views
220: 
221: ### Tasks
222: 1. Update DB schema for translations
223: 2. Integrate multi-language support in TTS engine (Hindi, Spanish, etc.)
224: 3. Update LLM prompts for structured bilingual JSON output
225: 4. Create separate audio generation for translated text
226: 5. Build side-by-side / interleaved UI for reading
227: 
228: ### Test Criteria
229: ✓ Stories generate with accurate translations
230: ✓ Audio generated for both languages
231: ✓ User can toggle between English and Translated audio
232: 
233: ---
234: 
235: ## Development Guidelines

### Vocabulary Considerations
- Use simple, common words
- Consider Indian English context
- Avoid idioms and complex phrases
- Use short sentences (max 10 words)

### UI/UX Principles
- Large, clear buttons
- High contrast text
- Encouraging colors (warm, friendly)
- Minimal distractions
- Clear audio controls

### Safety First
- Content whitelisting
- Parental controls
- Progress tracking
- No external links without supervision

---

## Next Steps
1. Set up project structure
2. Initialize Flask application
3. Create database schema
4. Build Phase 0 foundation
