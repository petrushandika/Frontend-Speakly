"use client";

import { useEffect, useRef, useState } from "react";
import { useAIChat } from "@/hooks/useAIChat";
import { useSpeech } from "@/hooks/useSpeech";
import { ChatBubble } from "@/components/learning/ChatBubble";
import { trpc } from "@/lib/trpc";

const SUGGESTED_STARTERS = [
  { text: "Tell me about yourself and what you do for work.", icon: "💼" },
  { text: "What did you do last weekend?", icon: "🍿" },
  { text: "Can you help me practice present perfect tense?", icon: "✍️" },
  { text: "Let's do a job interview roleplay.", icon: "👔" },
  { text: "Explain the difference between 'since' and 'for'.", icon: "💡" },
];

export default function ChatPage() {
  const { data: profile } = trpc.users.getProfile.useQuery();
  const accent = profile?.accentPreference ?? "american";

  const { messages, isLoading, sendMessage, clearChat } = useAIChat({
    onError: (e) => setError(e),
  });

  const { isRecording, isSpeaking, startRecording, stopRecording, speak, stopSpeaking } =
    useSpeech({
      onTranscript: (text) => setInput(text),
      onError: (e) => setError(e),
    });

  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
      // Strip "— Small note:" section before speaking
      const textToSpeak = lastMsg.content.split("— Small note:")[0].trim();
      speak(textToSpeak, accent);
    }
  }, [lastMsg, ttsEnabled, accent, speak]);

  function handleSend() {
    if (!input.trim() || isLoading) return;
    setError(null);
    sendMessage(input.trim());
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

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] w-full px-6 md:px-8">
      {/* Premium Header */}
      <div className="flex items-center justify-between px-5 py-4 border border-slate-100 bg-white/80 backdrop-blur-md rounded-2xl shadow-sm mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm shadow-primary-500/10">
            🤖
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm">Aria</p>
            <p className="text-xs text-emerald-500 font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-ping" />
              AI English Tutor
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* TTS toggle */}
          <button
            onClick={() => { setTtsEnabled(!ttsEnabled); if (isSpeaking) stopSpeaking(); }}
            title={ttsEnabled ? "Disable voice" : "Enable voice"}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              ttsEnabled 
                ? "bg-primary-50 border border-primary-200 text-primary-600 shadow-sm" 
                : "bg-slate-50 border border-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            }`}
          >
            {isSpeaking ? "🔊" : ttsEnabled ? "🔈" : "🔇"}
          </button>
          {!isEmpty && (
            <button
              onClick={clearChat}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 px-3 py-1.5 rounded-xl cursor-pointer"
            >
              Clear Chat
            </button>
          )}
        </div>
      </div>

      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 rounded-2xl bg-white border border-slate-100 shadow-sm min-h-0">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-8 text-center max-w-lg mx-auto py-8">
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-50 to-indigo-50 border border-primary-100 flex items-center justify-center mx-auto shadow-inner">
                <span className="text-3xl animate-float">💬</span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900">Have a Conversation with Aria</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Talk about anything. Aria will reply naturally, guide your conversation, and provide friendly corrections on any grammar errors.
              </p>
            </div>
            
            <div className="w-full space-y-2.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left pl-1">
                Suggested Topics
              </p>
              <div className="grid grid-cols-1 gap-2">
                {SUGGESTED_STARTERS.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => { setInput(s.text); inputRef.current?.focus(); }}
                    className="w-full text-left px-4.5 py-3 rounded-xl bg-slate-50/50 border border-slate-100 text-sm text-slate-700 hover:border-primary-300 hover:bg-white hover:text-primary-600 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-3 cursor-pointer"
                  >
                    <span className="text-base shrink-0">{s.icon}</span>
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
        <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex justify-between items-center shadow-sm animate-pulse">
          <span className="font-semibold">{error}</span>
          <button onClick={() => setError(null)} className="ml-2 font-bold hover:text-red-800 text-sm leading-none">×</button>
        </div>
      )}

      {/* Input area */}
      <div className="py-4 bg-transparent">
        <div className="relative flex gap-3 items-end bg-white border border-slate-150 p-3 rounded-2xl shadow-md shadow-slate-100/40">
          {/* Mic button */}
          <button
            onClick={handleMic}
            title={isRecording ? "Stop recording" : "Record voice"}
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm ${
              isRecording
                ? "bg-red-500 text-white animate-pulse shadow-red-500/20 scale-105"
                : "bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-500"
            }`}
          >
            🎙️
          </button>

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? "Listening..." : "Type in English... (Enter to send)"}
            rows={1}
            disabled={isLoading || isRecording}
            className="flex-1 resize-none rounded-xl border-0 bg-transparent px-2 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 disabled:opacity-50 max-h-32 leading-relaxed"
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
            }}
          />

          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="w-11 h-11 rounded-xl bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center transition-all disabled:opacity-35 disabled:cursor-not-allowed shrink-0 cursor-pointer shadow-md shadow-primary-500/10 active:scale-[0.98]"
          >
            {isLoading ? (
              <svg className="w-5 h-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        
        {isRecording && (
          <p className="text-[10px] font-bold text-red-500 text-center mt-2 animate-pulse tracking-wide uppercase">
            Aria is listening... Tap the mic button to finish speaking
          </p>
        )}
      </div>
    </div>
  );
}
