"use client";

import React, { useState } from 'react';
import { Menu, Edit3, Trash2 } from 'lucide-react';

interface ChatSession {
  id: string;
  title: string;
  updatedAt: Date;
  isActive?: boolean;
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  sessions: ChatSession[];
  onNewChat: () => void;
  onSessionSelect: (sessionId: string) => void;
  onSessionDelete: (sessionId: string) => void;
}

export function Sidebar({
  isOpen,
  onToggle,
  sessions,
  onNewChat,
  onSessionSelect,
  onSessionDelete,
}: SidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div
      className={`fixed top-0 left-0 h-full bg-card border-r border-border z-40 transition-all duration-200 ${
        isOpen ? 'w-64' : 'w-0'
      } overflow-hidden`}
    >
      <div className="flex flex-col h-full w-64">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-border">
          <span className="text-foreground font-semibold text-14">Build Chats</span>
          <button
            onClick={onToggle}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors text-foreground"
            aria-label="Toggle sidebar"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-input hover:bg-muted transition-colors text-foreground text-14 font-medium"
          >
            <Edit3 size={16} />
            <span>New Chat</span>
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-none">
          <div className="space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="relative group"
                onMouseEnter={() => setHoveredId(session.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <button
                  onClick={() => onSessionSelect(session.id)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors text-14 ${
                    session.isActive
                      ? 'bg-muted text-foreground'
                      : 'hover:bg-gray-alpha-200 text-muted-foreground'
                  }`}
                >
                  <div className="truncate pr-6">{session.title || 'Untitled'}</div>
                </button>

                {/* Delete button on hover */}
                {hoveredId === session.id && !session.isActive && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSessionDelete(session.id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-destructive/20 transition-colors text-muted-foreground hover:text-destructive"
                    aria-label="Delete chat"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
