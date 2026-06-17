"use client";

import { cn } from "@/lib/utils/cn";
import type { Message } from "@/hooks/useAIChat";

interface ChatBubbleProps {
  message: Message;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";

  // Split AI message at "— Small note:" to highlight corrections
  const parts = message.content.split(/(— Small note:[^.]+\.)/g);

  return (
    <div className={cn("flex gap-3.5 my-4", isUser ? "justify-end" : "justify-start")}>
      {/* Aria Avatar */}
      {!isUser && (
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0 mt-1 shadow-md shadow-primary-500/10 animate-pulse">
          🤖
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4.5 py-3.5 text-sm leading-relaxed shadow-sm transition-all duration-300",
          isUser
            ? "bg-gradient-to-br from-primary-600 to-indigo-600 text-white rounded-tr-sm"
            : "bg-white border border-slate-100 text-slate-800 rounded-tl-sm"
        )}
      >
        {isUser ? (
          <p className="font-medium">{message.content}</p>
        ) : (
          <div className="space-y-2">
            <div>
              {parts.map((part, i) =>
                part.startsWith("— Small note:") ? (
                  <div
                    key={i}
                    className="mt-3 p-3.5 bg-amber-500/5 border border-amber-500/15 text-amber-800 rounded-xl text-xs space-y-1 block shadow-inner"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <span>💡</span>
                      <span>Grammar Correction</span>
                    </div>
                    <p className="leading-relaxed font-medium text-slate-700 italic">
                      {part.replace("— Small note:", "").trim()}
                    </p>
                  </div>
                ) : (
                  <span key={i} className="font-medium text-slate-800">{part}</span>
                )
              )}
            </div>
            
            {message.isStreaming && (
              <span className="inline-flex items-center gap-1.5 py-1 px-2 bg-slate-50 border border-slate-100 rounded-lg">
                <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            )}
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-200 to-slate-300 border border-slate-300/20 flex items-center justify-center text-slate-700 text-sm font-bold shrink-0 mt-1 shadow-sm">
          👤
        </div>
      )}
    </div>
  );
}
