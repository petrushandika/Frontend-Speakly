"use client";

import { useState, useCallback, useRef } from "react";
import { trpcClient } from "@/lib/trpc";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  hasCorrection?: boolean;
}

interface UseAIChatOptions {
  onError?: (error: string) => void;
}

// Parse "— Small note: we say 'X' not 'Y' because Z"
function parseCorrections(text: string): Array<{
  errorCategory: string;
  originalText: string;
  correctedText: string;
  context: string;
}> {
  const corrections: Array<{
    errorCategory: string;
    originalText: string;
    correctedText: string;
    context: string;
  }> = [];

  const noteRegex = /[—–-]\s*Small note:\s*we say ['"](.+?)['"]\s+not\s+['"](.+?)['"]/gi;
  let match: RegExpExecArray | null;

  while ((match = noteRegex.exec(text)) !== null) {
    corrections.push({
      correctedText: match[1].trim(),
      originalText: match[2].trim(),
      errorCategory: inferCategory(match[2].trim()),
      context: text.slice(0, 200),
    });
  }

  return corrections;
}

function inferCategory(wrongText: string): string {
  const lower = wrongText.toLowerCase();
  if (/\b(is|are|was|were|am)\b/.test(lower)) return "tense";
  if (/\b(a|an|the)\b/.test(lower)) return "article";
  if (/\b(in|on|at|by|for|with|to|of)\b/.test(lower)) return "preposition";
  if (/\b(he|she|it|they|we|i|you)\b/.test(lower)) return "subject_verb";
  return "vocabulary";
}

export function useAIChat({ onError }: UseAIChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<(() => void) | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
      };

      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, aiMsg]);
      setIsLoading(true);

      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      let cancelled = false;
      abortRef.current = () => { cancelled = true; };

      try {
        const token = localStorage.getItem("sb-access-token") ?? "";

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/ai/stream`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ message: text.trim(), history }),
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "token") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiMsg.id
                      ? { ...m, content: m.content + data.content }
                      : m,
                  ),
                );
              }

              if (data.type === "done") {
                const fullResponse: string = data.fullResponse ?? "";
                const hasCorrection = fullResponse.includes("Small note:");

                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiMsg.id
                      ? { ...m, isStreaming: false, hasCorrection }
                      : m,
                  ),
                );

                // Save grammar corrections to DB (fire-and-forget)
                if (hasCorrection) {
                  const corrections = parseCorrections(fullResponse);
                  if (corrections.length > 0) {
                    trpcClient.grammar.saveBatch.mutate(corrections).catch(() => {});
                  }
                }
              }

              if (data.type === "error") {
                throw new Error(data.message);
              }
            } catch {
              // skip malformed SSE line
            }
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Connection error";
        onError?.(message);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsg.id
              ? {
                  ...m,
                  content: "Sorry, I couldn't connect. Please try again.",
                  isStreaming: false,
                }
              : m,
          ),
        );
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [messages, isLoading, onError],
  );

  const clearChat = useCallback(() => {
    abortRef.current?.();
    setMessages([]);
    setIsLoading(false);
  }, []);

  return { messages, isLoading, sendMessage, clearChat };
}
