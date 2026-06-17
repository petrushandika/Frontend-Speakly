"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Mic2, User, Send, MessageSquare, X, LogIn, LogOut,
} from "lucide-react";

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
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = trpc.rooms.getMessages.useQuery(
    { roomId },
    { refetchInterval: 3000 },
  );

  const send = trpc.rooms.sendMessage.useMutation({
    onSuccess: () => {
      utils.rooms.getMessages.invalidate({ roomId });
      setText("");
    },
    onError: () => toast.error("Failed to send message"),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    send.mutate({ roomId, text: trimmed });
  }

  function formatTime(ts: number) {
    return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="flex flex-col h-full bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] rounded-[18px] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="w-4 h-4 text-violet-500 shrink-0" />
          <p className="text-sm font-bold text-slate-800 truncate">{roomName}</p>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-[var(--surface)] transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-300">
            <MessageSquare className="w-8 h-8" />
            <p className="text-xs text-slate-400">No messages yet — say hi!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.userId === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[80%] space-y-0.5">
                {!isMe && (
                  <p className="text-[10px] font-semibold text-slate-400 px-1">{msg.displayName}</p>
                )}
                <div className={`px-3 py-2 rounded-xl text-sm leading-relaxed ${
                  isMe
                    ? "bg-violet-600 text-white rounded-tr-sm"
                    : "bg-slate-100 text-slate-800 rounded-tl-sm"
                }`}>
                  {msg.text}
                </div>
                <p className={`text-[9px] text-slate-400 px-1 ${isMe ? "text-right" : ""}`}>
                  {formatTime(msg.ts)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex items-center gap-2 px-3 py-3 border-t border-slate-100 shrink-0">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          maxLength={500}
          className="flex-1 px-3 py-2 rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all"
        />
        <button
          type="submit"
          disabled={!text.trim() || send.isPending}
          className="w-9 h-9 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white flex items-center justify-center transition-all shrink-0 cursor-pointer"
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
    refetchInterval: 10_000,
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
    <div className="w-full p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
            <Mic2 className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Speaking Rooms</h1>
            <p className="text-sm text-slate-500">Practice conversation with other learners</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#1f1d19] hover:bg-[#161411] text-white text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
        >
          {showCreate ? "Cancel" : "New Room"}
        </button>
      </div>

      {/* Create room form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] rounded-[18px] p-6 space-y-4 shadow-md shadow-slate-100/50"
        >
          <div className="space-y-1 border-b border-slate-100 pb-3">
            <h2 className="font-extrabold text-slate-800 text-base">Host a Speaking Room</h2>
            <p className="text-xs text-slate-400">Host a session for other learners to join and practice.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Room Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. IELTS Speaking Part 1"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--line-soft)] bg-[var(--surface)]/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Discussion Topic (Optional)</label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Travel, Job Interviews, Daily Life"
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--line-soft)] bg-[var(--surface)]/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-5 py-2.5 border border-[var(--line-soft)] rounded-xl text-xs font-bold text-slate-500 hover:bg-[var(--surface)] transition-all active:scale-95 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createRoom.isPending}
              className="px-6 py-2.5 bg-[#1f1d19] hover:bg-[#161411] text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              {createRoom.isPending ? "Creating…" : "Create Room"}
            </button>
          </div>
        </form>
      )}

      {/* Room list + chat split */}
      <div className={`flex gap-4 ${openChatRoom ? "flex-col lg:flex-row" : ""}`}>
        {/* Room list */}
        <div className={`space-y-3 ${openChatRoom ? "lg:w-1/2 w-full" : "w-full"}`}>
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="h-24 rounded-[18px] bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] animate-pulse" />
            ))
          ) : rooms.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 bg-[var(--surface-strong)] border-[1.5px] border-[var(--line)] rounded-[22px] shadow-sm text-center">
              <div className="w-12 h-12 rounded-[18px] bg-violet-50 flex items-center justify-center">
                <Mic2 className="w-6 h-6 text-violet-400" />
              </div>
              <h3 className="font-bold text-slate-900">No Active Rooms</h3>
              <p className="text-slate-400 text-sm max-w-xs">
                No active sessions. Host the first room to start practicing!
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
                  className={`bg-white border rounded-[18px] p-5 flex items-center justify-between gap-4 transition-all duration-200 ${
                    isOpen ? "border-violet-300 shadow-md" : "border-slate-100 hover:shadow-md"
                  }`}
                >
                  <div className="min-w-0 space-y-1 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <p className="font-extrabold text-slate-950 text-base truncate">
                        {room.name}
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-md uppercase tracking-wider flex items-center gap-1.5 ${
                        isFull
                          ? "bg-red-50 border-red-200 text-red-600"
                          : "bg-green-50 border-green-200 text-green-700"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full inline-block ${isFull ? "bg-red-500" : "bg-green-500 animate-ping"}`} />
                        {memberCount}/{maxMembers}
                      </span>
                      {isMember && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-violet-50 border border-violet-200 text-violet-700 rounded-md uppercase tracking-wider">
                          Joined
                        </span>
                      )}
                    </div>
                    {room.topic && (
                      <p className="text-sm font-semibold text-slate-500 truncate">{room.topic}</p>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1 font-medium">
                      <User className="w-3.5 h-3.5" />
                      <span>Host:</span>
                      <span className="font-semibold text-slate-600">{host}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    {isMember ? (
                      <>
                        <button
                          onClick={() => setOpenChatId(isOpen ? null : room.id)}
                          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-95 ${
                            isOpen
                              ? "bg-violet-100 text-violet-700 border border-violet-200"
                              : "bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
                          }`}
                        >
                          <MessageSquare className="w-3.5 h-3.5 inline mr-1.5" />
                          {isOpen ? "Hide Chat" : "Open Chat"}
                        </button>
                        <button
                          onClick={() => leaveRoom.mutate({ roomId: room.id })}
                          disabled={leaveRoom.isPending}
                          className="px-3 py-2.5 border border-[var(--line-soft)] text-slate-500 text-xs font-bold rounded-xl hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
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
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-[#1f1d19] hover:bg-[#161411] text-white text-xs font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm active:scale-95"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        {isFull ? "Full" : "Join"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Chat panel */}
        {openChatRoom && currentUserId && (
          <div className="lg:w-1/2 w-full" style={{ height: 480 }}>
            <RoomChat
              roomId={openChatRoom.id}
              currentUserId={currentUserId}
              roomName={openChatRoom.name}
              onClose={() => setOpenChatId(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
