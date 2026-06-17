"use client";

import { useState, useRef, useCallback } from "react";
import { getSupportedMimeType, blobType, blobFilename } from "@/lib/audio";

interface UseSpeechOptions {
  onTranscript: (text: string) => void;
  onError?: (err: string) => void;
}

const SENTENCE_RE = /^([\s\S]*?[.?!]+)\s+([\s\S]*)$/;
const MAX_CHUNK_CHARS = 900;

function splitText(text: string): string[] {
  // First split into sentences
  const sentences: string[] = [];
  let buf = text.trim();
  let m = buf.match(SENTENCE_RE);
  while (m) {
    sentences.push(m[1].trim());
    buf = m[2];
    m = buf.match(SENTENCE_RE);
  }
  if (buf.trim()) sentences.push(buf.trim());

  // Then split any sentence that's still too long
  const pieces: string[] = [];
  for (const s of sentences) {
    if (s.length <= MAX_CHUNK_CHARS) {
      pieces.push(s);
    } else {
      let remaining = s;
      while (remaining.length > MAX_CHUNK_CHARS) {
        const slice = remaining.slice(0, MAX_CHUNK_CHARS);
        const lastPunct = Math.max(slice.lastIndexOf("."), slice.lastIndexOf("?"), slice.lastIndexOf("!"));
        const cut = lastPunct > 0 ? lastPunct + 1 : (slice.lastIndexOf(" ") > 0 ? slice.lastIndexOf(" ") : MAX_CHUNK_CHARS);
        pieces.push(remaining.slice(0, cut).trim());
        remaining = remaining.slice(cut).trim();
      }
      if (remaining) pieces.push(remaining);
    }
  }

  return pieces.filter(Boolean);
}

export function useSpeech({ onTranscript, onError }: UseSpeechOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const mediaRef  = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef  = useRef<HTMLAudioElement | null>(null);
  const stoppedRef = useRef(false);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: blobType(mimeType) });
        await sendToWhisper(blob, blobFilename(mimeType));
      };

      recorder.start();
      mediaRef.current = recorder;
      setIsRecording(true);
    } catch {
      onError?.("Microphone access denied");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onError]);

  const stopRecording = useCallback(() => {
    mediaRef.current?.stop();
    mediaRef.current = null;
    setIsRecording(false);
  }, []);

  async function sendToWhisper(blob: Blob, filename = "recording.webm") {
    const token = localStorage.getItem("sb-access-token") ?? "";
    const formData = new FormData();
    formData.append("audio", blob, filename);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/speech/transcribe`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.transcript) onTranscript(data.transcript);
      else onError?.("Could not transcribe audio");
    } catch {
      onError?.("Transcription failed");
    }
  }

  async function fetchAudioUrl(text: string, accent: string): Promise<string | null> {
    const token = localStorage.getItem("sb-access-token") ?? "";
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/speech/synthesize`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text, accent }),
      });
      if (!res.ok) return null;
      return URL.createObjectURL(await res.blob());
    } catch {
      return null;
    }
  }

  const speak = useCallback(async (text: string, accent = "american") => {
    stoppedRef.current = false;

    const pieces = splitText(text);
    if (pieces.length === 0) return;

    setIsSpeaking(true);

    // Fetch all chunks in parallel, play in order
    const urlPromises = pieces.map((chunk) => fetchAudioUrl(chunk, accent));

    for (let i = 0; i < pieces.length; i++) {
      if (stoppedRef.current) break;
      const url = await urlPromises[i];
      if (!url || stoppedRef.current) continue;

      await new Promise<void>((resolve) => {
        const audio = new Audio(url);
        audioRef.current = audio;
        const done = () => { URL.revokeObjectURL(url); audioRef.current = null; resolve(); };
        audio.onended = done;
        audio.onerror = done;
        audio.play().catch(done);
      });
    }

    if (!stoppedRef.current) setIsSpeaking(false);
  }, []);

  const stopSpeaking = useCallback(() => {
    stoppedRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  return { isRecording, isSpeaking, startRecording, stopRecording, speak, stopSpeaking };
}
