"use client";

import React, { useRef, useEffect, useState } from 'react';
import { Send, Square } from 'lucide-react';
import { logger } from '@/lib/logger';

interface SlashCommand {
  name: string;
  description: string;
  argumentHint: string;
}

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  disabled?: boolean;
  isGenerating?: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  disabled,
  isGenerating,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [availableCommands, setAvailableCommands] = useState<SlashCommand[]>([]);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState<SlashCommand[]>([]);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);

  // Load available commands on mount
  useEffect(() => {
    fetch('/api/agent-chat/commands')
      .then((res) => res.json())
      .then((data) => setAvailableCommands(data.commands || []))
      .catch((err) => logger.error({ error: err }, 'Failed to load commands'));
  }, []);

  // Detect "/" for command autocomplete
  useEffect(() => {
    if (value.startsWith('/') && availableCommands.length > 0) {
      const searchTerm = value.slice(1).toLowerCase();
      const filtered = availableCommands.filter((cmd) =>
        cmd.name.toLowerCase().includes(searchTerm)
      );
      setFilteredCommands(filtered);
      setShowCommandMenu(filtered.length > 0);
      setSelectedCommandIndex(0);
    } else {
      setShowCommandMenu(false);
    }
  }, [value, availableCommands]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle command menu navigation
    if (showCommandMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCommandIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : prev
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCommandIndex((prev) => (prev > 0 ? prev - 1 : prev));
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        const selectedCommand = filteredCommands[selectedCommandIndex];
        if (selectedCommand) {
          onChange(`/${selectedCommand.name} `);
          setShowCommandMenu(false);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowCommandMenu(false);
        return;
      }
    }

    // Normal submit handling
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) {
        onSubmit();
      }
    }
  };

  const handleSubmitClick = () => {
    if (isGenerating) {
      onStop();
    } else if (value.trim() && !disabled) {
      onSubmit();
    }
  };

  return (
    <div className="bg-background p-4 border-t border-border">
      <div className="max-w-[924px] mx-auto">
        {/* Command autocomplete menu */}
        {showCommandMenu && filteredCommands.length > 0 && (
          <div className="mb-2 w-full bg-card border border-border rounded-md shadow-lg overflow-hidden">
            <div className="max-h-[240px] overflow-y-auto py-1 scrollbar-none">
              {filteredCommands.map((cmd, index) => (
                <button
                  key={cmd.name}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(`/${cmd.name} `);
                    setShowCommandMenu(false);
                  }}
                  onMouseEnter={() => setSelectedCommandIndex(index)}
                  className={`w-full text-left px-4 py-3 transition-colors cursor-pointer ${
                    index < filteredCommands.length - 1 ? 'border-b border-border' : ''
                  } ${index === selectedCommandIndex ? 'bg-muted' : 'hover:bg-gray-alpha-200'}`}
                >
                  <div className="font-mono text-sm text-blue-500">/{cmd.name}</div>
                  <div className="text-12 text-muted-foreground mt-1">{cmd.description}</div>
                  {cmd.argumentHint && (
                    <div className="text-12 text-muted-foreground/60 mt-1 font-mono">{cmd.argumentHint}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 items-end">
          {/* Input wrapper */}
          <div className="flex-1 bg-input rounded-xl border-b-2 border-gray-alpha-200 hover:bg-gray-alpha-300 transition-colors">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message... (Shift+Enter for new line)"
              disabled={disabled}
              className="w-full bg-transparent text-foreground text-14 px-4 py-3 resize-none outline-none placeholder:text-muted-foreground scrollbar-none min-h-[60px] max-h-[200px]"
            />
          </div>

          {/* Send/Stop button */}
          <button
            onClick={handleSubmitClick}
            disabled={disabled && !isGenerating}
            className={`p-3 rounded-lg flex-shrink-0 transition-all ${
              isGenerating
                ? 'bg-destructive hover:opacity-90'
                : value.trim()
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-gray-500 cursor-not-allowed opacity-50'
            }`}
            aria-label={isGenerating ? 'Stop generation' : 'Send message'}
          >
            {isGenerating ? (
              <Square size={20} className="text-destructive-foreground" />
            ) : (
              <Send size={20} className="text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
