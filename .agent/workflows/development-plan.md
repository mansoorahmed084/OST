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
233: ### Implemented Fix
234: ✓ **Translation highlight**: When playing translated audio, the translated (e.g. Hindi) text is highlighted, not English.
235: 
236: ---
237: 
238: ## Phase 10 – Reader Layouts & Step-by-Step Mode ✅ COMPLETE
239: 
240: ### Objectives
241: - Offer two reader layouts: Classic (full story) and Step-by-step (one sentence at a time)
242: - Generate per-sentence images at story creation for smooth step-by-step experience
243: - Preserve story characters and context in all sentence images
244: - Add language choice and translation playback in step-by-step
245: 
246: ### Tasks (Done)
247: 1. Settings: Add reader_layout (classic | step_by_step); persist and load when opening a story.
248: 2. Step-by-step UI: One sentence + one image at a time; viewport no scroll; Back, Play, Next, Play translation; progress (e.g. 1/5).
249: 3. Back button: Step-by-step Back goes to previous sentence; auto-play current sentence after Back.
250: 4. Auto-play: On Next (and Back), auto-play current sentence in chosen language.
251: 5. Per-sentence images: Generated at story creation (random + topic) in background thread; DALL-E 2, 256×256; prompt includes story title and "Same characters and style."
252: 6. DALL-E context: Sentence image prompt: "Same main characters and visual style in every image. Story: [title]. This scene: [sentence]."
253: 7. Language choice: Bilingual step-by-step shows "Listen in English" / "Listen in [Hindi]"; choice stored; first sentence and all Next/Back play in chosen language.
254: 8. Play translation: Step-by-step "Play translation" plays current sentence in translated language; TTS accepts optional language (en, hi, es, fr, de).
255: 9. API: POST /api/images/generate-sentence (story_id, sentence_order, prompt, story_title); Settings supports reader_layout.
256: 
257: ### Test Criteria
258: ✓ Classic layout unchanged (one image, full story, Play/Pause/Reset)
259: ✓ Step-by-step shows one sentence + image; Back/Next work; audio auto-plays on Next/Back
260: ✓ Bilingual: language choice at start; Play translation plays current sentence in other language
261: ✓ Sentence images generated at story creation; consistent characters across images
262: ✓ Settings Reader Layout switches layout when opening a story
263: 
264: ---
265: 
266: ## Changelog (Summary)
267: - Bilingual: Play Translation highlights translated text (not English).
268: - Reader layouts: Classic vs Step-by-step in Settings; step-by-step = one sentence + image, Back/Next, no scroll, kid-paced.
269: - Step-by-step: Back button; auto-play on Next/Back; language choice (English vs translation); Play translation button.
270: - Per-sentence images: Generated at story creation; DALL-E 2 with story-context prompt.
271: - TTS: /api/speech/tts optional language for translation.
272: - API: Images generate-sentence (story_title); Settings reader_layout.
273: 
274: ---
275: 
276: ## Development Guidelines

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
