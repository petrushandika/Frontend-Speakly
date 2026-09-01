"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/Skeleton";
import { getSupportedMimeType, blobType, blobFilename } from "@/lib/audio";
import {
  Mic2, User, Send, MessageSquare, X, LogIn, LogOut, Mic, MicOff, Loader2, Plus,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  userId: string;
  displayName: string;
  text: string;
  ts: number;
}

// ── Room Chat Panel ───────────────────────────────────────────────────────────

function RoomChat({
  roomId,
  currentUserId,
  onClose,
  roomName,
}: {
  roomId:        string;
  currentUserId: string;
  onClose:       () => void;
  roomName:      string;
}) {
  const utils = trpc.useUtils();
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cleanup on unmount — stop any active recording
  useEffect(() => {
    return () => {
      if (mediaRef.current?.state === "recording") mediaRef.current.stop();
    };
  }, []);

  // Load initial messages
  const { data: initialMessages = [] } = trpc.rooms.getMessages.useQuery({ roomId });
  useEffect(() => {
    if (initialMessages.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages(initialMessages as ChatMessage[]);
    }
  }, [initialMessages]);

  // SSE real-time updates
  useEffect(() => {
    const token = localStorage.getItem("sb-access-token") ?? "";
    const url = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8099"}/rooms/${roomId}/events`;
    const es = new EventSource(`${url}?token=${encodeURIComponent(token)}`);

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as ChatMessage;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      } catch {}
    };

    es.onerror = () => {
      // SSE auto-reconnects; silently ignore transient errors
    };

    return () => es.close();
  }, [roomId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = trpc.rooms.sendMessage.useMutation({
    onSuccess: () => {
      utils.rooms.getMessages.invalidate({ roomId });
      setText("");
      inputRef.current?.focus();
    },
    onError: () => toast.error("Failed to send message"),
  });

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    send.mutate({ roomId, text: trimmed });
  }

  async function startVoice() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        setIsTranscribing(true);
        try {
          const blob = new Blob(chunksRef.current, { type: blobType(mimeType) });
          const token = localStorage.getItem("sb-access-token") ?? "";
          const formData = new FormData();
          formData.append("audio", blob, blobFilename(mimeType));
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8099"}/speech/transcribe`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
          const data = await res.json();
          if (data.transcript) {
            send.mutate({ roomId, text: data.transcript });
          } else {
            toast.error("Could not transcribe — please try again");
          }
        } catch {
          toast.error("Voice transcription failed");
        } finally {
          setIsTranscribing(false);
        }
      };
      recorder.start();
      mediaRef.current = recorder;
      setIsRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  }

  function stopVoice() {
    if (mediaRef.current?.state === "recording") {
      mediaRef.current.stop();
      mediaRef.current = null;
    }
  }

  function formatTime(ts: number) {
    return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="flex flex-col h-full bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] rounded-[18px] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="w-4 h-4 text-primary-600 shrink-0" />
          <p className="text-sm font-bold text-[var(--foreground)] truncate">{roomName}</p>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded-full shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            Live
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--foreground)]/40 hover:text-[var(--foreground)]/70 hover:bg-[var(--surface)] transition-all shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--foreground)]/35">
            <MessageSquare className="w-8 h-8" />
            <p className="text-xs text-[var(--foreground)]/40">No messages yet — say hi!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.userId === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[80%] space-y-0.5">
                {!isMe && (
                  <p className="text-[10px] font-semibold text-[var(--foreground)]/40 px-1">{msg.displayName}</p>
                )}
                <div className={`px-3 py-2 rounded-xl text-sm leading-relaxed ${
                  isMe
                    ? "bg-primary-600 text-white rounded-tr-sm"
                    : "bg-[var(--surface)] border border-[var(--line)] text-[var(--foreground)] rounded-tl-sm"
                }`}>
                  {msg.text}
                </div>
                <p className={`text-[9px] text-[var(--foreground)]/40 px-1 ${isMe ? "text-right" : ""}`}>
                  {formatTime(msg.ts)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex items-center gap-2 px-3 py-3 border-t border-[var(--line)] shrink-0">
        <button
          type="button"
          onClick={isRecording ? stopVoice : startVoice}
          disabled={isTranscribing}
          title={isRecording ? "Stop recording" : "Speak a message"}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-[0_2px_0_var(--line)] active:translate-y-[2px] active:shadow-none ${
            isRecording
              ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
              : isTranscribing
              ? "bg-[var(--surface-strong)] text-[var(--foreground)]/40 opacity-60"
              : "bg-[var(--surface-strong)] border border-[var(--line)] text-[var(--foreground)]/50 hover:text-primary-600 hover:border-primary-300 dark:hover:border-primary-700"
          }`}
        >
          {isTranscribing
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : isRecording
            ? <MicOff className="w-4 h-4" />
            : <Mic className="w-4 h-4" />}
        </button>

        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={isRecording ? "Recording… tap mic to stop" : "Type or speak a message…"}
          maxLength={500}
          disabled={isRecording || isTranscribing}
          className="flex-1 px-3 py-2 rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] text-sm text-[var(--foreground)] placeholder:text-[var(--foreground)]/40 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!text.trim() || send.isPending || isRecording || isTranscribing}
          className="w-9 h-9 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-[0_2px_0_rgba(0,0,0,0.3)] active:translate-y-[2px] active:shadow-none"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RoomsPage() {
  const utils = trpc.useUtils();

  const { data: profile } = trpc.users.getProfile.useQuery();
  const currentUserId = profile?.id ?? "";

  const { data: rooms = [], isLoading } = trpc.rooms.getActive.useQuery(undefined, {
    refetchInterval: 15_000,
  });

  const createRoom = trpc.rooms.create.useMutation({
    onSuccess: () => {
      utils.rooms.getActive.invalidate();
      setName("");
      setTopic("");
      setShowCreate(false);
      toast.success("Room created!");
    },
    onError: () => toast.error("Failed to create room"),
  });

  const joinRoom = trpc.rooms.join.useMutation({
    onSuccess: (_, vars) => {
      utils.rooms.getActive.invalidate();
      setOpenChatId(vars.roomId);
      toast.success("Joined room!");
    },
    onError: (err) => toast.error(err.message ?? "Failed to join room"),
  });

  const leaveRoom = trpc.rooms.leave.useMutation({
    onSuccess: (_, vars) => {
      utils.rooms.getActive.invalidate();
      if (openChatId === vars.roomId) setOpenChatId(null);
      toast.success("Left room");
    },
    onError: () => toast.error("Failed to leave room"),
  });

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName]             = useState("");
  const [topic, setTopic]           = useState("");
  const [openChatId, setOpenChatId] = useState<string | null>(null);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createRoom.mutate({ name: name.trim(), topic: topic.trim() || undefined });
  }

  const openChatRoom = rooms.find((r) => r.id === openChatId);

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── Top bar (shrinks, doesn't scroll) ── */}
      <div className="shrink-0 p-4 md:p-8 pb-0 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center shrink-0 border border-primary-100 dark:border-primary-800">
              <Mic2 className="w-5 h-5 text-primary-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] truncate tracking-tight">Speaking Rooms</h1>
              <p className="text-xs sm:text-sm text-[var(--foreground)]/55 mt-0.5">Practice conversation with other learners in real-time</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-stone-200 text-white dark:text-stone-900 text-xs sm:text-sm font-bold rounded-xl transition-all shadow-[0_2px_0_rgba(0,0,0,0.3)] active:translate-y-[2px] active:shadow-none cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            {showCreate ? "Cancel" : "New Room"}
          </button>
        </div>

        {/* Create room form */}
        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] rounded-[18px] p-4 sm:p-5 space-y-3 shadow-md"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground)]/40">Room Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. IELTS Speaking Part 1"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] text-sm text-[var(--foreground)] placeholder:text-[var(--foreground)]/40 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground)]/40">Topic (Optional)</label>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Travel, Job Interviews…"
                  className="w-full px-3 py-2 rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] text-sm text-[var(--foreground)] placeholder:text-[var(--foreground)]/40 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 border border-[var(--line-soft)] rounded-xl text-xs font-bold text-[var(--foreground)]/55 hover:bg-[var(--surface)] transition-all shadow-[0_2px_0_var(--line)] active:translate-y-[2px] active:shadow-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createRoom.isPending}
                className="px-5 py-2 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-stone-200 text-white dark:text-stone-900 rounded-xl text-xs font-bold disabled:opacity-50 transition-all shadow-[0_2px_0_rgba(0,0,0,0.3)] active:translate-y-[2px] active:shadow-none cursor-pointer"
              >
                {createRoom.isPending ? "Creating…" : "Create Room"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Body: room list + chat panel (fills remaining height) ── */}
      <div className="flex-1 min-h-0 flex gap-3 p-4 md:p-8 pt-3">

        {/* Room list — always visible, independently scrollable */}
        <div className={`flex flex-col min-h-0 overflow-y-auto space-y-2 ${openChatRoom ? "w-full md:w-72 lg:w-80 shrink-0" : "w-full"}`}>
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <Skeleton key={i} className="shrink-0 h-24" />
            ))
          ) : rooms.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] rounded-[22px] shadow-sm text-center">
              <div className="w-12 h-12 rounded-[18px] bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
                <Mic2 className="w-6 h-6 text-primary-400" />
              </div>
              <h3 className="font-bold text-[var(--foreground)]">No Active Rooms</h3>
              <p className="text-[var(--foreground)]/40 text-sm max-w-xs px-4">
                No active sessions. Create the first room to start practicing!
              </p>
            </div>
          ) : (
            rooms.map((room) => {
              const host        = (room.host as { displayName?: string } | null)?.displayName ?? "Learner";
              const memberCount = Array.isArray(room.members) ? room.members.length : 0;
              const maxMembers  = room.maxMembers ?? 4;
              const isFull      = memberCount >= maxMembers;
              const isMember    = Array.isArray(room.members) && room.members.some(
                (m) => (m as { userId: string }).userId === currentUserId,
              );
              const isOpen = openChatId === room.id;

              return (
                <div
                  key={room.id}
                  className={`shrink-0 bg-[var(--surface-strong)] border rounded-[18px] p-3 sm:p-4 transition-all duration-200 shadow-[0_2px_0_var(--line)] ${
                    isOpen ? "border-primary-300 dark:border-primary-700" : "border-[var(--line)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-extrabold text-[var(--foreground)] text-sm truncate">{room.name}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-md flex items-center gap-1.5 ${
                          isFull
                            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600"
                            : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full inline-block ${isFull ? "bg-red-500" : "bg-green-500 animate-ping"}`} />
                          {memberCount}/{maxMembers}
                        </span>
                        {isMember && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 text-primary-700 dark:text-primary-300 rounded-md">
                            Joined
                          </span>
                        )}
                      </div>
                      {room.topic && (
                        <p className="text-xs text-[var(--foreground)]/55 truncate">{room.topic}</p>
                      )}
                      <div className="flex items-center gap-1.5 text-[10px] text-[var(--foreground)]/40 font-medium">
                        <User className="w-3 h-3" />
                        <span className="font-semibold text-[var(--foreground)]/60">{host}</span>
                      </div>
                    </div>

                    <div className="flex gap-1.5 shrink-0 flex-col sm:flex-row">
                      {isMember ? (
                        <>
                          <button
                            onClick={() => setOpenChatId(isOpen ? null : room.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-[0_2px_0_var(--line)] active:translate-y-[2px] active:shadow-none ${
                              isOpen
                                ? "bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-700"
                                : "bg-primary-600 hover:bg-primary-700 text-white"
                            }`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            {isOpen ? "Hide" : "Chat"}
                          </button>
                          <button
                            onClick={() => leaveRoom.mutate({ roomId: room.id })}
                            disabled={leaveRoom.isPending}
                            className="flex items-center justify-center w-8 h-8 border border-[var(--line-soft)] text-[var(--foreground)]/55 text-xs font-bold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800 hover:text-red-500 transition-all disabled:opacity-50 cursor-pointer shadow-[0_2px_0_var(--line)] active:translate-y-[2px] active:shadow-none"
                            title="Leave room"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => joinRoom.mutate({ roomId: room.id })}
                          disabled={joinRoom.isPending || isFull}
                          title={isFull ? "Room is full" : "Join this room"}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-stone-200 text-white dark:text-stone-900 text-xs font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-[0_2px_0_rgba(0,0,0,0.3)] active:translate-y-[2px] active:shadow-none"
                        >
                          <LogIn className="w-3.5 h-3.5" />
                          {isFull ? "Full" : "Join"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Chat panel — full height, sticky next to room list */}
        {openChatRoom && currentUserId && (
          <div className="flex-1 min-w-0 min-h-0 hidden md:flex flex-col">
            <RoomChat
              roomId={openChatRoom.id}
              currentUserId={currentUserId}
              roomName={openChatRoom.name}
              onClose={() => setOpenChatId(null)}
            />
          </div>
        )}
      </div>

      {/* Mobile: chat panel as overlay/bottom sheet when open */}
      {openChatRoom && currentUserId && (
        <div className="md:hidden fixed inset-x-0 bottom-0 top-14 z-30 flex flex-col p-3 bg-[var(--background)]/95 backdrop-blur-sm">
          <RoomChat
            roomId={openChatRoom.id}
            currentUserId={currentUserId}
            roomName={openChatRoom.name}
            onClose={() => setOpenChatId(null)}
          />
        </div>
      )}
    </div>
  );
}
