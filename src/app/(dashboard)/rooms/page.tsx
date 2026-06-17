"use client";

import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Mic2, User } from "lucide-react";

export default function RoomsPage() {
  const utils = trpc.useUtils();
  const { data: rooms = [], isLoading } = trpc.rooms.getActive.useQuery();
  
  const createRoom = trpc.rooms.create.useMutation({
    onSuccess: () => {
      utils.rooms.getActive.invalidate();
      setName("");
      setTopic("");
      setShowCreate(false);
      toast.success("Room created successfully!");
    },
    onError: () => toast.error("Failed to create room"),
  });
  
  const joinRoom = trpc.rooms.join.useMutation({
    onSuccess: () => {
      utils.rooms.getActive.invalidate();
      toast.success("Joined room!");
    },
    onError: () => toast.error("Failed to join room"),
  });
  
  const leaveRoom = trpc.rooms.leave.useMutation({
    onSuccess: () => {
      utils.rooms.getActive.invalidate();
      toast.success("Left room");
    },
    onError: () => toast.error("Failed to leave room"),
  });

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createRoom.mutate({ name: name.trim(), topic: topic.trim() || undefined });
  }

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
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
        >
          {showCreate ? "Cancel" : "New Room"}
        </button>
      </div>

      {/* Create room form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-white border border-slate-150 rounded-2xl p-6 space-y-4 shadow-md shadow-slate-100/50"
        >
          <div className="space-y-1 border-b border-slate-100 pb-3">
            <h2 className="font-extrabold text-slate-800 text-base">Host a Speaking Room</h2>
            <p className="text-xs text-slate-400">Host a session for other learners to join and practice conversational skills.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Room Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. IELTS Speaking Part 1"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
            
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Discussion Topic (Optional)</label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Travel, Job Interviews, Daily Life"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createRoom.isPending}
              className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              {createRoom.isPending ? "Creating…" : "Create Room"}
            </button>
          </div>
        </form>
      )}

      {/* Room list */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-white border border-slate-100 animate-pulse" />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 bg-white border border-slate-100 rounded-3xl shadow-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center">
            <Mic2 className="w-6 h-6 text-violet-400" />
          </div>
          <h3 className="font-bold text-slate-900">No Active Rooms</h3>
          <p className="text-slate-400 text-sm max-w-xs">
            No active speaking sessions. Host the first room to start practicing!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {rooms.map((room) => {
            const host = (room.host as { displayName?: string } | null)?.displayName ?? "Learner";
            const memberCount = Array.isArray(room.members) ? room.members.length : 0;
            const maxMembers = room.maxMembers ?? 4;
            const isFull = memberCount >= maxMembers;

            return (
              <div
                key={room.id}
                className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center justify-between gap-4 hover:shadow-md transition-all duration-300 group"
              >
                <div className="min-w-0 space-y-1 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <p className="font-extrabold text-slate-950 text-base group-hover:text-primary-600 transition-colors truncate">
                      {room.name}
                    </p>
                    
                    <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-md uppercase tracking-wider flex items-center gap-1.5 ${
                      isFull
                        ? "bg-red-50 border-red-200 text-red-600"
                        : "bg-green-50 border-green-200 text-green-700"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full inline-block ${isFull ? "bg-red-500" : "bg-green-500 animate-ping"}`} />
                      {memberCount}/{maxMembers} Slots Taken
                    </span>
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
                  <button
                    onClick={() => joinRoom.mutate({ roomId: room.id })}
                    disabled={joinRoom.isPending || isFull}
                    className="px-4.5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm active:scale-95"
                  >
                    Join Session
                  </button>
                  <button
                    onClick={() => leaveRoom.mutate({ roomId: room.id })}
                    disabled={leaveRoom.isPending}
                    className="px-4 py-2.5 border border-slate-200 text-slate-500 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                  >
                    Leave
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
