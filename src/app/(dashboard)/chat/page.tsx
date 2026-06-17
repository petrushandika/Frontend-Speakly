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
} from "lucide-react";

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

  const {
    messages,
    sessions,
    activeSession,
    isLoading,
    sendMessage,
    newSession,
    switchSession,
    deleteSession,
    clearChat,
  } = useAIChat({ onError: (e) => setError(e) });

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
    <div className="flex h-full w-full overflow-hidden">
      {/* ── History Sidebar ── */}
      <aside
        className={`shrink-0 flex flex-col border-r border-slate-100 bg-slate-50/60 overflow-hidden transition-all duration-200 ${
          showHistory ? "w-64" : "w-0"
        }`}
      >
        <div className="w-64 flex flex-col h-full">
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 h-14 border-b border-slate-100 shrink-0">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              History
            </span>
            <button
              onClick={newSession}
              title="New session"
              className="w-7 h-7 rounded-lg bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm"
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
                      ? "bg-primary-50 border border-primary-100"
                      : "hover:bg-white hover:border hover:border-slate-100 border border-transparent"
                  }`}
                  onClick={() => switchSession(s.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${isActive ? "text-primary-700" : "text-slate-700"}`}>
                      {s.title}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
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
      </aside>

      {/* ── Main Chat Area ── */}
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
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
              AI
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 text-sm leading-tight truncate">
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
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-primary-600 hover:bg-primary-50 border border-transparent hover:border-primary-100 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> New
            </button>
            <button
              onClick={() => { setTtsEnabled(!ttsEnabled); if (isSpeaking) stopSpeaking(); }}
              title={ttsEnabled ? "Disable voice" : "Enable voice"}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                ttsEnabled
                  ? "bg-primary-50 border border-primary-200 text-primary-600 shadow-sm"
                  : "bg-slate-50 border border-slate-100 text-slate-400 hover:text-slate-600"
              }`}
            >
              {isSpeaking ? <Volume2 className="w-4 h-4" /> : ttsEnabled ? <Volume1 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            {!isEmpty && (
              <button
                onClick={clearChat}
                title="Clear this session"
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Messages Window */}
        <div className="flex-1 overflow-y-auto px-4 py-5 rounded-2xl bg-white border border-slate-100 shadow-sm min-h-0">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center max-w-md mx-auto py-8">
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary-50 to-indigo-50 border border-primary-100 flex items-center justify-center mx-auto">
                  <MessageSquare className="w-7 h-7 text-primary-400" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Chat with Aria</h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Practice English conversation. Aria will reply naturally and give grammar tips inline.
                </p>
              </div>
              <div className="w-full space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">
                  Suggested topics
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {SUGGESTED_STARTERS.map((s) => (
                    <button
                      key={s.text}
                      onClick={() => handleSend(s.text)}
                      className="w-full text-left px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-700 hover:border-primary-300 hover:bg-white hover:text-primary-600 hover:shadow-sm transition-all flex items-center gap-3 cursor-pointer"
                    >
                      <s.Icon className="w-4 h-4 shrink-0 text-slate-400" />
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
          <div className="mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex justify-between items-center shrink-0">
            <span className="font-semibold">{error}</span>
            <button onClick={() => setError(null)} className="ml-2 p-0.5 hover:text-red-800">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Contextual suggestions */}
        {suggestions.length > 0 && (
          <div className="flex gap-2 pt-3 flex-wrap shrink-0">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-all cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="pt-3 shrink-0">
          <div className="flex gap-2 items-end bg-white border border-slate-200 p-2.5 rounded-2xl shadow-sm">
            <button
              onClick={handleMic}
              title={isRecording ? "Stop recording" : "Record voice"}
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                isRecording
                  ? "bg-red-500 text-white animate-pulse shadow-sm shadow-red-500/30"
                  : "bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-500"
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
              className="flex-1 resize-none rounded-xl border-0 bg-transparent px-2 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 disabled:opacity-50 max-h-32 leading-relaxed"
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
              }}
            />

            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 rounded-xl bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0 cursor-pointer active:scale-95"
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
