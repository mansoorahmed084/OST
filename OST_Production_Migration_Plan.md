# OST Production Migration & End-to-End Implementation Plan

# OST (Omar Speech Teacher)
## Production Architecture & Migration Roadmap

Version: 1.0  
Prepared For: OST Product Modernization  
Goal: Productionize OST for Web + Mobile with Shared AI Backend

---

# 1. Executive Summary

OST has successfully evolved beyond prototype stage and now requires a scalable,
maintainable, production-grade architecture.

The current implementation:
- Uses Flask
- Runs locally
- Contains working AI functionality
- Includes early UI/UX implementation
- Demonstrates strong product-market direction

However, to support:
- Web app
- Android/iOS app
- Shared backend
- Real-time AI interactions
- Parent dashboards
- Adaptive learning
- Analytics
- Offline sync
- Future scaling

…the application must migrate to a more structured production architecture.

This migration plan preserves:
- Existing Python AI logic
- Existing Gemini/OpenAI integrations
- Existing learning flows
- Existing mission/word systems

while modernizing:
- frontend architecture
- backend structure
- database
- deployment
- API layers
- scalability

---

# 2. Recommended Production Stack

## Frontend Web
- Next.js
- TypeScript
- Tailwind CSS
- Framer Motion
- Zustand
- React Query

## Mobile App
- Flutter

## Backend
- FastAPI (Python)

## Database
- PostgreSQL

## Cache
- Redis

## Storage
- Cloudflare R2 or AWS S3

## AI Layer
- Existing Python AI modules from OST reused directly

## Deployment
Frontend:
- Vercel

Backend:
- Railway / GCP

Database:
- Managed PostgreSQL

---

# 3. Why FastAPI Instead of Flask

Flask is excellent for prototypes but has limitations for larger production systems.

FastAPI advantages:
- Async support
- Faster throughput
- Typed APIs
- Auto Swagger docs
- Better mobile integration
- Cleaner architecture
- Easier scalability
- Better websocket support
- Better long-term maintainability

MOST IMPORTANT:
The existing Python AI functionality can be reused with minimal rewrite.

---

# 4. High-Level Architecture

## Final Architecture

Client Layer:
- Next.js Web App
- Flutter Mobile App

API Layer:
- FastAPI Gateway

Service Layer:
- Story Generation Service
- Quiz Service
- Chat Buddy Service
- Vocabulary Service
- Badge Service
- Progress Service

AI Layer:
- Existing OST Python AI modules
- Gemini/OpenAI integrations
- NLP utilities
- Story prompt engines

Storage Layer:
- PostgreSQL
- Redis
- Object Storage

---

# 5. Existing OST Functionality to Reuse

The following should be migrated with minimal modifications:

## Reusable AI Components
- Story generation logic
- Quiz generation
- Vocabulary extraction
- Chat buddy prompts
- Prompt templates
- Audio generation logic
- Existing Python utilities

## Reusable Product Logic
- Daily missions
- Badge logic
- Progress logic
- Word tracking
- Reading flows
- Story builder logic

## Reusable Assets
- Images
- Audio prompts
- Story datasets
- Icons
- Theme direction

---

# 6. Recommended Repository Structure

```text
ost-platform/

├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── services/
│   │   ├── ai/
│   │   ├── models/
│   │   ├── db/
│   │   ├── schemas/
│   │   ├── middleware/
│   │   └── main.py
│   │
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend-web/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── store/
│   ├── services/
│   └── public/
│
├── mobile-app/
│   ├── lib/
│   │   ├── screens/
│   │   ├── widgets/
│   │   ├── services/
│   │   ├── models/
│   │   └── providers/
│
├── shared-assets/
│
└── infra/
```

---

# 7. Backend Migration Plan (Flask → FastAPI)

## Phase 1 — Create FastAPI Skeleton

Create:
- app/main.py
- routers
- services
- schemas
- db layer

Install:
- FastAPI
- Uvicorn
- SQLAlchemy
- asyncpg
- Pydantic
- Alembic

---

## Phase 2 — Move Existing AI Logic

Move:
- AI prompt generation
- Gemini/OpenAI wrappers
- story generation utilities
- quiz logic
- NLP logic

into:
- backend/app/ai/

IMPORTANT:
Do not rewrite AI functionality.
Only modularize it.

---

## Phase 3 — Build APIs

### Story API
POST /stories/generate

### Quiz API
POST /quiz/generate

### Chat Buddy API
POST /chat/message

### Vocabulary API
GET /words
POST /words/save

### Progress API
POST /progress/update

### Badge API
GET /badges

---

# 8. Database Design

## Tables

### users
- id
- child_name
- avatar
- age_group

### stories
- id
- title
- topic
- content
- image_url
- audio_url

### words
- id
- word
- meaning
- seen_count
- mastered

### progress
- id
- user_id
- lessons_completed
- streak

### badges
- id
- name
- unlocked

### missions
- id
- title
- completed

---

# 9. Web App Migration (Current UI → Next.js)

## Step 1
Create design system:
- spacing scale
- typography scale
- button system
- card system

## Step 2
Create reusable components:
- Navbar
- StoryCard
- MissionCard
- WordCard
- AudioPlayer
- ProgressBar

## Step 3
Rebuild screens:
- Home
- Daily Adventure
- Words
- Read & Learn
- Speaking Practice
- Memory
- Quiz
- Badges

---

# 10. Mobile App (Flutter)

## Why Flutter
- One codebase
- iOS ready
- Smooth animations
- Excellent accessibility
- Better child-friendly UI consistency

## Mobile Features
- Shared APIs
- Offline mode
- Local cache
- Speech recognition
- TTS
- Audio playback

---

# 11. Accessibility Requirements

VERY IMPORTANT

The app is designed for neurodivergent children.

Requirements:
- Minimal scrolling
- Predictable layouts
- Calm transitions
- No clutter
- Large buttons
- Centered controls
- Reduced cognitive load
- Consistent navigation
- Friendly feedback
- No overwhelming animations

---

# 12. Design System

## Colors
- Soft purple
- Deep blue
- Teal accents
- Soft orange highlights

## Typography
- Rounded friendly font
- Large headings
- Clear spacing

## Components
- Rounded cards
- Soft shadows
- Calm gradients
- Large CTA buttons

---

# 13. Performance Optimization

## Backend
- Async FastAPI
- Redis caching
- Connection pooling

## Frontend
- Lazy loading
- Route splitting
- Optimized images

## Mobile
- Local cache
- Preloaded assets
- Efficient animations

---

# 14. Authentication Plan

Initial:
- Simple child profile

Later:
- Parent accounts
- JWT auth
- Google sign-in

---

# 15. Deployment Architecture

## Web
Vercel

## Backend
Render

## Database
Render Managed PostgreSQL

## Storage
Cloudflare R2

---

# 16. CI/CD

Use:
- GitHub Actions

Pipelines:
- lint
- test
- build
- deploy

---

# 17. Development Phases

# PHASE 1 — Backend Modernization
Duration: 2–3 weeks

Tasks:
- FastAPI setup
- DB setup
- AI migration
- APIs

---

# PHASE 2 — Web Rewrite
Duration: 3–5 weeks

Tasks:
- Design system
- Next.js setup
- Responsive UI
- Accessibility

---

# PHASE 3 — Flutter App
Duration: 4–6 weeks

Tasks:
- Shared APIs
- Speech features
- Offline mode

---

# PHASE 4 — Optimization
Duration: 2 weeks

Tasks:
- caching
- analytics
- polish
- accessibility review

---

# 18. API Example

## Generate Story

POST /stories/generate

Request:
```json
{
  "topic": "ambulance",
  "difficulty": "easy"
}
```

Response:
```json
{
  "title": "The Fast Ambulance",
  "story": "...",
  "audio_url": "...",
  "image_url": "..."
}
```

---

# 19. Long-Term Features

Future roadmap:
- Adaptive learning
- Parent dashboard
- Teacher dashboard
- Progress analytics
- AI speech scoring
- Multiplayer learning
- Offline-first sync
- Personalized missions

---

# 20. Final Recommendation

DO NOT rebuild everything at once.

Recommended order:

1. FastAPI backend
2. PostgreSQL
3. Next.js frontend
4. Flutter app
5. Shared APIs
6. Production deployment

MOST IMPORTANT:
Reuse all existing Python AI functionality from OST.
Avoid rewriting prompt systems or AI integrations.

The strongest differentiator for OST will not be AI alone.

It will be:
- simplicity
- emotional comfort
- consistency
- calm UX
- accessibility for neurodivergent children

That is where OST can become exceptional.

---

# 21. Implementation Strategy (Claude Code — How I Would Build This)

This section details the concrete implementation approach, organized by phase. Each phase includes specific file-by-file actions, migration patterns, and decision rationale.

---

## Branding: OST → Verbalyft

- Product name: **Verbalyft** (domain: verbalyft.com)
- Internal codename/repo: `verbalyft-platform` (monorepo)
- The child-facing brand stays playful — Verbalyft is the parent/market-facing name
- All API paths, package names, environment variables use `verbalyft` prefix

---

## Repository Strategy: Turborepo Monorepo

```text
verbalyft-platform/
├── apps/
│   ├── web/                  # Next.js 15 (App Router)
│   └── mobile/               # Flutter app
├── packages/
│   ├── ui/                   # Shared React component library (web design system)
│   ├── api-client/           # Generated TypeScript SDK from OpenAPI spec
│   └── shared-types/         # Shared TypeScript types/constants
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app entry
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── stories.py
│   │   │   │   ├── quiz.py
│   │   │   │   ├── chat.py
│   │   │   │   ├── vocabulary.py
│   │   │   │   ├── progress.py
│   │   │   │   ├── badges.py
│   │   │   │   ├── missions.py
│   │   │   │   ├── speech.py
│   │   │   │   └── auth.py
│   │   │   └── deps.py       # Dependency injection (DB sessions, current user)
│   │   ├── ai/               # Migrated from current routes/ AI logic
│   │   │   ├── story_engine.py      # from routes/stories.py + routes/generator.py
│   │   │   ├── quiz_engine.py       # from routes/quiz.py
│   │   │   ├── chat_engine.py       # from routes/chatbot.py + routes/chatmode.py
│   │   │   ├── speech_engine.py     # from routes/speech.py
│   │   │   ├── vocabulary_engine.py # from routes/recall.py
│   │   │   └── llm_provider.py      # from routes/llm.py (Gemini/OpenAI wrapper)
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── db/
│   │   │   ├── session.py    # async engine + session factory
│   │   │   └── migrations/   # Alembic
│   │   ├── middleware/       # CORS, rate limiting, error handling
│   │   └── core/
│   │       ├── config.py     # Pydantic Settings (env-based config)
│   │       └── security.py   # JWT, hashing
│   ├── tests/
│   ├── requirements.txt
│   ├── pyproject.toml
│   └── Dockerfile
├── infra/
│   ├── docker-compose.yml    # Local dev (Postgres, Redis, backend)
│   └── render.yaml           # Render deployment config (Blueprint)
├── shared-assets/            # Images, audio, icons (synced to R2)
├── turbo.json
├── package.json
└── .github/
    └── workflows/
        ├── backend-ci.yml
        ├── web-ci.yml
        └── deploy.yml
```

---

## PHASE 1 — Backend Modernization (Detailed Steps)

### Step 1.1: FastAPI Skeleton

Create `backend/app/main.py`:
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import router as v1_router
from app.core.config import settings

app = FastAPI(title="Verbalyft API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, ...)
app.include_router(v1_router, prefix="/api/v1")
```

### Step 1.2: Migrate AI Logic (Zero Rewrite Strategy)

The current AI logic lives in these files:
| Current File | → Backend Location | What It Does |
|---|---|---|
| `routes/llm.py` | `app/ai/llm_provider.py` | Gemini/OpenAI unified wrapper |
| `routes/stories.py` | `app/ai/story_engine.py` | Story generation + TinyStories |
| `routes/generator.py` | `app/ai/story_engine.py` | Story prompt construction |
| `routes/quiz.py` | `app/ai/quiz_engine.py` | Quiz generation from stories |
| `routes/chatbot.py` | `app/ai/chat_engine.py` | Chat buddy logic |
| `routes/chatmode.py` | `app/ai/chat_engine.py` | Chat mode prompts |
| `routes/speech.py` | `app/ai/speech_engine.py` | TTS + speech recognition |
| `routes/recall.py` | `app/ai/vocabulary_engine.py` | Word recall/spaced repetition |
| `routes/achievements.py` | `app/services/badge_service.py` | Badge/achievement logic |
| `routes/images.py` | `app/services/image_service.py` | Image generation |

**Migration pattern for each file:**
1. Copy the core logic (functions that do AI work) into the new `ai/` module
2. Remove Flask-specific decorators (`@app.route`, `request`, `jsonify`)
3. Replace `request.json` with typed Pydantic schemas as function params
4. Replace `jsonify(...)` returns with Pydantic response models
5. Keep all prompt templates, API calls, and logic IDENTICAL

### Step 1.3: Database Migration (SQLite → PostgreSQL)

Current schema lives in `database.py` + `models` implicit in SQLite (`ost.db`).

Migration approach:
1. Define SQLAlchemy 2.0 async models in `backend/app/models/`
2. Use Alembic for migrations
3. Write a one-time `scripts/migrate_sqlite_to_pg.py` that reads `ost.db` and inserts into Postgres
4. For local dev: `docker-compose.yml` spins up Postgres + Redis

**Database schema (expanded from Section 8):**

```sql
-- users (parent accounts)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    provider VARCHAR(50),  -- 'email', 'google'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- child profiles (multiple per parent)
CREATE TABLE child_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    avatar VARCHAR(50),
    age_group VARCHAR(20),  -- '4-5', '6-7', '8-9'
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- stories
CREATE TABLE stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES child_profiles(id),
    title VARCHAR(255),
    topic VARCHAR(100),
    content TEXT,
    difficulty VARCHAR(20),
    image_url VARCHAR(500),
    audio_url VARCHAR(500),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- vocabulary
CREATE TABLE vocabulary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES child_profiles(id),
    word VARCHAR(100),
    meaning TEXT,
    seen_count INT DEFAULT 0,
    correct_count INT DEFAULT 0,
    mastered BOOLEAN DEFAULT FALSE,
    next_review TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- progress
CREATE TABLE progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES child_profiles(id),
    date DATE DEFAULT CURRENT_DATE,
    lessons_completed INT DEFAULT 0,
    words_learned INT DEFAULT 0,
    streak INT DEFAULT 0,
    xp INT DEFAULT 0,
    metadata JSONB DEFAULT '{}'
);

-- badges
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES child_profiles(id),
    badge_type VARCHAR(50),
    name VARCHAR(100),
    unlocked_at TIMESTAMPTZ DEFAULT NOW()
);

-- missions (daily)
CREATE TABLE missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES child_profiles(id),
    date DATE DEFAULT CURRENT_DATE,
    mission_type VARCHAR(50),
    title VARCHAR(200),
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ
);

-- chat_sessions
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES child_profiles(id),
    messages JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Step 1.4: API Design (OpenAPI-first)

All APIs versioned under `/api/v1/`. Key design decisions:
- **Streaming for AI responses**: Story generation and chat use SSE (Server-Sent Events) via FastAPI's `StreamingResponse`
- **Batch endpoints for mobile**: Reduce round-trips with `/api/v1/daily-bundle` that returns missions + progress + unread badges in one call
- **WebSocket for chat**: `/api/v1/ws/chat/{session_id}` for real-time chat buddy

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh

GET    /api/v1/children                    # list child profiles
POST   /api/v1/children                    # create child profile
GET    /api/v1/children/{id}               # get child profile

POST   /api/v1/stories/generate            # generate new story (SSE stream)
GET    /api/v1/stories                     # list past stories
GET    /api/v1/stories/{id}                # get story detail

POST   /api/v1/quiz/generate               # generate quiz from story
POST   /api/v1/quiz/{id}/answer            # submit answer, get score

WS     /api/v1/ws/chat/{session_id}        # real-time chat buddy
POST   /api/v1/chat/sessions               # create new chat session
GET    /api/v1/chat/sessions               # list past sessions

GET    /api/v1/vocabulary                   # get word list
POST   /api/v1/vocabulary/review            # submit review result
GET    /api/v1/vocabulary/due               # words due for review

GET    /api/v1/progress                     # get progress summary
GET    /api/v1/progress/streak              # get streak info

GET    /api/v1/badges                       # get all badges
GET    /api/v1/missions/today               # get today's missions
POST   /api/v1/missions/{id}/complete       # mark mission complete

POST   /api/v1/speech/recognize             # upload audio, get transcript
POST   /api/v1/speech/synthesize            # text → audio URL

GET    /api/v1/daily-bundle                 # mobile: missions + progress + badges in one
```

### Step 1.5: Caching Strategy (Redis)

- Story generation results: cache by `(topic, difficulty, age_group)` for 24h
- Vocabulary lists: cache per child, invalidate on review
- Daily missions: generate once per day, cache until midnight
- Badge calculations: cache, invalidate on progress update

---

## PHASE 2 — Web App (Next.js) Detailed Steps

### Step 2.1: Project Setup

```bash
pnpm create next-app apps/web --typescript --tailwind --app --src-dir
pnpm add framer-motion zustand @tanstack/react-query
```

### Step 2.2: Design System (packages/ui)

Kids-friendly design tokens:
```typescript
// packages/ui/tokens.ts
export const colors = {
  primary: '#7C5CFC',       // Soft purple
  secondary: '#1E3A5F',     // Deep blue  
  accent: '#2DD4BF',        // Teal
  highlight: '#FB923C',     // Soft orange
  background: '#F8F7FF',    // Light lavender
  surface: '#FFFFFF',
  text: '#1E293B',
  textMuted: '#64748B',
  success: '#34D399',
  error: '#F87171',
};

export const radius = {
  sm: '12px',
  md: '16px',
  lg: '24px',
  full: '9999px',
};

export const spacing = {
  touch: '48px',  // minimum touch target
};
```

Component library priorities (build in this order):
1. `Button` — large, rounded, with press animation
2. `Card` — rounded-2xl, soft shadow, no border
3. `Avatar` — child avatar selector
4. `ProgressRing` — circular progress (XP, streaks)
5. `MissionCard` — daily mission with check animation
6. `StoryCard` — story preview with cover image
7. `WordBubble` — vocabulary word with mastery indicator
8. `AudioPlayer` — simple play/pause with waveform
9. `ChatBubble` — friendly chat messages
10. `Badge` — unlockable achievement with shine animation

### Step 2.3: Screen Architecture (App Router)

```text
apps/web/src/app/
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── (app)/
│   ├── layout.tsx            # Main app shell (navbar, child selector)
│   ├── page.tsx              # Dashboard / Home
│   ├── adventures/
│   │   └── page.tsx          # Daily missions
│   ├── stories/
│   │   ├── page.tsx          # Story library
│   │   ├── [id]/page.tsx     # Read story
│   │   └── create/page.tsx   # Story builder
│   ├── words/
│   │   └── page.tsx          # Vocabulary practice
│   ├── chat/
│   │   └── page.tsx          # Chat buddy
│   ├── quiz/
│   │   └── page.tsx          # Quiz mode
│   ├── speak/
│   │   └── page.tsx          # Speaking practice
│   ├── memory/
│   │   └── page.tsx          # Memory match game
│   ├── badges/
│   │   └── page.tsx          # Achievement gallery
│   └── parent/
│       └── page.tsx          # Parent dashboard
└── api/                      # Next.js API routes (proxy to backend if needed)
```

### Step 2.4: State Management

- **Zustand** for client state: current child profile, UI preferences, audio playback state
- **React Query** for server state: stories, vocabulary, progress — with optimistic updates
- **No Redux** — unnecessary complexity for this use case

### Step 2.5: Animation Philosophy

For neurodivergent children:
- Transitions: 200-300ms ease-out (never jarring)
- No auto-playing animations or flashing
- Celebrations: gentle confetti or a star that grows (not explosions)
- Page transitions: simple fade or slide (no complex morphs)
- Loading states: calm pulsing skeleton, not spinners

---

## PHASE 3 — Flutter Mobile App

### Step 3.1: Architecture (Clean Architecture + Riverpod)

```text
apps/mobile/lib/
├── main.dart
├── core/
│   ├── config/
│   ├── theme/               # Mirror web design tokens
│   ├── network/             # Dio HTTP client + interceptors
│   └── storage/             # Hive/Isar for offline cache
├── features/
│   ├── auth/
│   ├── home/
│   ├── stories/
│   ├── quiz/
│   ├── chat/
│   ├── vocabulary/
│   ├── speech/
│   ├── missions/
│   └── badges/
├── shared/
│   ├── widgets/             # Shared UI components
│   └── models/              # Data models (generated from OpenAPI)
└── providers/               # Riverpod providers
```

### Step 3.2: Offline-First Strategy

1. **Cache everything on first load** — stories, vocabulary, missions
2. **Queue mutations offline** — completed missions, quiz answers stored in local DB
3. **Sync on reconnect** — background sync when network returns
4. **Preload daily bundle** — fetch tomorrow's content before bed
5. Use **Hive** for key-value cache, **Isar** for complex queries

### Step 3.3: Platform-Specific Features

- **Speech recognition**: `speech_to_text` package (native iOS/Android)
- **TTS**: `flutter_tts` for offline, backend API for high-quality
- **Audio playback**: `just_audio` with preloading
- **Notifications**: Firebase Cloud Messaging for daily mission reminders (parent-controlled)

---

## PHASE 4 — Deployment & DevOps

### Step 4.1: Local Development

```yaml
# infra/docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: verbalyft
      POSTGRES_USER: verbalyft
      POSTGRES_PASSWORD: localdev
    ports: ["5432:5432"]
  
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
  
  backend:
    build: ../backend
    environment:
      DATABASE_URL: postgresql+asyncpg://verbalyft:localdev@postgres/verbalyft
      REDIS_URL: redis://redis:6379
    ports: ["8000:8000"]
    volumes:
      - ../backend/app:/app/app  # hot reload
```

### Step 4.2: Production Deployment

| Service | Platform | Why |
|---------|----------|-----|
| Web (Next.js) | Vercel | Zero-config, edge caching, preview deploys |
| Backend (FastAPI) | Render | Simple Python hosting, auto-scaling, managed infra |
| Database | Render Postgres or Neon | Managed, auto-backups, connection pooling |
| Redis | Render Redis or Upstash | Managed, low-latency |
| Assets (images/audio) | Cloudflare R2 | S3-compatible, no egress fees, CDN built-in |
| DNS | Cloudflare | Fast DNS, DDoS protection |

### Step 4.3: Environment Variables

```env
# Backend
DATABASE_URL=postgresql+asyncpg://...
REDIS_URL=redis://...
GEMINI_API_KEY=...
OPENAI_API_KEY=...
JWT_SECRET=...
R2_ACCESS_KEY=...
R2_SECRET_KEY=...
R2_BUCKET=verbalyft-assets
CORS_ORIGINS=https://verbalyft.com,https://app.verbalyft.com

# Web
NEXT_PUBLIC_API_URL=https://api.verbalyft.com
NEXT_PUBLIC_WS_URL=wss://api.verbalyft.com
```

### Step 4.4: CI/CD (GitHub Actions)

- **On PR**: lint + type-check + test (backend pytest, web vitest)
- **On merge to main**: auto-deploy web to Vercel, backend to Render
- **Flutter**: separate workflow builds APK/IPA on tag push

---

## Implementation Order (First Session)

When we start building, the first session will:

1. Initialize the monorepo with Turborepo
2. Create `backend/` with FastAPI skeleton + Docker setup
3. Copy AI logic from current `routes/` into `backend/app/ai/` (zero rewrite)
4. Define Pydantic schemas + SQLAlchemy models
5. Wire up first 2 endpoints (story generate + vocabulary) end-to-end
6. Verify with `curl` / Swagger UI that existing AI logic works through new API

This gets us a working backend in one session, proving the migration path before touching frontend.

---

## Key Decisions & Tradeoffs

| Decision | Rationale |
|----------|-----------|
| Monorepo over polyrepo | Shared types, atomic PRs, simpler CI |
| App Router over Pages Router | Better layouts, streaming, server components |
| Riverpod over BLoC (Flutter) | Less boilerplate, better DX for this team size |
| Render over self-hosted | No DevOps overhead, focus on product, simple Python hosting |
| SSE over WebSocket for stories | Simpler, works through CDNs, sufficient for one-way streaming |
| WebSocket for chat only | True bidirectional need — typing indicators, real-time |
| UUID primary keys | No sequential ID enumeration, safe for child data |
| JSONB for flexible fields | Preferences, metadata, chat messages — schema evolution without migrations |
| OpenAPI-first | Auto-generate Flutter + TypeScript clients from spec |
| No GraphQL | Overkill for this API surface; REST + batch endpoint covers mobile needs |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| AI logic breaks during migration | Keep original `routes/` untouched as reference; integration tests compare outputs |
| Latency for mobile in Pakistan/UAE | Cloudflare CDN for assets; Render region in Frankfurt/Singapore |
| Child data privacy (COPPA) | No PII beyond first name; parent consent flow; data encrypted at rest |
| Offline sync conflicts | Last-write-wins for progress; append-only for chat history |
| Flutter build complexity | CI builds both platforms; beta track on Play Store from day 1 |

---

## 22. Implementation Progress Tracker

Last updated: 2026-05-10

### PHASE 1 — Backend Modernization ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| FastAPI skeleton (main.py, config, CORS, lifespan) | ✅ Done | |
| AI logic migrated (story, quiz, chat, speech, vocabulary, llm_provider) | ✅ Done | Zero-rewrite — logic preserved from OST |
| SQLAlchemy 2.0 models (11 tables) | ✅ Done | Using String(36) UUIDs + JSON for SQLite compat |
| Pydantic schemas (auth, story, quiz, chat, vocabulary, speech) | ✅ Done | |
| API endpoints (auth, stories, quiz, chat, vocabulary, speech, progress) | ✅ Done | All returning 200 OK |
| JWT auth + dependency injection | ✅ Done | Direct bcrypt (not passlib) |
| SQLite dev path (no Docker needed) | ✅ Done | `aiosqlite` driver, dual-engine session.py |
| Docker Compose (Postgres + Redis + backend) | ✅ Done | |
| GitHub Actions CI | ✅ Done | |
| SSE streaming for story generation | ✅ Done | POST /stories/generate/stream |
| WebSocket chat endpoint | ✅ Done | WS /ws/chat/{session_id} with token auth |
| Daily bundle endpoint (`/api/v1/daily-bundle`) | ✅ Done | missions + progress + badges + vocab_due in one call |
| Redis caching service | ✅ Done | Graceful fallback if Redis unavailable |
| Alembic versioned migrations | ✅ Done | Initial schema migration generated |
| Child profile CRUD (`/api/v1/children`) | ✅ Done | GET/POST/PUT with ownership verification |
| Mission completion endpoint | ✅ Done | POST /missions/{id}/complete |
| Auth refresh token | ✅ Done | POST /auth/refresh |
| Image generation service | ✅ Done | DALL-E + placeholder fallback |
| Rate limiting middleware | ✅ Done | 120 req/min in-memory (Redis-backed for prod) |
| Deploy to Render (production Postgres) | ⬜ Todo | Blocked on domain/infra setup |

### PHASE 2 — Web App (Next.js) ✅ COMPLETE

| Task | Status | Notes |
|------|--------|-------|
| Next.js 15 App Router + TypeScript + Tailwind | ✅ Done | |
| Design system (colors, tokens, keyframes) | ✅ Done | Kids-friendly, accessibility-first |
| Shared components (Button, Card, Avatar, NavBar, ProgressRing, MissionCard) | ✅ Done | |
| Dashboard / Home page | ✅ Done | Wired to useProgress hook |
| Daily Adventures page | ✅ Done | |
| Story Library page | ✅ Done | Wired to useStories + useGenerateStory |
| Story Reader page (`/stories/[id]`) | ✅ Done | Sentence highlighting |
| Chat Buddy page | ✅ Done | Wired to useSendChatMessage |
| Vocabulary / Words page | ✅ Done | Word bubbles with mastery stars |
| Badges page | ✅ Done | Shine animation |
| Speaking Practice page | ✅ Done | Mic button + waveform |
| Quiz page | ✅ Done | Full flow: questions, hints, scoring |
| Memory Match game page | ✅ Done | Card flip game |
| React Query hooks (all endpoints) | ✅ Done | `src/lib/hooks.ts` |
| Zustand store | ✅ Done | childName, childId, avatar, auth |
| API proxy (Next.js → FastAPI) | ✅ Done | next.config.ts rewrites |
| Vercel deployment | ✅ Done | Build fix pushed (packageManager field) |
| Auth pages (login/register) | ✅ Done | 2-step register with avatar picker |
| Parent dashboard | ✅ Done | Stats grid, badges, learning tips |
| Story builder/create page | ✅ Done | Topic picker + custom input + difficulty |
| Audio player component (waveform) | ✅ Done | Play/pause with progress waveform bars |
| Child profile selector | ✅ Done | Dropdown in app header, multi-child |
| Skeleton loading states | ✅ Done | Card, Story, List, Grid skeletons |
| Accessibility audit (ARIA, keyboard nav) | ✅ Done | skip-to-content, aria-label, aria-current, focus-visible |

### PHASE 3 — Flutter Mobile App

| Task | Status | Notes |
|------|--------|-------|
| Flutter project setup (Clean Arch + Riverpod) | ⬜ Todo | Not started |
| Core: theme, network, offline storage | ⬜ Todo | |
| All feature screens | ⬜ Todo | |
| Offline-first sync | ⬜ Todo | |
| Speech recognition + TTS | ⬜ Todo | |
| OpenAPI client generation | ⬜ Todo | |

### PHASE 4 — Deployment & DevOps

| Task | Status | Notes |
|------|--------|-------|
| Backend on Render | ⬜ Todo | |
| Managed PostgreSQL (Render/Neon) | ⬜ Todo | |
| Redis (Render/Upstash) | ⬜ Todo | |
| Cloudflare R2 for assets | ⬜ Todo | |
| DNS + domain (verbalyft.com) | ⬜ Todo | |
| Flutter CI/CD (APK/IPA on tag) | ⬜ Todo | |

### Summary

- **Phase 1 (Backend)**: ✅ 100% complete — all endpoints, streaming, caching, migrations done
- **Phase 2 (Web)**: ✅ 100% complete — all pages, components, auth, accessibility done
- **Phase 3 (Flutter)**: 0% — not started
- **Phase 4 (DevOps)**: ~20% — Vercel done, Render + infra remaining

### Total API Endpoints: 31
Auth (3) + Children (4) + Stories (4) + Quiz (2) + Chat (3) + Vocabulary (3) + Speech (2) + Progress (4) + Bundle (1) + WebSocket (1) + Docs (3) + Health (1)

