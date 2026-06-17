"use client";

import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function RoomsPage() {
  const utils = trpc.useUtils();
  const { data: rooms = [], isLoading } = trpc.rooms.getActive.useQuery();
  const createRoom = trpc.rooms.create.useMutation({
    onSuccess: () => {
      utils.rooms.getActive.invalidate();
      setName("");
      setTopic("");
      setShowCreate(false);
      toast.success("Room created!");
    },
  });
  const joinRoom = trpc.rooms.join.useMutation({
    onSuccess: () => {
      utils.rooms.getActive.invalidate();
      toast.success("Joined room!");
    },
  });
  const leaveRoom = trpc.rooms.leave.useMutation({
    onSuccess: () => utils.rooms.getActive.invalidate(),
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
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Speaking Rooms</h1>
          <p className="text-sm text-gray-500 mt-1">Practice with other learners</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors"
        >
          + Create room
        </button>
      </div>

      {/* Create room form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3"
        >
          <h2 className="font-semibold text-gray-800">New room</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Room name"
            required
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic (optional) — e.g. Business English, Travel"
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createRoom.isPending}
              className="flex-1 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {createRoom.isPending ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      )}

      {/* Room list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">🎙️</p>
          <p className="font-medium text-gray-600">No active rooms</p>
          <p className="text-sm mt-1">Create the first room and start practicing!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => {
            const host = (room.host as { displayName?: string } | null)?.displayName ?? "Unknown";
            const memberCount = Array.isArray(room.members) ? room.members.length : 0;
            const maxMembers = room.maxMembers ?? 4;

            return (
              <div
                key={room.id}
                className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 truncate">{room.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      memberCount >= maxMembers
                        ? "bg-red-100 text-red-600"
                        : "bg-green-100 text-green-700"
                    }`}>
                      {memberCount}/{maxMembers}
                    </span>
                  </div>
                  {room.topic && (
                    <p className="text-sm text-gray-400 mt-0.5 truncate">{room.topic}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Host: {host}</p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => joinRoom.mutate({ roomId: room.id })}
                    disabled={joinRoom.isPending || memberCount >= maxMembers}
                    className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    Join
                  </button>
                  <button
                    onClick={() => leaveRoom.mutate({ roomId: room.id })}
                    disabled={leaveRoom.isPending}
                    className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
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
