---
description: OST Development Roadmap - Phase-by-Phase Implementation
---

# OST (Omar's Speech Teacher) - Development Plan

## Project Overview
A web application designed to help Omar improve his speech, reading comprehension, and language skills through interactive storytelling, speaking practice, quizzes, and visual learning.

## Technology Stack
- **Backend**: Flask (Python 3.12)
- **Frontend**: HTML, CSS, JavaScript
- **TTS/STT**: Google Cloud / Edge TTS / Web Speech API
- **Database**: SQLite
- **AI/LLM**: LangChain (Gemini 2.0 Flash / GPT-4o-mini)
- **Memory**: ConversationSummaryBufferMemory (1024 tokens)

---

## Phase 10 – Reader Layouts & Step-by-Step Mode ✅ COMPLETE
- Classic vs Step-by-step (one sentence at a time).
- Per-sentence image generation for visual context.

---

## Phase 11 – Buddy AI Companion (Personalized Chat) ✅ COMPLETE
- Personalized AI friend named "Buddy".
- Long-term memory with rolling summarization.
- Quota-stable fallback logic (Gemini fallback).
- Modern message bubble UI.

---

## Phase 12 – Magic Quiz & Daily Adventure 🚧 IN PROGRESS

### Objectives
- Gamify learning with AI-generated comprehension quizzes.
- Transform "Daily Recall" into a "Daily Adventure Map".
- Add multi-sensory feedback (Buddy's voice, stickers, sounds).

### Tasks
1. **Magic Quiz (AI-Powered)**:
   - Use Gemini to generate 3-5 unique comprehension questions per story.
   - Add Buddy's voice-over for reading questions out loud.
   - Implement "Sticker Reward" system (fun emoji pops with sound on correct answers).
   - Add specific AI-generated feedback based on answers.
2. **Daily Adventure Quest**:
   - Replace simple story list with "Mission of the Day" cards.
   - Missions: "Read a story", "Speak 3 green words", "Chat with Buddy about feelings".
   - Implement a "Quest Progress" bar on the homepage.
3. **Say & Play Games**:
   - Gamify pronunciation practice with keywords.
   - Add "Word Bubbles" that pop when spoken correctly.

---

## Phase 13 – Visual Writing & Progress Badges 📅 PLANNED
- Describe images to practice writing.
- Unlockable badges for achievement milestones.
