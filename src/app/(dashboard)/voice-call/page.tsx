"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Phone, PhoneOff, Volume2, Loader2, RefreshCw } from "lucide-react";
import { useVoiceChat, type VoiceState, type VoiceMessage } from "@/hooks/useVoiceChat";
import { trpc } from "@/lib/trpc";

function StateIndicator({ state }: { state: VoiceState }) {
  const config = {
    idle:        { label: "Tap to speak",         color: "bg-slate-100 text-slate-500" },
    listening:   { label: "Listening…",           color: "bg-red-50 text-red-500" },
    thinking:    { label: "Aria is thinking…",    color: "bg-amber-50 text-amber-600" },
    speaking:    { label: "Aria is speaking…",    color: "bg-primary-50 text-primary-600" },
  }[state];

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium ${config.color}`}>
      {state === "listening" && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
      )}
      {state === "thinking" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {state === "speaking" && <Volume2 className="w-3.5 h-3.5" />}
      {config.label}
    </div>
  );
}

function MicButton({
  state,
  onPressStart,
  onPressEnd,
  onInterrupt,
}: {
  state: VoiceState;
  onPressStart: () => void;
  onPressEnd: () => void;
  onInterrupt: () => void;
}) {
  const isListening = state === "listening";
  const isBusy = state === "thinking" || state === "speaking";

  const handleClick = () => {
    if (isBusy) { onInterrupt(); return; }
    if (isListening) { onPressEnd(); return; }
    onPressStart();
  };

  return (
    <button
      onClick={handleClick}
      className={`
        relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200
        shadow-lg focus:outline-none focus:ring-4 focus:ring-offset-2
        ${isListening
          ? "bg-red-500 hover:bg-red-600 focus:ring-red-300 scale-110"
          : isBusy
            ? "bg-slate-200 hover:bg-slate-300 focus:ring-slate-200 cursor-pointer"
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

function MessageBubble({ msg, streamingText }: { msg: VoiceMessage; streamingText: string }) {
  const isUser = msg.role === "user";
  const text = msg.text.split("— Small note:")[0].trim();
  const note = msg.text.includes("— Small note:") ? msg.text.split("— Small note:")[1]?.trim() : null;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[78%] space-y-1`}>
        {!isUser && (
          <p className="text-[11px] font-semibold text-slate-400 px-1">Aria</p>
        )}
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? "bg-primary-600 text-white rounded-tr-sm"
              : "bg-white border border-slate-100 text-slate-800 rounded-tl-sm shadow-sm"
          }`}
        >
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

export default function VoiceCallPage() {
  const { data: profile } = trpc.users.getProfile.useQuery();
  const accent = (profile as any)?.accentPreference ?? "american";

  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    voiceState,
    messages,
    streamingText,
    startListening,
    stopListening,
    interrupt,
    clearConversation,
  } = useVoiceChat({
    accent,
    onError: setError,
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Voice Call with Aria</p>
            <p className="text-xs text-slate-400">Your AI English tutor</p>
          </div>
        </div>
        <button
          onClick={clearConversation}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Clear
        </button>
      </div>

      {/* Transcript area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {messages.length === 0 && !streamingText && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 pb-16">
            <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center">
              <Mic className="w-8 h-8 text-primary-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Start the conversation</p>
              <p className="text-xs text-slate-400 mt-1">Tap the mic button below and start speaking</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} streamingText={streamingText} />
        ))}

        {/* Live streaming text from AI */}
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
        <div className="mx-4 mb-2 px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-center justify-between shrink-0">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-600 font-bold">
            ×
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white border-t border-slate-100 px-6 py-6 flex flex-col items-center gap-4 shrink-0">
        <StateIndicator state={voiceState} />
        <MicButton
          state={voiceState}
          onPressStart={startListening}
          onPressEnd={stopListening}
          onInterrupt={interrupt}
        />
        <p className="text-[11px] text-slate-400">
          {voiceState === "idle" && "Tap to start · Tap again to stop recording"}
          {voiceState === "listening" && "Recording… tap to send"}
          {(voiceState === "thinking" || voiceState === "speaking") && "Tap to interrupt"}
        </p>
      </div>
    </div>
  );
}
