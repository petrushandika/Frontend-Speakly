# Speakly — Frontend

Next.js 16 frontend for the Speakly AI-powered English learning platform.

---

## Tech Stack

| Layer        | Technology                  | Version |
| ------------ | --------------------------- | ------- |
| Framework    | Next.js (App Router)        | 16+     |
| Language     | TypeScript                  | 5+      |
| Styling      | Tailwind CSS                | 4+      |
| Server state | TanStack Query              | 5+      |
| API layer    | tRPC Client                 | 11+     |
| Client state | Zustand                     | 5+      |
| Forms        | React Hook Form + Zod       | 7+ / 4+ |
| Auth         | Supabase SSR                | latest  |
| Charts       | Recharts                    | 3+      |
| Toasts       | sonner                      | 2+      |
| Icons        | lucide-react                | 1.20+   |

---

## Prerequisites

- Node.js 22+
- npm 10+
- Backend running on `http://localhost:8099` with Redis on `localhost:6379`

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Fill in your Supabase keys

# 3. Start development server (Turbopack)
npm run dev
# → http://localhost:3099
```

---

## Environment Variables

```bash
NEXT_PUBLIC_API_URL=http://localhost:8099
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3099
```

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/                       # Auth route group — no sidebar
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── onboarding/
│   │       ├── assessment/page.tsx   # CEFR placement test
│   │       ├── goals/page.tsx
│   │       └── preferences/page.tsx
│   ├── (dashboard)/                  # Dashboard route group — with sidebar
│   │   ├── layout.tsx
│   │   ├── home/page.tsx             # Daily dashboard
│   │   ├── lessons/
│   │   │   └── [id]/page.tsx
│   │   ├── vocabulary/
│   │   │   ├── page.tsx             # CEFR word bank with accent-aware speaker
│   │   │   └── flashcards/page.tsx  # SRS flashcard review
│   │   ├── chat/page.tsx            # AI chat with SSE streaming
│   │   ├── call/page.tsx            # Voice call (VAD + STT + TTS pipeline)
│   │   ├── speaking/page.tsx        # Speaking challenge
│   │   ├── rooms/page.tsx           # Live speaking rooms (SSE real-time chat)
│   │   ├── progress/page.tsx        # XP, streak, error analytics
│   │   └── settings/page.tsx        # Profile, CEFR level, accent preference
│   ├── globals.css                  # Tailwind 4 @theme design tokens
│   └── layout.tsx                   # Root layout (suppressHydrationWarning)
├── components/
│   └── Providers.tsx                # tRPC + QueryClient + Supabase auth sync + Toaster
├── hooks/
│   ├── useAIChat.ts                 # SSE streaming chat — multi-session, localStorage persistence
│   ├── useVoiceChat.ts              # Voice call — VAD, STT, TTS queue, session history
│   ├── useSpeech.ts                 # TTS hook — sequential chunk synthesis with ElevenLabs
│   └── useSpeak.ts                  # Simple TTS hook — reads accent from tRPC profile cache
├── lib/
│   ├── audio.ts                     # MediaRecorder MIME helpers, blob utils
│   ├── trpc.ts                      # tRPC React client + typed trpcClient singleton
│   └── supabase/
│       ├── client.ts                # Browser Supabase client
│       └── server.ts                # Server-side Supabase client (RSC + actions)
└── types/                           # Shared TypeScript types
```

---

## Available Scripts

```bash
npm run dev        # Dev server on :3099 with Turbopack HMR
npm run build      # Production build
npm run start      # Production server on :3099
npm run lint       # ESLint
```

---

## Key Patterns

### tRPC Calls

All typed API calls go through tRPC. The access token is automatically injected from `localStorage`:

```tsx
import { trpc } from "@/lib/trpc";

// Query — cached via TanStack Query
const { data: profile } = trpc.users.getProfile.useQuery();

// Mutation
const update = trpc.users.updateProfile.useMutation();
update.mutate({ cefrLevel: "B2", accentPreference: "british" });
```

### AI Chat Streaming

`useAIChat` handles SSE streaming with session persistence in `localStorage`:

```tsx
import { useAIChat } from "@/hooks/useAIChat";

const { messages, sendMessage, isLoading } = useAIChat();
await sendMessage("Tell me about yourself.");
// History is capped to last 20 messages before sending to backend
```

### Voice Call Pipeline

`useVoiceChat` orchestrates the full pipeline:
1. `getUserMedia` → VAD silence detection (3s threshold) → MediaRecorder
2. Audio blob → `POST /speech/transcribe` (Groq Whisper STT)
3. Transcript → `POST /ai/stream` (Groq LLM, SSE, voiceMode=true)
4. Response sentences → sequential ElevenLabs TTS with 1-chunk lookahead

```tsx
import { useVoiceChat } from "@/hooks/useVoiceChat";

const { voiceState, messages, startListening, stopListening } = useVoiceChat({
  accent: "australian",
  mode: "free_talk",
});
```

### Accent-Aware TTS

`useSpeak` reads the user's saved accent preference from the tRPC profile cache:

```tsx
import { useSpeak } from "@/hooks/useSpeak";

const speak = useSpeak(); // auto-reads accent from profile
await speak("Good morning! How are you today?");
```

### Supabase Auth Sync

`Providers.tsx` syncs the Supabase session token to `localStorage` on every auth state change. All tRPC and Hono fetch calls read from `localStorage.getItem("sb-access-token")`.

---

## Backend API Reference

### tRPC Procedures

All calls go to `POST /trpc/<router>.<procedure>` and require a valid Bearer token.

| Router       | Key Procedures                                                          |
| ------------ | ----------------------------------------------------------------------- |
| `users`      | `getProfile`, `createProfile`, `updateProfile`, `getAvatarUploadUrl`   |
| `lessons`    | `getAll`, `getById`, `complete`                                         |
| `srs`        | `getDue`, `submitReview`, `addCard`, `deleteCard`                       |
| `progress`   | `getSummary`, `getErrors`, `getRecentProgress`, `getDueFlashcardsCount`, `updateStreak` |
| `grammar`    | `getErrors`, `saveError`, `saveBatch`                                   |
| `vocabulary` | `getWords`, `getFlashcards`                                             |
| `rooms`      | `getActive`, `create`, `join`, `leave`, `close`, `getMessages`, `sendMessage` |
| `ai`         | `analyzeFeedback`, `generateQuiz`, `explainGrammar`, `scorePronunciation`, `getRecommendations`, `classifyWord`, `getErrorAnalytics`, `generateReadingText`, `analyzeReadingAloud`, `getDailySpeakingChallenge` |

### Native Hono Endpoints

Called directly with `fetch()` using `Authorization: Bearer <token>`:

| Method   | Path                      | Description                              |
| -------- | ------------------------- | ---------------------------------------- |
| `POST`   | `/ai/stream`              | SSE — Groq LLM token stream              |
| `POST`   | `/ai/summarize`           | Summarize session to long-term memory    |
| `GET`    | `/ai/memory`              | Get stored conversation summary          |
| `DELETE` | `/ai/memory`              | Clear conversation summary               |
| `POST`   | `/speech/transcribe`      | Whisper STT — multipart/form-data audio  |
| `POST`   | `/speech/synthesize`      | ElevenLabs TTS — returns audio/mpeg blob |
| `GET`    | `/rooms/:roomId/events`   | SSE — real-time room chat (token in query param) |

---

## Design System

Colors, fonts, and spacing are defined in `globals.css` via Tailwind 4 `@theme`. Use standard utility classes:

```tsx
<div className="bg-primary-600 text-white rounded-[18px]">
  Card
</div>
<span className="text-[var(--foreground)]/55">
  Muted text
</span>
```

Toast notifications appear top-center via `<Toaster position="top-center" richColors />`.
