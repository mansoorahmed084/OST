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
- ✅ Image placeholders for stories
- ✅ Synchronized subtitle highlighting
- ✅ Playback speed control

### Phase 3 - Speaking Practice (✅ Implemented)
- ✅ Speech recording functionality
- ✅ Gentle speech evaluation
- ✅ Encouraging feedback system
- ✅ Practice mode with random sentences

### Phase 4 - Comprehension Quizzes (🔄 Basic Implementation)
- ✅ Quiz question storage
- ✅ MCQ support
- 🔄 Auto-generation from stories (to be enhanced)

### Phase 5 - Next-Day Recall (📋 Planned)
- 📋 Story history tracking
- 📋 Spaced repetition
- 📋 Writing exercises

### Phase 6 - ChatMode (✅ Implemented)
- ✅ Safe prompt validation
- ✅ Whitelisted categories (animals, vehicles, fruits, objects, nature)
- ✅ Simple explanation generation
- ✅ Visual learning with emojis (images to be added)

### Phase 7-8 - Advanced Features (📋 Planned)
- 📋 Voice input for ChatMode
- 📋 Real image fetching (Bing API)
- 📋 Optional LangChain integration

## 🚀 Getting Started

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. **Clone or navigate to the project directory:**
```bash
cd c:/temp/AI/OST
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Initialize the database:**
```bash
python database.py
```

4. **Run the application:**
```bash
python app.py
```

5. **Open your browser and navigate to:**
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
- **TTS**: gTTS (Google Text-to-Speech) + Web Speech API
- **STT**: Web Speech API (Browser-based)
- **Future**: LangChain, Bing Image Search API

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
- `POST /api/speech/tts` - Generate text-to-speech audio
- `POST /api/speech/evaluate` - Evaluate speech attempt

### Quiz
- `POST /api/quiz/generate/<story_id>` - Generate quiz for story
- `POST /api/quiz/submit` - Submit quiz answers

### ChatMode
- `POST /api/chatmode/ask` - Process ChatMode request
- `GET /api/chatmode/history` - Get ChatMode history

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
