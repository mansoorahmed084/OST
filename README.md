# OST - Omar's Speech Teacher 📚

A comprehensive web application designed to help Omar improve his speech, reading comprehension, and language skills through interactive storytelling, speaking practice, quizzes, and visual learning.

## 🌟 Features

### Phase 0 - Core Platform (✅ Implemented)
- ✅ Flask REST API backend
- ✅ SQLite database with sample stories
- ✅ Beautiful, modern dark-themed UI
- ✅ Story reading with text-to-speech
- ✅ Speed controls (slow, normal, fast)
- ✅ Sentence highlighting during playback

### Phase 1-2 - Enhanced Storytelling (✅ Implemented)
- ✅ Theme-based story categorization
- ✅ AI-Generated Images & Content
- ✅ Synchronized subtitle highlighting with compensation
- ✅ Playback speed control & auto-resume

### Phase 3 - Speaking Practice (✅ Implemented)
- ✅ Speech recording functionality
- ✅ Gentle speech evaluation
- ✅ Encouraging feedback system
- ✅ Practice mode with random sentences

### Phase 4 - Comprehension Quizzes (✅ Implemented)
- ✅ AI Auto-generated quizzes from story content
- ✅ MCQ support with instant scoring
- ✅ Progress tracking

### Phase 5 - Next-Day Recall (✅ Implemented)
- ✅ "What did you read yesterday?" listing
- ✅ AI-guided Writing Practice with keywords
- ✅ Automated feedback loop

### Phase 6 - ChatMode (✅ Implemented)
- ✅ Safe prompt validation
- ✅ Whitelisted categories for safe exploration
- ✅ Simple explanation generation
- ✅ AI Image Generation support

### Phase 7-8 - Advanced Features (✅ Integrated)
- ✅ Google Gemini 2.0 Integration
- ✅ OpenAI GPT-4o Integration
- ✅ Groq Llama 3 Integration (Fast, Open Source)
- ✅ Local `TinyStories-33M` Support for offline, safe, kid-friendly story text generation
- ✅ Hugging Face Inference API (`Yntec/KIDSILLUSTRATIONS`) for beautiful children's book illustrations
- ✅ Real-time Image Generation

### Phase 9 - Bilingual Support (✅ Implemented)
- ✅ Bilingual Story Generation (English + Hindi/Spanish/French/German)
- ✅ Support for Indian Languages (Hindi) via EdgeTTS
- ✅ Side-by-Side / Interleaved Story Reading View
- ✅ Dual Audio Playback (Original + Translation)
- ✅ **Translation highlight fix**: When playing translated audio, Hindi/translated text is highlighted (not English)
- ✅ Educational "Learn a Language" Mode
### Phase 10 - Read & Learn Enhancements (✅ Implemented)
- ✅ **AI Story Correction**: Every story is polished by a high-power LLM to fix context loss and grammar.
- ✅ **Random Story Generation**: Instantly generate stories from a list of 50+ kid-friendly topics.
- ✅ **Hugging Face FLUX.1 Integration**: High-fidelity children's book illustrations via Flux.1-schnell.
- ✅ **Adaptive Vocabulary Tracking**: Tracks "New Words" vs "Learned Words" across all stories.
- ✅ **Premium Word Sync**: Words pulse and glow with a professional 15% scale-up effect during playback.
- ✅ **Asset Regeneration**: One-click regeneration of images and audio if needed.
- ✅ **Migrated to google-genai**: Now using the modern Google Generative AI Python SDK.

### Reader Layouts & Step-by-Step Mode (✅ Implemented)
- ✅ **Two reader layouts** (Settings → Reader Layout):
  - **Classic**: One image at top, full story, Play/Pause/Reset, auto-play with sentence highlighting
  - **Step-by-step**: One sentence + one image at a time, no scrolling; kid clicks **Next** at their own pace
- ✅ **Per-sentence images**: One image per sentence (DALL-E 2, 256×256, cost-saving); generated at **story generation time** for a smooth experience
- ✅ **Step-by-step controls**: **Back** (previous sentence), **Play** (current sentence), **Next** (next sentence + auto-play), **Play translation** (bilingual)
- ✅ **Language choice** (bilingual): On opening step-by-step, choose "Listen in English" or "Listen in [Hindi]" (or other target language); narration and auto-play use chosen language
- ✅ **DALL-E story context**: Sentence images use consistent story characters and style (same story title/context in every prompt)

## 🚀 Getting Started

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. **Clone or navigate to the project directory:**
```bash
cd c:/temp/AI/OST
```

2. **Set up Environment Variables (Optional but recommended):**
You can configure API keys via the in-app `Settings Menu` (gear icon), or create a `.env` file in the root folder for easier startups:
```env
GOOGLE_API_KEY="your_google_key"
OPENAI_API_KEY="your_openai_key"
GROQ_API_KEY="your_groq_key"
HF_TOKEN="your_huggingface_token"
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```
*(Note: Initializing the app will download the local `TinyStories-33M` model logic using `torch` and `transformers`)*

4. **Initialize the database:**
```bash
python database.py
```

5. **Run the application:**
```bash
python app.py
```

6. **Open your browser and navigate to:**
```
http://localhost:5000
```

## 📁 Project Structure

```
OST/
├── app.py                  # Main Flask application
├── database.py             # Database initialization and management
├── requirements.txt        # Python dependencies
├── .env.example           # Environment variables template
├── routes/                # API route modules
│   ├── __init__.py
│   ├── stories.py         # Story CRUD operations
│   ├── speech.py          # TTS and speech evaluation
│   ├── quiz.py            # Quiz generation and submission
│   └── chatmode.py        # ChatMode functionality
├── static/                # Frontend files
│   ├── index.html         # Main HTML file
│   ├── css/
│   │   └── styles.css     # Modern, beautiful styling
│   ├── js/
│   │   └── app.js         # Frontend application logic
│   ├── audio/             # Generated TTS audio files
│   └── images/            # Story and ChatMode images
└── .agent/
    └── workflows/
        └── development-plan.md  # Detailed development roadmap
```

## 🎨 Design Features

- **Modern Dark Theme**: Easy on the eyes with vibrant accent colors
- **Smooth Animations**: Engaging micro-interactions throughout
- **Glassmorphism Effects**: Premium, modern UI elements
- **Responsive Design**: Works on desktop and tablet
- **Child-Friendly**: Large buttons, clear text, encouraging colors

## 🔧 Technology Stack

- **Backend**: Flask (Python)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Database**: SQLite
- **AI Text Models**: Google Gemini 1.5 Flash/Pro, OpenAI GPT-4o, Groq Llama 3, Local `TinyStories-33M` (`torch` + `transformers`)
- **AI Image Models**: Hugging Face FLUX.1-schnell (Primary for Read & Learn), OpenAI DALL-E 3, Google Imagen 3
- **TTS**: Microsoft Edge TTS (Primary), OpenAI TTS, gTTS (Google Text-to-Speech)
- **STT**: Web Speech API (Browser-based)


## 🎯 Usage Guide

### For Parents/Teachers

1. **Adding Stories**: Use the API to add custom stories
   ```bash
   POST /api/stories
   {
     "title": "Story Title",
     "content": "Story content...",
     "theme": "animals",
     "difficulty_level": "easy"
   }
   ```

2. **Monitoring Progress**: Check the `user_progress` table in the database

3. **Customizing Content**: Edit stories in the database to match Omar's learning level

### For Omar

1. **Reading Stories**: Click on "Stories" → Choose a story → Click "Play Story"
2. **Practice Speaking**: Go to "Practice" → Click "Start Practice" → Record your voice
3. **Taking Quizzes**: Select "Quiz" → Choose a story → Answer questions
4. **Exploring ChatMode**: Click "Chat" → Type what you want to see → Click "Show Me"

## 🔐 Safety Features

- **Whitelisted Content**: Only approved categories in ChatMode
- **Gentle Feedback**: All evaluations are encouraging and positive
- **No External Links**: Safe, contained environment
- **Age-Appropriate**: Simple vocabulary and concepts

## 📝 API Endpoints

### Stories
- `GET /api/stories` - List all stories
- `GET /api/stories/<id>` - Get specific story
- `POST /api/stories` - Create new story
- `DELETE /api/stories/<id>` - Delete story

### Speech
- `POST /api/speech/tts` - Generate text-to-speech audio (optional `language`: en, hi, es, fr, de for translation)
- `POST /api/speech/evaluate` - Evaluate speech attempt
- `POST /api/speech/story/<id>` - Full story or translated story audio

### Quiz
- `POST /api/quiz/generate/<story_id>` - Generate quiz for story
- `POST /api/quiz/submit` - Submit quiz answers

### ChatMode
- `POST /api/chatmode/ask` - Process ChatMode request
- `GET /api/chatmode/history` - Get ChatMode history

- **Read & Learn Enhancements**: Added random generation (🎲), AI story correction to fix illogical plots, and background asset generation for a faster UI experience.
- **Vocabulary Progress Dashboard**: Track lifetime learning stats (Learned vs Seen) with interactive status badges.
- **Premium Glow Highlights**: Word-by-word sync now features a soft pulsing glow and 15% scaling for improved focus.
- **FLUX.1 Illustrations**: Migrated to FLUX.1-schnell for higher-quality, consistent children's story artwork.
- **Gemini SDK Migration**: Full migration from legacy `google-generativeai` to the modern `google-genai` SDK.


## 🛣️ Roadmap

See `.agent/workflows/development-plan.md` for the complete phase-by-phase development plan.

## 🤝 Contributing

This is a personal project for Omar's learning. If you have suggestions or improvements, feel free to modify the code!

## 📄 License

This project is created for educational purposes.

## 💙 About

Created with love to help Omar learn, speak, and grow! 🌟

---

**Note**: This application uses browser-based speech recognition which works best in Chrome/Edge browsers. For the best experience, use a modern browser with microphone access enabled.
