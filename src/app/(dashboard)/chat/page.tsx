"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useAIChat } from "@/hooks/useAIChat";
import { useSpeech } from "@/hooks/useSpeech";
import { ChatBubble } from "@/components/learning/ChatBubble";
import { trpc } from "@/lib/trpc";
import {
  Send, Mic, Square, Volume2, VolumeX, Volume1,
  Briefcase, Calendar, PenLine, Users, Lightbulb,
  MessageSquare, Loader2, X, Plus, PanelLeft, Trash2,
  ChevronDown, Swords, BookOpen, Mic2, Coffee, FileText,
} from "lucide-react";
import type { ConversationMode } from "@/hooks/useAIChat";

const CONVERSATION_MODES: {
  id: ConversationMode;
  label: string;
  icon: React.ElementType;
  color: string;
  desc: string;
  starter: string;
}[] = [
  {
    id: "free_talk",
    label: "Free Talk",
    icon: Coffee,
    color: "bg-[var(--surface-strong)] text-[var(--foreground)]/70 border-[var(--line)] dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700",
    desc: "Ngobrol bebas, Aria balas natural",
    starter: "Hi Aria! Let's have a conversation.",
  },
  {
    id: "roleplay",
    label: "Role Play",
    icon: Users,
    color: "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-primary-200 dark:bg-primary-900/40 dark:text-primary-300 dark:border-primary-700",
    desc: "Simulasi skenario nyata",
    starter: "Let's do a roleplay! Give me a scenario to practice.",
  },
  {
    id: "grammar_drill",
    label: "Grammar Drill",
    icon: BookOpen,
    color: "bg-amber-50 text-amber-700 dark:text-amber-400 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700",
    desc: "Latihan grammar terfokus",
    starter: "I want to practice my grammar. Let's start a drill!",
  },
  {
    id: "debate",
    label: "Debate",
    icon: Swords,
    color: "bg-accent-50 dark:bg-accent-900/20 text-accent-600 border-accent-200 dark:bg-accent-900/30 dark:text-accent-400 dark:border-accent-700",
    desc: "Diskusi & argumentasi",
    starter: "Let's debate! Pick a topic and take the opposite side.",
  },
  {
    id: "storytelling",
    label: "Storytelling",
    icon: Mic2,
    color: "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-700",
    desc: "Co-write cerita bersama",
    starter: "Let's tell a story together! You start.",
  },
  {
    id: "interview_prep",
    label: "Interview Prep",
    icon: FileText,
    color: "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-700",
    desc: "Latihan wawancara kerja",
    starter: "I want to practice for a job interview. Can you be my interviewer?",
  },
];

const SUGGESTED_STARTERS = [
  { text: "Tell me about yourself and what you do for work.", Icon: Briefcase },
  { text: "What did you do last weekend?", Icon: Calendar },
  { text: "Can you help me practice present perfect tense?", Icon: PenLine },
  { text: "Let's do a job interview roleplay.", Icon: Users },
  { text: "Explain the difference between 'since' and 'for'.", Icon: Lightbulb },
];

function getContextualSuggestions(lastAIContent: string): string[] {
  const lower = lastAIContent.toLowerCase();
  if (lower.includes("tense") || lower.includes("grammar") || lower.includes("mistake") || lower.includes("correction")) {
    return ["Can you give me more examples?", "Can we do a quick practice exercise?", "What's another common grammar mistake?"];
  }
  if (lower.includes("vocabulary") || lower.includes("word") || lower.includes("phrase") || lower.includes("meaning")) {
    return ["How do I use this in a sentence?", "Are there synonyms for this?", "Give me more vocabulary like this"];
  }
  if (lower.includes("roleplay") || lower.includes("scenario") || lower.includes("interview") || lower.includes("character")) {
    return ["Let's continue", "Can you play a different character?", "How did I do in that roleplay?"];
  }
  if (lower.includes("explain") || lower.includes("difference") || lower.includes("rule")) {
    return ["Can you simplify that?", "Give me an example of this rule", "Can we practice using this?"];
  }
  return ["Tell me more about that", "Can you give an example?", "What should I practice next?"];
}

function formatSessionDate(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const day = 86400000;
  if (diff < day) return "Today";
  if (diff < day * 2) return "Yesterday";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ChatPage() {
  const { data: profile } = trpc.users.getProfile.useQuery();
  const accent = profile?.accentPreference ?? "american";
  const utils = trpc.useUtils();

  const awardXP = trpc.progress.awardXP.useMutation({
    onSuccess: () => utils.progress.getSummary.invalidate(),
  });
  const updateStreak = trpc.progress.updateStreak.useMutation({
    onSuccess: () => utils.progress.getSummary.invalidate(),
  });
  // Track last message count so we award XP exactly once per AI reply
  const lastAiCountRef = useRef(0);

  const {
    messages,
    sessions,
    activeSession,
    isLoading,
    mode,
    setMode,
    sendMessage,
    newSession,
    switchSession,
    deleteSession,
    clearChat,
  } = useAIChat({ onError: (e) => setError(e) });

  const [showModeMenu, setShowModeMenu] = useState(false);
  const activeMode = CONVERSATION_MODES.find((m) => m.id === mode) ?? CONVERSATION_MODES[0];

  const { isRecording, isSpeaking, startRecording, stopRecording, speak, stopSpeaking } =
    useSpeech({
      onTranscript: (text) => setInput(text),
      onError: (e) => setError(e),
    });

  const [input, setInput]         = useState("");
  const [error, setError]         = useState<string | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [hoveredSession, setHoveredSession] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Award XP once per completed AI reply (5 XP per reply, streak on first reply)
  useEffect(() => {
    const aiReplies = messages.filter((m) => m.role === "assistant" && !m.isStreaming).length;
    if (aiReplies > lastAiCountRef.current) {
      const gained = aiReplies - lastAiCountRef.current;
      if (lastAiCountRef.current === 0) updateStreak.mutate();
      awardXP.mutate({ amount: gained * 5 });
      lastAiCountRef.current = aiReplies;
    }
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-speak last AI message when TTS is enabled
  const lastMsg = messages[messages.length - 1];
  const prevLastRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      ttsEnabled &&
      lastMsg?.role === "assistant" &&
      !lastMsg.isStreaming &&
      lastMsg.id !== prevLastRef.current
    ) {
      prevLastRef.current = lastMsg.id;
      const textToSpeak = lastMsg.content.split("— Small note:")[0].trim();
      speak(textToSpeak, accent);
    }
  }, [lastMsg, ttsEnabled, accent, speak]);

  // Contextual suggestions
  const suggestions = useMemo(() => {
    if (isLoading) return [];
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant" || last.isStreaming) return [];
    const mainText = last.content.split("— Small note:")[0];
    return getContextualSuggestions(mainText);
  }, [messages, isLoading]);

  function handleModeChange(newMode: ConversationMode) {
    if (newMode === mode) { setShowModeMenu(false); return; }
    // Clear conversation context so AI starts fresh in new mode
    newSession();
    setMode(newMode);
    setShowModeMenu(false);
    const modeData = CONVERSATION_MODES.find((m) => m.id === newMode);
    if (modeData && newMode !== "free_talk") {
      setTimeout(() => handleSend(modeData.starter), 100);
    }
  }

  function handleSend(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || isLoading) return;
    setError(null);
    sendMessage(msg);
    setInput("");
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleMic() {
    if (isRecording) stopRecording();
    else startRecording();
  }

  const isEmpty = messages.length === 0;

  // Sort sessions newest-first for display
  const sortedSessions = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="flex h-full w-full overflow-hidden relative">
      {/* ── Mobile overlay backdrop ── */}
      {showHistory && (
        <div
          className="fixed inset-0 z-30 bg-stone-900/30 backdrop-blur-sm md:hidden"
          onClick={() => setShowHistory(false)}
        />
      )}

      {/* ── History Sidebar ── */}
      <aside
        className={`
          z-40 flex flex-col border-r border-[var(--line)] bg-[var(--surface-strong)] overflow-hidden transition-all duration-200
          md:relative md:shrink-0
          fixed inset-y-0 left-0 md:inset-auto
          ${showHistory ? "w-64 translate-x-0" : "w-64 -translate-x-full md:w-0 md:translate-x-0"}
        `}
      >
        <div className="w-64 flex flex-col h-full">
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 h-14 border-b border-[var(--line)] shrink-0">
            <span className="text-xs font-bold text-[var(--foreground)]/50 uppercase tracking-widest">
              History
            </span>
            <button
              onClick={newSession}
              title="New session"
              className="w-7 h-7 rounded-lg bg-stone-900 dark:bg-[var(--surface-strong)] hover:bg-stone-800 dark:hover:bg-[var(--line)] text-white dark:text-[var(--foreground)] flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
            {sortedSessions.map((s) => {
              const isActive = s.id === activeSession?.id;
              const msgCount = s.messages.filter((m) => m.role === "user").length;
              return (
                <div
                  key={s.id}
                  onMouseEnter={() => setHoveredSession(s.id)}
                  onMouseLeave={() => setHoveredSession(null)}
                  className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                    isActive
                      ? "bg-primary-50 dark:bg-primary-900/40 border border-primary-100 dark:border-primary-800"
                      : "hover:bg-[var(--surface)] border border-transparent hover:border-[var(--line)]"
                  }`}
                  onClick={() => switchSession(s.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${isActive ? "text-primary-700 dark:text-primary-400" : "text-[var(--foreground)]/80"}`}>
                      {s.title}
                    </p>
                    <p className="text-[10px] text-[var(--foreground)]/40 mt-0.5 font-medium">
                      {formatSessionDate(s.updatedAt)}
                      {msgCount > 0 && ` · ${msgCount} msg${msgCount !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                  {hoveredSession === s.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(s.id);
                      }}
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
      </aside>

      {/* ── Main Chat Area ── */}
      <div className="flex flex-col flex-1 p-3 md:p-8 min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col gap-1.5 mb-2 shrink-0">
          <div className="flex items-center justify-between px-3 py-2.5 border-[1.5px] border-[var(--line)] bg-[var(--surface-strong)] rounded-[18px] shadow-sm gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setShowHistory(!showHistory)}
                title="Toggle history"
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  showHistory
                    ? "bg-primary-50 dark:bg-primary-900/40 border border-primary-200 dark:border-primary-700 text-primary-600 dark:text-primary-400"
                    : "bg-[var(--surface)] border border-[var(--line)] text-[var(--foreground)]/40 hover:text-[var(--foreground)]/70"
                }`}
              >
                <PanelLeft className="w-4 h-4" />
              </button>
              <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
                AI
              </div>
              <div className="min-w-0">
                <p className="font-bold text-[var(--foreground)] text-sm leading-tight truncate">
                  {activeSession?.title ?? "Aria"}
                </p>
                <p className="text-xs text-emerald-500 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-ping" />
                  AI English Tutor
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={newSession}
                title="New session"
                className="flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground)]/40 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 border border-transparent hover:border-primary-100 dark:hover:border-primary-800 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /><span className="hidden sm:inline">New</span>
              </button>

              {/* Mode dropdown — next to voice button */}
              <div className="relative">
                <button
                  onClick={() => setShowModeMenu((v) => !v)}
                  title="Conversation mode"
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    mode !== "free_talk"
                      ? "bg-primary-50 dark:bg-primary-900/40 border-primary-200 dark:border-primary-700 text-primary-600 dark:text-primary-400"
                      : "bg-[var(--surface)] border-[var(--line)] text-[var(--foreground)]/50 hover:text-[var(--foreground)]/80 hover:border-[var(--line-soft)]"
                  }`}
                >
                  {(() => { const m = CONVERSATION_MODES.find((x) => x.id === mode)!; const Icon = m.icon; return <Icon className="w-3.5 h-3.5" />; })()}
                  <span className="hidden sm:inline">{CONVERSATION_MODES.find((x) => x.id === mode)?.label}</span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>

                {showModeMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowModeMenu(false)} />
                    <div className="absolute right-0 top-full mt-1.5 w-52 bg-[var(--surface-strong)] border border-[var(--line)] rounded-2xl shadow-xl z-20 py-1.5 overflow-hidden">
                      {CONVERSATION_MODES.map((m) => {
                        const Icon = m.icon;
                        const isActive = mode === m.id;
                        return (
                          <button
                            key={m.id}
                            onClick={() => handleModeChange(m.id)}
                            className={`flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                              isActive
                                ? "bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-bold"
                                : "text-[var(--foreground)]/70 hover:bg-[var(--surface)] font-medium"
                            }`}
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            <div className="text-left min-w-0">
                              <p className="leading-tight">{m.label}</p>
                              <p className="text-[10px] text-[var(--foreground)]/40 font-normal truncate">{m.desc}</p>
                            </div>
                            {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => { setTtsEnabled(!ttsEnabled); if (isSpeaking) stopSpeaking(); }}
                title={ttsEnabled ? "Disable voice" : "Enable voice"}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                  ttsEnabled
                    ? "bg-primary-50 dark:bg-primary-900/40 border border-primary-200 dark:border-primary-700 text-primary-600 dark:text-primary-400 shadow-sm"
                    : "bg-[var(--surface)] border border-[var(--line)] text-[var(--foreground)]/40 hover:text-[var(--foreground)]/70"
                }`}
              >
                {isSpeaking ? <Volume2 className="w-4 h-4" /> : ttsEnabled ? <Volume1 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              {!isEmpty && (
                <button
                  onClick={clearChat}
                  title="Clear this session"
                  className="flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground)]/40 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-100 dark:hover:border-red-900 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /><span className="hidden sm:inline">Clear</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Messages Window */}
        <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-5 rounded-[18px] bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] shadow-sm min-h-0">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center max-w-md mx-auto py-8">
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-[18px] bg-primary-50 dark:bg-primary-900/30 border border-primary-100 dark:border-primary-800 flex items-center justify-center mx-auto">
                  <MessageSquare className="w-7 h-7 text-primary-400" />
                </div>
                <h2 className="text-lg font-bold text-[var(--foreground)]">Chat with Aria</h2>
                <p className="text-sm text-[var(--foreground)]/60 leading-relaxed">
                  Practice English conversation. Aria will reply naturally and give grammar tips inline.
                </p>
              </div>
              <div className="w-full space-y-2">
                <p className="text-[10px] font-bold text-[var(--foreground)]/40 uppercase tracking-widest text-left">
                  Suggested topics
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {SUGGESTED_STARTERS.map((s) => (
                    <button
                      key={s.text}
                      onClick={() => handleSend(s.text)}
                      className="w-full text-left px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-sm text-[var(--foreground)]/80 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-[var(--surface-strong)] hover:text-primary-600 dark:hover:text-primary-400 hover:shadow-sm transition-all flex items-center gap-3 cursor-pointer"
                    >
                      <s.Icon className="w-4 h-4 shrink-0 text-[var(--foreground)]/40" />
                      <span className="font-medium truncate">{s.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <ChatBubble key={msg.id} message={msg} />
              ))}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mt-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 flex justify-between items-center shrink-0">
            <span className="font-semibold">{error}</span>
            <button onClick={() => setError(null)} className="ml-2 p-0.5 hover:text-red-800">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Contextual suggestions */}
        {suggestions.length > 0 && (
          <div className="flex gap-1.5 pt-2 flex-wrap shrink-0">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                className="px-3 py-1.5 bg-[var(--surface-strong)] border border-[var(--line)] text-[var(--foreground)]/70 text-xs font-semibold rounded-xl hover:border-primary-300 dark:hover:border-primary-700 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="pt-2 shrink-0">
          <div className="flex gap-2 items-end bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] p-2.5 rounded-[18px] shadow-sm">
            <button
              onClick={handleMic}
              title={isRecording ? "Stop recording" : "Record voice"}
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                isRecording
                  ? "bg-red-500 text-white animate-pulse shadow-sm shadow-red-500/30"
                  : "bg-[var(--surface)] hover:bg-[var(--surface-strong)] border border-[var(--line)] text-[var(--foreground)]/50"
              }`}
            >
              {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRecording ? "Listening…" : "Type in English… (Enter to send)"}
              rows={1}
              disabled={isLoading || isRecording}
              className="flex-1 resize-none rounded-xl border-0 bg-transparent px-2 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground)]/40 focus:outline-none focus:ring-0 disabled:opacity-50 max-h-32 leading-relaxed"
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
              }}
            />

            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 rounded-xl bg-stone-900 dark:bg-[var(--surface-strong)] hover:bg-stone-800 dark:hover:bg-[var(--line)] text-white dark:text-[var(--foreground)] flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0 cursor-pointer active:scale-95"
            >
              {isLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />}
            </button>
          </div>

          {isRecording && (
            <p className="text-[10px] font-bold text-red-500 text-center mt-1.5 animate-pulse uppercase tracking-wide">
              Listening… tap mic to stop
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
