"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { trpcClient } from "@/lib/trpc";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  hasCorrection?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

export type ConversationMode =
  | "free_talk"
  | "roleplay"
  | "grammar_drill"
  | "debate"
  | "storytelling"
  | "interview_prep";

interface UseAIChatOptions {
  onError?: (error: string) => void;
}

const SESSIONS_KEY = "speakly-chat-sessions";
const LEGACY_KEY   = "speakly-chat-history";
const MAX_SESSIONS = 25;
const MAX_MESSAGES = 60;

function createSession(): ChatSession {
  return {
    id: crypto.randomUUID(),
    title: "New Session",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
  };
}

function autoTitle(messages: Message[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New Session";
  const words = first.content.trim().split(/\s+/).slice(0, 6).join(" ");
  return first.content.trim().split(/\s+/).length > 6 ? `${words}…` : words;
}

function loadSessions(): { sessions: ChatSession[]; activeId: string } {
  if (typeof window === "undefined") {
    const s = createSession();
    return { sessions: [s], activeId: s.id };
  }

  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ChatSession[];
      const sessions = parsed.map((s) => ({
        ...s,
        messages: s.messages.map((m) => ({ ...m, isStreaming: false })),
      }));
      if (sessions.length > 0) {
        return { sessions, activeId: sessions[sessions.length - 1].id };
      }
    }
  } catch {
    // fall through to legacy migration
  }

  // Migrate legacy flat history
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const msgs = (JSON.parse(legacy) as Message[]).map((m) => ({ ...m, isStreaming: false }));
      localStorage.removeItem(LEGACY_KEY);
      if (msgs.length > 0) {
        const session: ChatSession = {
          id: crypto.randomUUID(),
          title: autoTitle(msgs),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: msgs,
        };
        const fresh = createSession();
        return { sessions: [session, fresh], activeId: fresh.id };
      }
    }
  } catch {
    // ignore
  }

  const s = createSession();
  return { sessions: [s], activeId: s.id };
}

function saveSessions(sessions: ChatSession[]) {
  if (typeof window === "undefined") return;
  try {
    const toSave = sessions.slice(-MAX_SESSIONS).map((s) => ({
      ...s,
      messages: s.messages.filter((m) => !m.isStreaming).slice(-MAX_MESSAGES),
    }));
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(toSave));
  } catch {
    // ignore quota errors
  }
}

// Parse "— Small note: we say 'X' not 'Y' ..."
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
  const initial = loadSessions();
  const [sessions, setSessions]     = useState<ChatSession[]>(initial.sessions);
  const [activeId, setActiveId]     = useState<string>(initial.activeId);
  const [isLoading, setIsLoading]   = useState(false);
  const [mode, setMode]             = useState<ConversationMode>("free_talk");
  const abortRef = useRef<(() => void) | null>(null);

  const activeSession = sessions.find((s) => s.id === activeId) ?? sessions[sessions.length - 1];
  const messages = activeSession?.messages ?? [];

  // Persist whenever sessions change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => saveSessions(sessions), 300);
    return () => clearTimeout(timer);
  }, [sessions]);

  // Helper to update messages in the active session
  const updateMessages = useCallback(
    (updater: (prev: Message[]) => Message[]) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeId
            ? { ...s, messages: updater(s.messages), updatedAt: Date.now() }
            : s,
        ),
      );
    },
    [activeId],
  );

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

      // Auto-title on first user message
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== activeId) return s;
          const isFirst = s.messages.length === 0 || s.title === "New Session";
          return {
            ...s,
            title: isFirst ? autoTitle([userMsg]) : s.title,
            messages: [...s.messages, userMsg, aiMsg],
            updatedAt: Date.now(),
          };
        }),
      );

      setIsLoading(true);

      // Cap to last 20 messages to keep token cost reasonable
      const history = messages.slice(-20).map((m) => ({ role: m.role, content: m.content }));

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
            body: JSON.stringify({ message: text.trim(), history, mode }),
          },
        );

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

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
                setSessions((prev) =>
                  prev.map((s) =>
                    s.id !== activeId
                      ? s
                      : {
                          ...s,
                          messages: s.messages.map((m) =>
                            m.id === aiMsg.id
                              ? { ...m, content: m.content + data.content }
                              : m,
                          ),
                        },
                  ),
                );
              }

              if (data.type === "done") {
                const fullResponse: string = data.fullResponse ?? "";
                const hasCorrection = fullResponse.includes("Small note:");

                setSessions((prev) =>
                  prev.map((s) =>
                    s.id !== activeId
                      ? s
                      : {
                          ...s,
                          messages: s.messages.map((m) =>
                            m.id === aiMsg.id
                              ? { ...m, isStreaming: false, hasCorrection }
                              : m,
                          ),
                        },
                  ),
                );

                if (hasCorrection) {
                  const corrections = parseCorrections(fullResponse);
                  if (corrections.length > 0) {
                    trpcClient.grammar.saveBatch.mutate(corrections).catch(() => {});
                  }
                }
              }

              if (data.type === "error") throw new Error(data.message);
            } catch {
              // skip malformed SSE line
            }
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Connection error";
        onError?.(message);
        setSessions((prev) =>
          prev.map((s) =>
            s.id !== activeId
              ? s
              : {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === aiMsg.id
                      ? { ...m, content: "Sorry, I couldn't connect. Please try again.", isStreaming: false }
                      : m,
                  ),
                },
          ),
        );
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [messages, isLoading, activeId, onError],
  );

  // Auto-summarize a session if it has enough messages
  const summarizeSession = useCallback(async (sessionMessages: Message[]) => {
    const userMsgs = sessionMessages.filter((m) => m.role === "user");
    if (userMsgs.length < 4) return; // not enough to summarize
    try {
      const token = localStorage.getItem("sb-access-token") ?? "";
      const payload = sessionMessages.slice(-40).map((m) => ({ role: m.role, content: m.content }));
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: payload }),
      });
    } catch {
      // ignore — memory is best-effort
    }
  }, []);

  const newSession = useCallback(() => {
    abortRef.current?.();
    setIsLoading(false);
    const s = createSession();
    setSessions((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.messages.length === 0) {
        setActiveId(last.id);
        return prev;
      }
      // Summarize current session before leaving
      if (last && last.messages.length >= 8) {
        summarizeSession(last.messages);
      }
      setActiveId(s.id);
      return [...prev, s];
    });
    setMode("free_talk");
  }, [summarizeSession]);

  const switchSession = useCallback((id: string) => {
    abortRef.current?.();
    setIsLoading(false);
    // Summarize outgoing session
    setSessions((prev) => {
      const current = prev.find((s) => s.id === activeId);
      if (current && current.messages.length >= 8) {
        summarizeSession(current.messages);
      }
      return prev;
    });
    setActiveId(id);
    setMode("free_talk");
  }, [activeId, summarizeSession]);

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        if (next.length === 0) {
          const s = createSession();
          setActiveId(s.id);
          return [s];
        }
        if (id === activeId) {
          setActiveId(next[next.length - 1].id);
        }
        return next;
      });
    },
    [activeId],
  );

  const clearCurrentSession = useCallback(() => {
    abortRef.current?.();
    setIsLoading(false);
    updateMessages(() => []);
  }, [updateMessages]);

  return {
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
    clearChat: clearCurrentSession,
  };
}
