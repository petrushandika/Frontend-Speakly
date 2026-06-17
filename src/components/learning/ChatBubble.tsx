"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Lightbulb, X, Loader2 } from "lucide-react";
import type { Message } from "@/hooks/useAIChat";

interface ChatBubbleProps {
  message: Message;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";
  const [correctionDismissed, setCorrectionDismissed] = useState(false);

  // Split AI message: main text + optional correction chip
  const noteIndex = message.content.indexOf("— Small note:");
  const mainText = noteIndex !== -1 ? message.content.slice(0, noteIndex).trim() : message.content;
  const correctionRaw = noteIndex !== -1 ? message.content.slice(noteIndex) : null;
  const correctionText = correctionRaw
    ? correctionRaw.replace(/^[—–-]\s*Small note:\s*/i, "").trim()
    : null;

  return (
    <div className={cn("flex gap-3 my-3", isUser ? "justify-end" : "justify-start")}>
      {/* Aria avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1 shadow-md shadow-primary-500/10">
          AI
        </div>
      )}

      <div className={cn("flex flex-col gap-1.5 max-w-[78%]", isUser ? "items-end" : "items-start")}>
        {/* Main bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
            isUser
              ? "bg-gradient-to-br from-primary-600 to-indigo-600 text-white rounded-tr-sm"
              : "bg-white border border-slate-100 text-slate-800 rounded-tl-sm"
          )}
        >
          {isUser ? (
            <p className="font-medium">{message.content}</p>
          ) : (
            <div>
              <p className="font-medium">{mainText || message.content}</p>
              {message.isStreaming && (
                <span className="inline-flex items-center gap-1 mt-2">
                  <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </span>
              )}
            </div>
          )}
        </div>

        {/* Grammar correction chip — outside the bubble, dismissible */}
        {!isUser && correctionText && !message.isStreaming && !correctionDismissed && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs max-w-full animate-in slide-in-from-bottom-1 duration-200">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="font-bold text-amber-800 block mb-0.5">Grammar note</span>
              <span className="text-slate-600 leading-relaxed">{correctionText}</span>
            </div>
            <button
              onClick={() => setCorrectionDismissed(true)}
              className="shrink-0 p-0.5 rounded-md text-amber-400 hover:text-amber-600 hover:bg-amber-100 transition-colors mt-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Streaming indicator for correction (when still streaming) */}
        {!isUser && message.isStreaming && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Aria is typing…</span>
          </div>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold shrink-0 mt-1">
          You
        </div>
      )}
    </div>
  );
}
