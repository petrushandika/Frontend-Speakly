# Speakly — Frontend

Next.js 16 frontend for the Speakly AI-powered English learning platform.

---

## Tech Stack

| Layer        | Technology                     | Version |
| ------------ | ------------------------------ | ------- |
| Framework    | Next.js (App Router)           | 16+     |
| Language     | TypeScript                     | 5+      |
| Styling      | Tailwind CSS                   | 4+      |
| Server state | TanStack Query                 | 5+      |
| API layer    | tRPC Client                    | 11+     |
| Client state | Zustand                        | 5+      |
| Forms        | React Hook Form + Zod          | 7+ / 4+ |
| Auth         | Supabase SSR                   | latest  |
| HTTP         | Axios (for non-tRPC endpoints) | 1+      |

---

## Prerequisites

- Node.js 22+
- npm 10+
- Backend running on `http://localhost:8099`

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Fill in your Supabase keys (see Environment Variables section)

# 3. Start development server
npm run dev
# → http://localhost:3099
```

---

## Environment Variables

Create `.env.local` from `.env.example`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8099      # Backend URL
NEXT_PUBLIC_SUPABASE_URL=                      # Supabase → Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=                 # Supabase → Settings → API → anon public
NEXT_PUBLIC_APP_URL=http://localhost:3099      # This app's public URL
```

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/                     # Auth route group — no sidebar
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── onboarding/
│   │       ├── assessment/page.tsx  # CEFR placement test
│   │       ├── goals/page.tsx       # Learning goal selection
│   │       └── preferences/page.tsx # Accent + daily time
│   ├── (dashboard)/                # Dashboard route group — with sidebar
│   │   ├── layout.tsx
│   │   ├── page.tsx                # Daily dashboard
│   │   ├── verb/page.tsx
│   │   ├── vocabulary/
│   │   │   ├── page.tsx
│   │   │   └── flashcards/page.tsx
│   │   ├── grammar/
│   │   │   ├── page.tsx
│   │   │   ├── tenses/page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── speaking/
│   │   │   ├── page.tsx
│   │   │   ├── challenge/page.tsx
│   │   │   ├── call/page.tsx        # AI voice call
│   │   │   └── room/page.tsx        # Peer speaking room
│   │   ├── reading/page.tsx
│   │   ├── writing/page.tsx
│   │   ├── listening/page.tsx
│   │   ├── pronunciation/page.tsx
│   │   ├── progress/page.tsx
│   │   └── settings/page.tsx
│   ├── globals.css                  # Tailwind 4 @theme design tokens
│   └── layout.tsx                   # Root layout
├── components/
│   ├── ui/                          # Design system primitives (shadcn/ui)
│   ├── learning/                    # Feature-specific components
│   │   ├── VerbCard.tsx
│   │   ├── FlashCard.tsx
│   │   ├── GrammarDrill.tsx
│   │   ├── ReadingPassage.tsx
│   │   ├── SpeechRecorder.tsx
│   │   ├── AICallInterface.tsx
│   │   └── TenseTimeline.tsx
│   └── layout/
│       ├── Sidebar.tsx
│       ├── TopBar.tsx
│       └── MobileNav.tsx
├── lib/
│   ├── api.ts                       # Axios client → backend streaming routes
│   ├── trpc.ts                      # tRPC React client — fully typed via AppRouter
│   ├── supabase/
│   │   ├── client.ts                # Browser Supabase client
│   │   └── server.ts                # Server-side Supabase client (RSC + actions)
│   └── utils/
│       └── cn.ts                    # clsx + tailwind-merge helper
├── stores/
│   ├── user.ts                      # User profile + CEFR level (persisted to localStorage)
│   └── lesson.ts                    # Today's lesson activity state
├── hooks/
│   ├── useSpeechRecorder.ts         # MediaRecorder wrapper
│   ├── useAIChat.ts                 # SSE streaming chat hook
│   └── useProgress.ts               # XP + streak helpers
└── types/
    ├── api.ts                        # Response envelope types
    └── lesson.ts                     # Lesson domain types
```

---

## Available Scripts

```bash
npm run dev        # Dev server on :3099 with HMR
npm run build      # Production build
npm run start      # Production server on :3099
npm run lint       # ESLint
```

---

## Key Patterns

### Calling the Backend (tRPC)

All typed API calls use the tRPC client — no manual fetch, full autocomplete:

```tsx
import { trpc } from "@/lib/trpc";

// Query — cached via TanStack Query
const { data, isLoading } = trpc.lessons.getDaily.useQuery();

// Mutation
const complete = trpc.lessons.complete.useMutation();
await complete.mutateAsync({ lessonId: "...", activity: "verb", xp: 10 });

// Type-safe error handling
const { data } = trpc.grammar.getTenseBySlug.useQuery(
  { slug: "present-simple" },
  { enabled: !!slug }
);
```

### SSE Streaming (AI Chat)

Real-time AI responses use native `EventSource` — not tRPC:

```tsx
import { api } from "@/lib/api";

const source = new EventSource(`${process.env.NEXT_PUBLIC_API_URL}/ai/stream`);
source.onmessage = (e) => {
  const { type, content } = JSON.parse(e.data);
  if (type === "token") setResponse((prev) => prev + content);
  if (type === "done") source.close();
};
```

### Server Components with Supabase

```tsx
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // render page
}
```

### Tailwind 4 Design Tokens

Colors and fonts are defined in `globals.css` via `@theme`:

```tsx
// Use as standard Tailwind utility classes
<div className="bg-primary-600 text-white font-display rounded-lg">
  Speakly
</div>

<span className="text-accent-600 animate-xp-gain">+50 XP</span>
```

### Zustand Store

```tsx
import { useUserStore } from "@/stores/user";

const { user, setUser } = useUserStore();
```

---

## Backend API Endpoints

| Type  | Endpoint                          | Description                  |
| ----- | --------------------------------- | ---------------------------- |
| tRPC  | `POST /trpc/lessons.getDaily`     | Today's lesson plan          |
| tRPC  | `POST /trpc/srs.getDue`           | SRS cards due today          |
| tRPC  | `POST /trpc/grammar.getAllTenses` | All 12 tenses with progress  |
| tRPC  | `POST /trpc/progress.getSummary`  | XP, streak, skill radar      |
| tRPC  | `POST /trpc/rooms.create`         | Create peer speaking room    |
| Hono  | `POST /ai/stream`                 | SSE — Groq LLM token stream  |
| Hono  | `POST /speech/transcribe`         | Whisper STT audio upload     |
| Hono  | `POST /speech/synthesize`         | ElevenLabs TTS audio stream  |

All tRPC calls require `Authorization: Bearer <token>` header.
