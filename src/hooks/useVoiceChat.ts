"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { getSupportedMimeType, blobType, blobFilename } from "@/lib/audio";
import { friendlyError } from "@/lib/errorMessage";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking";

export interface VoiceMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

export interface VoiceSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: VoiceMessage[];
}

interface UseVoiceChatOptions {
  accent?: string;
  onError?: (msg: string) => void;
  mode?: string;
}

const SESSIONS_KEY   = "speakly-voice-sessions";
const MAX_SESSIONS   = 20;

// VAD tuning — generous thresholds so users can speak naturally without cut-offs
const SILENCE_RMS_THRESHOLD = 18;     // higher = less sensitive to breath/ambient noise
const SILENCE_DURATION_MS   = 3_000;  // 3s of silence before auto-stopping (was 1.5s)
const MAX_RECORD_MS         = 120_000; // 2-minute hard cap per turn (was 15s)
const MIN_SENTENCE_WORDS    = 2;

function autoTitle(messages: VoiceMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "Voice conversation";
  return first.text.split(/\s+/).slice(0, 6).join(" ");
}

function loadSessions(): VoiceSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as VoiceSession[];
  } catch {
    return [];
  }
}

function saveSessions(sessions: VoiceSession[]) {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
  } catch {}
}

export function useVoiceChat({ accent = "american", onError, mode = "free_talk" }: UseVoiceChatOptions = {}) {
  const [voiceState, setVoiceState]       = useState<VoiceState>("idle");
  const [sessions, setSessions]           = useState<VoiceSession[]>(() => loadSessions());
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    () => loadSessions()[0]?.id ?? null,
  );
  const [streamingText, setStreamingText] = useState("");

  // Recording
  const mediaRef   = useRef<MediaRecorder | null>(null);
  const chunksRef  = useRef<Blob[]>([]);
  const abortRef   = useRef<AbortController | null>(null);
  const historyRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>(
    (() => {
      const stored = loadSessions();
      if (stored.length > 0) {
        return stored[0].messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.text.split("— Small note:")[0].trim(),
        }));
      }
      return [];
    })(),
  );

  // Always-current ref so closures inside recorder.onstop never use stale state
  const activeSessionIdRef = useRef<string | null>(null);

  // VAD
  const vadCtxRef      = useRef<AudioContext | null>(null);
  const vadAnalyserRef = useRef<AnalyserNode | null>(null);
  const vadAnimRef     = useRef<number | null>(null);
  const silenceRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hardCapRef     = useRef<ReturnType<typeof setTimeout> | null>(null);

  // TTS sentence queue
  const ttsSlots    = useRef<Array<{ ready: boolean; url: string }>>([]);
  const ttsPlayIdx  = useRef(0);
  const ttsTotalRef = useRef(0);
  const llmDoneRef  = useRef(false);
  const playingRef  = useRef(false);
  const audioRef    = useRef<HTMLAudioElement | null>(null);

  // Start a new session on first mount if none exist in localStorage
  useEffect(() => {
    if (sessions.length === 0) startNewSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount — stop recording, cancel fetches, release audio
  useEffect(() => {
    return () => {
      if (mediaRef.current?.state === "recording") mediaRef.current.stop();
      abortRef.current?.abort();
      if (vadAnimRef.current !== null) cancelAnimationFrame(vadAnimRef.current);
      if (silenceRef.current) clearTimeout(silenceRef.current);
      if (hardCapRef.current) clearTimeout(hardCapRef.current);
      vadCtxRef.current?.close().catch(() => {});
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  // Keep ref in sync with state so callbacks always see the latest value
  activeSessionIdRef.current = activeSessionId;

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;
  const messages = activeSession?.messages ?? [];

  // ── Session management ────────────────────────────────────────────────────

  function startNewSession() {
    const session: VoiceSession = {
      id: crypto.randomUUID(),
      title: "New voice session",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    setSessions((prev) => {
      const next = [session, ...prev].slice(0, MAX_SESSIONS);
      saveSessions(next);
      return next;
    });
    setActiveSessionId(session.id);
    historyRef.current = [];
    setStreamingText("");
  }

  const newSession = useCallback(() => {
    interrupt();
    startNewSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchSession = useCallback((id: string) => {
    interrupt();
    setActiveSessionId(id);
    setSessions((prev) => {
      const session = prev.find((s) => s.id === id);
      if (session) {
        historyRef.current = session.messages.map((m) => ({
          role: m.role,
          content: m.text.split("— Small note:")[0].trim(),
        }));
      }
      return prev;
    });
    setStreamingText("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveSessions(next);
      if (id === activeSessionId) {
        if (next.length > 0) {
          setActiveSessionId(next[0].id);
          historyRef.current = next[0].messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.text.split("— Small note:")[0].trim(),
          }));
        } else {
          startNewSession();
        }
      }
      return next;
    });
  }, [activeSessionId]);

  function appendMessages(newMsgs: VoiceMessage[]) {
    const currentId = activeSessionIdRef.current;
    setSessions((prev) => {
      const next = prev.map((s) => {
        if (s.id !== currentId) return s;
        const updated = [...s.messages, ...newMsgs];
        return {
          ...s,
          messages: updated,
          title: s.messages.length === 0 ? autoTitle(updated) : s.title,
          updatedAt: Date.now(),
        };
      });
      saveSessions(next);
      return next;
    });
  }

  // ── TTS helpers ─────────────────────────────────────────────────────────

  async function fetchTTSUrl(text: string): Promise<string | null> {
    const token = localStorage.getItem("sb-access-token") ?? "";
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/speech/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text, accent }),
      });
      if (!res.ok) return null;
      return URL.createObjectURL(await res.blob());
    } catch {
      return null;
    }
  }

  function tryAdvancePlay() {
    if (playingRef.current) return;
    const slot = ttsSlots.current[ttsPlayIdx.current];
    if (!slot?.ready) return;

    const url = slot.url;
    ttsPlayIdx.current++;

    if (!url) { tryAdvancePlay(); return; }

    setVoiceState("speaking");
    playingRef.current = true;

    const audio = new Audio(url);
    audioRef.current = audio;

    const onDone = () => {
      URL.revokeObjectURL(url);
      playingRef.current = false;
      audioRef.current   = null;
      tryAdvancePlay();
      checkAllDone();
    };
    audio.onended = onDone;
    audio.onerror = onDone;
    audio.play().catch(onDone);
  }

  function checkAllDone() {
    if (llmDoneRef.current && ttsPlayIdx.current >= ttsTotalRef.current && !playingRef.current) {
      setVoiceState("idle");
      setStreamingText("");
    }
  }

  function scheduleTTS(text: string) {
    const idx = ttsTotalRef.current++;
    ttsSlots.current[idx] = { ready: false, url: "" };
    fetchTTSUrl(text).then((url) => {
      ttsSlots.current[idx] = { ready: true, url: url ?? "" };
      tryAdvancePlay();
    });
  }

  // ── STT ─────────────────────────────────────────────────────────────────

  async function transcribe(blob: Blob, filename = "voice.webm"): Promise<string> {
    const token = localStorage.getItem("sb-access-token") ?? "";
    const form  = new FormData();
    form.append("audio", blob, filename);
    const res  = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/speech/transcribe`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json();
    if (!data.transcript) throw new Error("No transcript");
    return data.transcript as string;
  }

  // ── LLM stream + sentence TTS ─────────────────────────────────────────────

  const SENTENCE_RE = /^([\s\S]*?[.?!]+)\s+([\s\S]*)$/;

  async function streamAndScheduleTTS(userText: string): Promise<string> {
    const token = localStorage.getItem("sb-access-token") ?? "";
    abortRef.current = new AbortController();

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        message: userText,
        history: historyRef.current.slice(-10),
        voiceMode: true,
        mode,
      }),
      signal: abortRef.current.signal,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const reader     = res.body!.getReader();
    const decoder    = new TextDecoder();
    let sseBuffer    = "";
    let full         = "";
    let sentenceBuf  = "";

    function flushSentences() {
      let m = sentenceBuf.match(SENTENCE_RE);
      while (m) {
        const sentence = m[1].trim();
        sentenceBuf = m[2];
        const spoken = sentence.split("— Small note:")[0].trim();
        if (spoken && spoken.split(/\s+/).length >= MIN_SENTENCE_WORDS) scheduleTTS(spoken);
        m = sentenceBuf.match(SENTENCE_RE);
      }
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      sseBuffer += decoder.decode(value, { stream: true });
      const lines = sseBuffer.split("\n");
      sseBuffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === "token") {
            full       += data.content;
            sentenceBuf += data.content;
            setStreamingText(full.split("— Small note:")[0]);
            flushSentences();
          }
          if (data.type === "done") full = data.fullResponse ?? full;
        } catch {}
      }
    }

    const tail = sentenceBuf.split("— Small note:")[0].trim();
    if (tail) scheduleTTS(tail);
    return full;
  }

  // ── Full pipeline ─────────────────────────────────────────────────────────

  async function runPipeline(blob: Blob, filename?: string) {
    ttsSlots.current    = [];
    ttsPlayIdx.current  = 0;
    ttsTotalRef.current = 0;
    llmDoneRef.current  = false;

    try {
      setVoiceState("thinking");
      const userText = await transcribe(blob, filename);

      const userMsg: VoiceMessage = {
        id: crypto.randomUUID(), role: "user", text: userText, timestamp: Date.now(),
      };

      setStreamingText("");

      const aiText = await streamAndScheduleTTS(userText);

      historyRef.current = [
        ...historyRef.current,
        { role: "user" as const, content: userText },
        { role: "assistant" as const, content: aiText },
      ].slice(-20);

      const aiMsg: VoiceMessage = {
        id: crypto.randomUUID(), role: "assistant", text: aiText, timestamp: Date.now(),
      };

      appendMessages([userMsg, aiMsg]);
      setStreamingText("");

      llmDoneRef.current = true;
      checkAllDone();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setVoiceState("idle"); setStreamingText(""); return;
      }
      onError?.(friendlyError(err));
      setVoiceState("idle"); setStreamingText("");
    }
  }

  // ── VAD ──────────────────────────────────────────────────────────────────

  function startVAD(stream: MediaStream, onSilence: () => void) {
    try {
      const ctx      = new AudioContext();
      const source   = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      vadCtxRef.current      = ctx;
      vadAnalyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);

      function tick() {
        if (!vadAnalyserRef.current) return;
        analyser.getByteFrequencyData(data);
        const rms = Math.sqrt(data.reduce((s, v) => s + v * v, 0) / data.length);

        if (rms < SILENCE_RMS_THRESHOLD) {
          if (!silenceRef.current) {
            silenceRef.current = setTimeout(() => onSilence(), SILENCE_DURATION_MS);
          }
        } else {
          if (silenceRef.current) { clearTimeout(silenceRef.current); silenceRef.current = null; }
        }
        vadAnimRef.current = requestAnimationFrame(tick);
      }
      vadAnimRef.current = requestAnimationFrame(tick);
    } catch {}
  }

  function stopVAD() {
    if (vadAnimRef.current !== null) { cancelAnimationFrame(vadAnimRef.current); vadAnimRef.current = null; }
    if (silenceRef.current) { clearTimeout(silenceRef.current); silenceRef.current = null; }
    vadCtxRef.current?.close().catch(() => {});
    vadCtxRef.current = null; vadAnalyserRef.current = null;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  const stopListening = useCallback(() => {
    stopVAD();
    if (hardCapRef.current) { clearTimeout(hardCapRef.current); hardCapRef.current = null; }
    if (mediaRef.current?.state === "recording") { mediaRef.current.stop(); mediaRef.current = null; }
  }, []);

  const startListening = useCallback(async () => {
    if (voiceState !== "idle") return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; playingRef.current = false; }

    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        stopVAD();
        if (hardCapRef.current) { clearTimeout(hardCapRef.current); hardCapRef.current = null; }
        const blob = new Blob(chunksRef.current, { type: blobType(mimeType) });
        if (blob.size > 1_000) runPipeline(blob, blobFilename(mimeType));
        else setVoiceState("idle");
      };

      recorder.start(100);
      mediaRef.current = recorder;
      setVoiceState("listening");
      startVAD(stream, stopListening);
      hardCapRef.current = setTimeout(stopListening, MAX_RECORD_MS);
    } catch {
      onError?.("Microphone access denied");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceState, stopListening]);

  const interrupt = useCallback(() => {
    abortRef.current?.abort();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    playingRef.current = false; llmDoneRef.current = true;
    setVoiceState("idle"); setStreamingText("");
  }, []);

  return {
    voiceState,
    messages,
    sessions,
    activeSession,
    streamingText,
    startListening,
    stopListening,
    interrupt,
    newSession,
    switchSession,
    deleteSession,
  };
}
