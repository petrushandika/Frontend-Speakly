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
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {/* Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1">
          A
        </div>
      )}

      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-primary-600 text-white rounded-br-sm"
            : "bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm",
        )}
      >
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <div>
            {parts.map((part, i) =>
              part.startsWith("— Small note:") ? (
                <span
                  key={i}
                  className="inline-block mt-2 px-2 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded text-xs leading-relaxed"
                >
                  {part}
                </span>
              ) : (
                <span key={i}>{part}</span>
              ),
            )}
            {message.isStreaming && (
              <span className="inline-flex gap-0.5 ml-1">
                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold shrink-0 mt-1">
          U
        </div>
      )}
    </div>
  );
}
