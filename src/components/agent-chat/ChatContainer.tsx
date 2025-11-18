"use client";

import React, { useState, useRef, useEffect } from 'react';
import { X, Menu } from 'lucide-react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { Sidebar } from './Sidebar';
import { ModelSelector } from './ModelSelector';
import { logger } from '@/lib/logger';

interface ContentBlock {
  type: 'text' | 'tool_use';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string | ContentBlock[];
  timestamp: string;
}

interface ChatContainerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatContainer({ isOpen, onClose }: ChatContainerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Array<{ id: string; title: string; updatedAt: string }>>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('sonnet');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load sessions when chat opens
  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen]);

  // Prevent body scroll when chat is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/agent-chat/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      logger.error({ error }, 'Failed to load sessions');
    }
  };

  const handleNewChat = () => {
    setSessionId(null);
    setMessages([]);
    setInputValue('');
  };

  const handleSessionSelect = async (id: string) => {
    setSessionId(id);
    setMessages([]);
    setIsLoadingSession(true);

    try {
      const response = await fetch(`/api/agent-chat/sessions/${id}/messages`);
      if (response.ok) {
        const data = await response.json();
        const loadedMessages: Message[] = data.messages.map((msg: {
          id: string;
          role: string;
          content: string;
          createdAt: string;
        }) => ({
          id: msg.id,
          type: msg.role as 'user' | 'assistant',
          content: msg.role === 'assistant' ? JSON.parse(msg.content) : msg.content,
          timestamp: msg.createdAt,
        }));
        setMessages(loadedMessages);
      }
    } catch (error) {
      logger.error({ error }, 'Failed to load messages');
    } finally {
      setIsLoadingSession(false);
    }
  };

  const handleSessionDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/agent-chat/sessions?id=${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        if (id === sessionId) {
          handleNewChat();
        }
        await loadSessions();
      }
    } catch (error) {
      logger.error({ error }, 'Failed to delete session');
    }
  };

  // Handle message submission with SSE streaming
  const handleSubmit = async () => {
    const messageText = inputValue.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          sessionId,
          model: selectedModel,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Create assistant message placeholder
      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        type: 'assistant',
        content: [],
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Read SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'session') {
                setSessionId(data.sessionId);
              } else if (data.type === 'content_block') {
                // Add content block to assistant message
                setMessages((prev) =>
                  prev.map((msg) => {
                    if (msg.id === assistantMessageId && Array.isArray(msg.content)) {
                      return { ...msg, content: [...msg.content, data.block] };
                    }
                    return msg;
                  })
                );
              } else if (data.type === 'error') {
                logger.error({ error: data.error }, 'Stream error');
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: [{ type: 'text', text: `Error: ${data.error}` }] as ContentBlock[] }
                      : msg
                  )
                );
              }
            } catch {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.info('Request aborted');
      } else {
        logger.error({ error }, 'Error sending message');
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
      // Reload sessions to update the list
      await loadSessions();
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex bg-background"
      style={{
        isolation: 'isolate',
        backfaceVisibility: 'hidden',
        transform: 'translateZ(0)',
      }}
    >
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        sessions={sessions.map((s) => ({
          id: s.id,
          title: s.title || 'Untitled',
          updatedAt: new Date(s.updatedAt),
          isActive: s.id === sessionId,
        }))}
        onNewChat={handleNewChat}
        onSessionSelect={handleSessionSelect}
        onSessionDelete={handleSessionDelete}
      />

      {/* Main chat area */}
      <div className="flex flex-col flex-1 h-screen">
        {/* Top bar with menu and close buttons */}
        <div className="flex justify-between items-center px-4 py-3 flex-shrink-0 relative bg-background">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-alpha-200 transition-colors text-foreground"
              aria-label="Toggle sidebar"
            >
              <Menu size={20} />
            </button>
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              disabled={messages.length > 0}
            />
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-alpha-200 transition-colors text-foreground"
            aria-label="Close chat"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages - flex-1 to take remaining space */}
        <div className="flex-1 overflow-hidden bg-background">
          <MessageList
            messages={messages}
            isLoading={isLoading}
            isLoadingSession={isLoadingSession}
            scrollContainerRef={scrollContainerRef}
          />
        </div>

        {/* Input - fixed at bottom */}
        <div className="flex-shrink-0">
          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            onStop={handleStop}
            disabled={isLoading}
            isGenerating={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
