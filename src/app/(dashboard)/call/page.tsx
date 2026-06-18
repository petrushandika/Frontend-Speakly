"use client";

import { useEffect, useRef, useState } from "react";
import {
  Mic, MicOff, Phone, PhoneOff, Volume2, Loader2,
  Plus, PanelLeft, Trash2, X,
} from "lucide-react";
import { useVoiceChat, type VoiceState, type VoiceMessage, type VoiceSession } from "@/hooks/useVoiceChat";
import { trpc } from "@/lib/trpc";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(ts: number): string {
  const diffMs  = Date.now() - ts;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH   = Math.floor(diffMs / 3_600_000);
  const diffD   = Math.floor(diffMs / 86_400_000);
  if (diffMin < 1)  return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffH   < 24) return `${diffH}h ago`;
  if (diffD   < 7)  return `${diffD}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── State Indicator ───────────────────────────────────────────────────────────

function StateIndicator({ state }: { state: VoiceState }) {
  const cfg = {
    idle:     { label: "Tap mic to speak",  cls: "bg-[var(--surface)] border border-[var(--line)] text-[var(--foreground)]/55" },
    listening:{ label: "Listening…",        cls: "bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400" },
    thinking: { label: "Aria is thinking…", cls: "bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 dark:text-amber-400" },
    speaking: { label: "Aria is speaking…", cls: "bg-primary-50 dark:bg-primary-900/40 border border-primary-200 dark:border-primary-800 text-primary-600 dark:text-primary-400" },
  }[state];

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold ${cfg.cls}`}>
      {state === "listening" && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
      )}
      {state === "thinking" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {state === "speaking" && <Volume2 className="w-3.5 h-3.5" />}
      {cfg.label}
    </div>
  );
}

// ── Mic Button ────────────────────────────────────────────────────────────────

function MicButton({
  state, onStart, onStop, onInterrupt,
}: {
  state: VoiceState;
  onStart: () => void;
  onStop: () => void;
  onInterrupt: () => void;
}) {
  const isListening = state === "listening";
  const isBusy      = state === "thinking" || state === "speaking";

  return (
    <button
      onClick={isBusy ? onInterrupt : isListening ? onStop : onStart}
      className={`
        relative w-20 h-20 rounded-full flex items-center justify-center
        focus:outline-none focus:ring-4 focus:ring-offset-2
        transition-all duration-200 cursor-pointer shadow-[0_4px_0_rgba(0,0,0,0.3)] active:translate-y-[4px] active:shadow-none
        ${isListening
          ? "bg-red-500 hover:bg-red-600 focus:ring-red-300 scale-110"
          : isBusy
            ? "bg-[var(--line)] hover:bg-[var(--line-soft)] focus:ring-[var(--line)]"
            : "bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-stone-200 focus:ring-primary-300"
        }
      `}
    >
      {isListening && (
        <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-40" />
      )}
      {isBusy
        ? <PhoneOff className="w-7 h-7 text-[var(--foreground)]/55" />
        : isListening
          ? <MicOff className="w-7 h-7 text-white" />
          : <Mic    className="w-7 h-7 text-white dark:text-stone-900" />
      }
    </button>
  );
}

// ── Message Bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: VoiceMessage }) {
  const isUser = msg.role === "user";
  const text   = msg.text.split("— Small note:")[0].trim();
  const note   = msg.text.includes("— Small note:")
    ? msg.text.split("— Small note:")[1]?.trim()
    : null;

  return (
    <div className={`flex gap-3 my-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {/* Aria avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1 shadow-sm">
          AI
        </div>
      )}

      <div className={`flex flex-col gap-1.5 max-w-[78%] ${isUser ? "items-end" : "items-start"}`}>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
          isUser
            ? "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-tr-sm"
            : "bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] text-[var(--foreground)] rounded-tl-sm"
        }`}>
          {text}
        </div>
        {note && (
          <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl text-xs text-amber-700 dark:text-amber-400 dark:text-amber-400 max-w-full">
            <span className="font-bold">Note:</span> {note}
          </div>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-[var(--surface-strong)] border border-[var(--line)] flex items-center justify-center text-[var(--foreground)]/70 text-xs font-bold shrink-0 mt-1">
          You
        </div>
      )}
    </div>
  );
}

// ── History Sidebar ───────────────────────────────────────────────────────────

function HistorySidebar({
  sessions, activeId, onSwitch, onDelete, onNew,
}: {
  sessions: VoiceSession[];
  activeId: string | null;
  onSwitch: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="w-64 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-[var(--line)] shrink-0">
        <span className="text-xs font-bold text-[var(--foreground)]/50 uppercase tracking-widest">History</span>
        <button
          onClick={onNew}
          title="New session"
          className="w-7 h-7 rounded-lg bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-stone-200 text-white dark:text-stone-900 flex items-center justify-center transition-all cursor-pointer shadow-[0_2px_0_rgba(0,0,0,0.3)] active:translate-y-[2px] active:shadow-none"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {sorted.length === 0 && (
          <p className="text-xs text-[var(--foreground)]/40 text-center py-8 px-4">No voice sessions yet</p>
        )}
        {sorted.map((s) => {
          const isActive = s.id === activeId;
          const msgCount = s.messages.filter((m) => m.role === "user").length;
          return (
            <div
              key={s.id}
              onMouseEnter={() => setHovered(s.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSwitch(s.id)}
              className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                isActive
                  ? "bg-primary-50 dark:bg-primary-900/40 border border-primary-100 dark:border-primary-800"
                  : "hover:bg-[var(--surface)] border border-transparent hover:border-[var(--line)]"
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold truncate ${isActive ? "text-primary-700 dark:text-primary-400" : "text-[var(--foreground)]/80"}`}>
                  {s.title}
                </p>
                <p className="text-[10px] text-[var(--foreground)]/40 mt-0.5 font-medium">
                  {formatDate(s.updatedAt)}
                  {msgCount > 0 && ` · ${msgCount} msg${msgCount !== 1 ? "s" : ""}`}
                </p>
              </div>
              {hovered === s.id && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                  className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[var(--foreground)]/40 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function VoiceCallPage() {
  const { data: profile } = trpc.users.getProfile.useQuery();
  const accent = profile?.accentPreference ?? "american";
  const utils = trpc.useUtils();

  const awardXP = trpc.progress.awardXP.useMutation({
    onSuccess: () => utils.progress.getSummary.invalidate(),
  });
  const updateStreak = trpc.progress.updateStreak.useMutation({
    onSuccess: () => utils.progress.getSummary.invalidate(),
  });

  const [error, setError]             = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Track XP awarded per session to avoid double-awarding
  const awardedSessionRef = useRef<string | null>(null);

  const {
    voiceState, messages, sessions, activeSession,
    streamingText, startListening, stopListening,
    interrupt, newSession, switchSession, deleteSession,
  } = useVoiceChat({ accent, onError: setError });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // Award XP once per session when the first AI reply completes (voiceState returns to idle with messages)
  useEffect(() => {
    const sessionId = activeSession?.id;
    if (!sessionId || awardedSessionRef.current === sessionId) return;
    const hasAiReply = messages.some((m) => m.role === "assistant");
    if (voiceState === "idle" && hasAiReply) {
      awardedSessionRef.current = sessionId;
      // 10 XP per AI exchange, capped at 50 per session
      const exchanges = messages.filter((m) => m.role === "assistant").length;
      awardXP.mutate({ amount: Math.min(exchanges * 10, 50) });
      updateStreak.mutate();
    }
  }, [voiceState, messages, activeSession?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isEmpty = messages.length === 0 && !streamingText;

  return (
    <div className="flex h-full w-full overflow-hidden relative">

      {/* Mobile overlay backdrop */}
      {showHistory && (
        <div
          className="fixed inset-0 z-30 bg-stone-900/30 backdrop-blur-sm md:hidden"
          onClick={() => setShowHistory(false)}
        />
      )}

      {/* History sidebar */}
      <aside className={`
        z-40 flex flex-col border-r border-[var(--line)] bg-[var(--surface-strong)] overflow-hidden transition-all duration-200
        md:relative md:shrink-0
        fixed inset-y-0 left-0 md:inset-auto
        ${showHistory ? "w-64 translate-x-0" : "w-64 -translate-x-full md:w-0 md:translate-x-0"}
      `}>
        <HistorySidebar
          sessions={sessions}
          activeId={activeSession?.id ?? null}
          onSwitch={switchSession}
          onDelete={deleteSession}
          onNew={newSession}
        />
      </aside>

      {/* Main area */}
      <div className="flex flex-col flex-1 p-3 md:p-8 min-w-0 overflow-hidden">

        {/* Header — identical structure to chat page */}
        <div className="flex items-center justify-between px-3 py-2.5 border-[1.5px] border-[var(--line)] bg-[var(--surface-strong)] rounded-[18px] shadow-sm mb-4 shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setShowHistory(!showHistory)}
              title="Toggle history"
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-[0_2px_0_var(--line)] active:translate-y-[2px] active:shadow-none ${
                showHistory
                  ? "bg-primary-50 dark:bg-primary-900/40 border border-primary-200 dark:border-primary-700 text-primary-600 dark:text-primary-400"
                  : "bg-[var(--surface)] border border-[var(--line)] text-[var(--foreground)]/40 hover:text-[var(--foreground)]/70"
              }`}
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center shrink-0 shadow-sm">
              <Phone className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[var(--foreground)] text-sm leading-tight truncate">
                {activeSession?.title ?? "Voice Call"}
              </p>
              <p className="text-xs text-emerald-500 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-ping" />
                Aria · AI English Tutor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={newSession}
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground)]/40 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 border border-[var(--line)] hover:border-primary-100 dark:hover:border-primary-800 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-[0_2px_0_var(--line)] active:translate-y-[2px] active:shadow-none"
            >
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>
        </div>

        {/* Transcript panel — same style as chat message window */}
        <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-5 rounded-[18px] bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] shadow-sm min-h-0 mb-4">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center max-w-xs mx-auto">
              <div className="w-14 h-14 rounded-[18px] bg-primary-50 dark:bg-primary-900/40 border border-primary-100 dark:border-primary-800 flex items-center justify-center">
                <Mic className="w-7 h-7 text-primary-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-[var(--foreground)]">Voice Call with Aria</h2>
                <p className="text-sm text-[var(--foreground)]/60 leading-relaxed">
                  Tap the mic below and start speaking — Aria will reply by voice in real-time.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-[var(--foreground)]/40">
                {["Speech-to-Speech", "Auto grammar tips", "Native accent"].map((t) => (
                  <span key={t} className="px-2.5 py-1 bg-[var(--surface)] border border-[var(--line)] rounded-full shadow-[0_2px_0_var(--line-soft)]">{t}</span>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}

              {streamingText && (
                <div className="flex gap-3 my-3 justify-start">
                  <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1 shadow-sm">
                    AI
                  </div>
                  <div className="max-w-[78%]">
                    <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] text-sm leading-relaxed text-[var(--foreground)] shadow-sm">
                      {streamingText}
                      <span className="inline-block w-1 h-4 bg-primary-400 ml-0.5 animate-pulse rounded" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 flex justify-between items-center shrink-0">
            <span className="font-semibold">{error}</span>
            <button onClick={() => setError(null)} className="ml-2 p-0.5 hover:text-red-800 dark:hover:text-red-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Mic controls — bottom panel */}
        <div className="bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] rounded-[18px] shadow-[0_3px_0_var(--line)] px-6 py-5 flex flex-col items-center gap-4 shrink-0">
          <StateIndicator state={voiceState} />

          <MicButton
            state={voiceState}
            onStart={startListening}
            onStop={stopListening}
            onInterrupt={interrupt}
          />

          <p className="text-[11px] text-[var(--foreground)]/40 font-medium">
            {voiceState === "idle"      && "Tap to start · auto-stops on silence"}
            {voiceState === "listening" && "Recording… tap to send early"}
            {(voiceState === "thinking" || voiceState === "speaking") && "Tap to interrupt Aria"}
          </p>
        </div>
      </div>
    </div>
  );
}
