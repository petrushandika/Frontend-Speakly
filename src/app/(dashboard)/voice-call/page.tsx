"use client";

import { useEffect, useRef, useState } from "react";
import {
  Mic, MicOff, Phone, PhoneOff, Volume2, Loader2,
  RefreshCw, PanelLeft, Plus, Trash2,
} from "lucide-react";
import { useVoiceChat, type VoiceState, type VoiceMessage, type VoiceSession } from "@/hooks/useVoiceChat";
import { trpc } from "@/lib/trpc";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(ts: number): string {
  const d   = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH   = Math.floor(diffMs / 3_600_000);
  const diffD   = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1)   return "just now";
  if (diffMin < 60)  return `${diffMin}m ago`;
  if (diffH   < 24)  return `${diffH}h ago`;
  if (diffD   < 7)   return `${diffD}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StateIndicator({ state }: { state: VoiceState }) {
  const cfg = {
    idle:     { label: "Tap mic to speak",      cls: "bg-slate-100 text-slate-500" },
    listening:{ label: "Listening…",            cls: "bg-red-50 text-red-500" },
    thinking: { label: "Aria is thinking…",     cls: "bg-amber-50 text-amber-600" },
    speaking: { label: "Aria is speaking…",     cls: "bg-primary-50 text-primary-600" },
  }[state];

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium ${cfg.cls}`}>
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
        shadow-lg focus:outline-none focus:ring-4 focus:ring-offset-2
        transition-all duration-200
        ${isListening
          ? "bg-red-500 hover:bg-red-600 focus:ring-red-300 scale-110"
          : isBusy
            ? "bg-slate-200 hover:bg-slate-300 focus:ring-slate-200"
            : "bg-primary-600 hover:bg-primary-700 focus:ring-primary-300"
        }
      `}
    >
      {isListening && (
        <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-40" />
      )}
      {isBusy
        ? <PhoneOff className="w-7 h-7 text-slate-500" />
        : isListening
          ? <MicOff className="w-7 h-7 text-white" />
          : <Mic className="w-7 h-7 text-white" />
      }
    </button>
  );
}

function MessageBubble({ msg }: { msg: VoiceMessage }) {
  const isUser = msg.role === "user";
  const text   = msg.text.split("— Small note:")[0].trim();
  const note   = msg.text.includes("— Small note:")
    ? msg.text.split("— Small note:")[1]?.trim()
    : null;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[78%] space-y-1">
        {!isUser && <p className="text-[11px] font-semibold text-slate-400 px-1">Aria</p>}
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-primary-600 text-white rounded-tr-sm"
            : "bg-white border border-slate-100 text-slate-800 rounded-tl-sm shadow-sm"
        }`}>
          {text}
        </div>
        {note && (
          <div className="px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
            {note}
          </div>
        )}
      </div>
    </div>
  );
}

function HistorySidebar({
  sessions,
  activeId,
  onSwitch,
  onDelete,
  onNew,
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
      <div className="flex items-center justify-between px-4 h-14 border-b border-slate-100 shrink-0">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">History</span>
        <button
          onClick={onNew}
          className="w-7 h-7 rounded-lg bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {sorted.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-8 px-4">No voice sessions yet</p>
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
                  ? "bg-primary-50 border border-primary-100"
                  : "hover:bg-white hover:border hover:border-slate-100 border border-transparent"
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold truncate ${isActive ? "text-primary-700" : "text-slate-700"}`}>
                  {s.title}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                  {formatDate(s.updatedAt)}
                  {msgCount > 0 && ` · ${msgCount} msg${msgCount !== 1 ? "s" : ""}`}
                </p>
              </div>
              {hovered === s.id && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                  className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function VoiceCallPage() {
  const { data: profile } = trpc.users.getProfile.useQuery();
  const accent = (profile as any)?.accentPreference ?? "american";

  const [error, setError]           = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    voiceState, messages, sessions, activeSession,
    streamingText, startListening, stopListening,
    interrupt, newSession, switchSession, deleteSession,
  } = useVoiceChat({ accent, onError: setError });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* ── History sidebar ── */}
      <aside className={`shrink-0 flex flex-col border-r border-slate-100 bg-slate-50/60 overflow-hidden transition-all duration-200 ${showHistory ? "w-64" : "w-0"}`}>
        <HistorySidebar
          sessions={sessions}
          activeId={activeSession?.id ?? null}
          onSwitch={switchSession}
          onDelete={deleteSession}
          onNew={newSession}
        />
      </aside>

      {/* ── Main content ── */}
      <div className="flex flex-col flex-1 p-6 md:p-8 min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border border-slate-100 bg-white rounded-2xl shadow-sm mb-4 shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setShowHistory(!showHistory)}
              title="Toggle history"
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                showHistory
                  ? "bg-primary-50 border border-primary-200 text-primary-600"
                  : "bg-slate-50 border border-slate-100 text-slate-400 hover:text-slate-600"
              }`}
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 text-sm leading-tight truncate">
                {activeSession?.title ?? "Voice Call"}
              </p>
              <p className="text-xs text-emerald-500 font-semibold">Aria · AI English Tutor</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={newSession}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-primary-600 hover:bg-primary-50 border border-transparent hover:border-primary-100 px-3 py-1.5 rounded-xl transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" /> New
            </button>
          </div>
        </div>

        {/* Transcript */}
        <div className="flex-1 overflow-y-auto space-y-3 min-h-0 mb-4">
          {messages.length === 0 && !streamingText && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 pb-16">
              <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center">
                <Mic className="w-8 h-8 text-primary-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">Start the conversation</p>
                <p className="text-xs text-slate-400 mt-1">Tap the mic and start speaking — Aria will reply by voice</p>
              </div>
            </div>
          )}

          {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}

          {streamingText && (
            <div className="flex justify-start">
              <div className="max-w-[78%] space-y-1">
                <p className="text-[11px] font-semibold text-slate-400 px-1">Aria</p>
                <div className="px-4 py-2.5 rounded-2xl rounded-tl-sm bg-white border border-slate-100 text-sm leading-relaxed text-slate-800 shadow-sm">
                  {streamingText}
                  <span className="inline-block w-1 h-4 bg-primary-400 ml-0.5 animate-pulse rounded" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Error toast */}
        {error && (
          <div className="mb-3 px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-center justify-between shrink-0">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-600 font-bold">×</button>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm px-6 py-5 flex flex-col items-center gap-4 shrink-0">
          <StateIndicator state={voiceState} />
          <MicButton
            state={voiceState}
            onStart={startListening}
            onStop={stopListening}
            onInterrupt={interrupt}
          />
          <p className="text-[11px] text-slate-400">
            {voiceState === "idle" && "Tap to start · auto-stops on silence"}
            {voiceState === "listening" && "Recording… tap to send early"}
            {(voiceState === "thinking" || voiceState === "speaking") && "Tap to interrupt Aria"}
          </p>
        </div>
      </div>
    </div>
  );
}
