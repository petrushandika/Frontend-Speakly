"use client";

import { useState, useRef, useCallback } from "react";

interface UseSpeechOptions {
  onTranscript: (text: string) => void;
  onError?: (err: string) => void;
}

export function useSpeech({ onTranscript, onError }: UseSpeechOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await sendToWhisper(blob);
      };

      recorder.start();
      mediaRef.current = recorder;
      setIsRecording(true);
    } catch {
      onError?.("Microphone access denied");
    }
  }, [onError]);

  const stopRecording = useCallback(() => {
    mediaRef.current?.stop();
    mediaRef.current = null;
    setIsRecording(false);
  }, []);

  async function sendToWhisper(blob: Blob) {
    const token = localStorage.getItem("sb-access-token") ?? "";
    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");

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

  const speak = useCallback(async (text: string, accent = "american") => {
    const token = localStorage.getItem("sb-access-token") ?? "";

    try {
      setIsSpeaking(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/speech/synthesize`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, accent }),
      });

      if (!res.ok) throw new Error("TTS failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch {
      setIsSpeaking(false);
      onError?.("Text-to-speech unavailable");
    }
  }, [onError]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  return { isRecording, isSpeaking, startRecording, stopRecording, speak, stopSpeaking };
}
