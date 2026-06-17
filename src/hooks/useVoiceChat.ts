"use client";

import { useState, useRef, useCallback } from "react";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking";

export interface VoiceMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

interface UseVoiceChatOptions {
  accent?: string;
  onError?: (msg: string) => void;
}

const MAX_RECORD_MS = 10_000; // auto-stop after 10s

export function useVoiceChat({ accent = "american", onError }: UseVoiceChatOptions = {}) {
  const [voiceState, setVoiceState]   = useState<VoiceState>("idle");
  const [messages, setMessages]       = useState<VoiceMessage[]>([]);
  const [streamingText, setStreamingText] = useState("");

  const mediaRef   = useRef<MediaRecorder | null>(null);
  const chunksRef  = useRef<Blob[]>([]);
  const audioRef   = useRef<HTMLAudioElement | null>(null);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const abortRef   = useRef<AbortController | null>(null);

  // ── 1. Transcribe audio with Whisper ─────────────────────────────────────
  async function transcribe(blob: Blob): Promise<string> {
    const token = localStorage.getItem("sb-access-token") ?? "";
    const form = new FormData();
    form.append("audio", blob, "voice.webm");

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/speech/transcribe`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json();
    if (!data.transcript) throw new Error("No transcript");
    return data.transcript as string;
  }

  // ── 2. Stream AI response ─────────────────────────────────────────────────
  async function streamAI(userText: string): Promise<string> {
    const token = localStorage.getItem("sb-access-token") ?? "";
    abortRef.current = new AbortController();

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message: userText,
        history: historyRef.current.slice(-10),
        voiceMode: true,
      }),
      signal: abortRef.current.signal,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";

    while (true) {
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
            full += data.content;
            // Show only the main text (strip correction note) while streaming
            const mainText = full.split("— Small note:")[0];
            setStreamingText(mainText);
          }
          if (data.type === "done") {
            full = data.fullResponse ?? full;
          }
        } catch {}
      }
    }

    return full;
  }

  // ── 3. Synthesize and play TTS ────────────────────────────────────────────
  async function playTTS(text: string): Promise<void> {
    const token = localStorage.getItem("sb-access-token") ?? "";

    // Strip grammar correction note — don't read it aloud
    const speechText = text.split("— Small note:")[0].trim();
    if (!speechText) return;

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/speech/synthesize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text: speechText, accent }),
    });

    if (!res.ok) throw new Error("TTS failed");

    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);

    return new Promise((resolve) => {
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        resolve();
      };

      audio.play().catch(() => resolve());
    });
  }

  // ── Full pipeline: transcript → AI → TTS ─────────────────────────────────
  async function runPipeline(blob: Blob) {
    try {
      // Step 1: Transcribe
      setVoiceState("thinking");
      const userText = await transcribe(blob);

      // Add user message to UI + history
      const userMsg: VoiceMessage = {
        id: crypto.randomUUID(),
        role: "user",
        text: userText,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setStreamingText("");

      // Step 2: Stream AI response
      const aiText = await streamAI(userText);

      // Update history for context
      historyRef.current = [
        ...historyRef.current,
        { role: "user" as const, content: userText },
        { role: "assistant" as const, content: aiText },
      ].slice(-20);

      // Add AI message to UI
      const mainText = aiText.split("— Small note:")[0].trim();
      const noteText = aiText.includes("— Small note:")
        ? aiText.split("— Small note:")[1].trim()
        : null;

      const aiMsg: VoiceMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: aiText,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setStreamingText("");

      // Step 3: Speak
      setVoiceState("speaking");
      await playTTS(mainText);

      setVoiceState("idle");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      onError?.(err instanceof Error ? err.message : "Voice error");
      setVoiceState("idle");
      setStreamingText("");
    }
  }

  // ── Start listening ───────────────────────────────────────────────────────
  const startListening = useCallback(async () => {
    if (voiceState !== "idle") return;

    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearTimeout(timerRef.current);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size > 1000) {
          runPipeline(blob);
        } else {
          setVoiceState("idle");
        }
      };

      recorder.start();
      mediaRef.current = recorder;
      setVoiceState("listening");

      // Auto-stop after MAX_RECORD_MS
      timerRef.current = setTimeout(() => stopListening(), MAX_RECORD_MS);
    } catch {
      onError?.("Microphone access denied");
    }
  }, [voiceState]);

  // ── Stop listening ────────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (mediaRef.current?.state === "recording") {
      mediaRef.current.stop();
      mediaRef.current = null;
    }
  }, []);

  // ── Interrupt AI speaking ─────────────────────────────────────────────────
  const interrupt = useCallback(() => {
    abortRef.current?.abort();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setVoiceState("idle");
    setStreamingText("");
  }, []);

  // ── Clear conversation ────────────────────────────────────────────────────
  const clearConversation = useCallback(() => {
    interrupt();
    setMessages([]);
    historyRef.current = [];
  }, [interrupt]);

  return {
    voiceState,
    messages,
    streamingText,
    startListening,
    stopListening,
    interrupt,
    clearConversation,
  };
}
