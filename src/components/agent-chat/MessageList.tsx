"use client";

import React, { useEffect, memo } from 'react';
import { MessageItem } from './message/MessageItem';

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

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  isLoadingSession?: boolean;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

const MessageListComponent = ({ messages, isLoading, isLoadingSession, scrollContainerRef }: MessageListProps) => {
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  return (
    <div
      ref={scrollContainerRef}
      className="h-full overflow-y-auto px-5 py-8 bg-background scrollbar-none"
      style={{
        willChange: 'scroll-position',
      }}
    >
      {isLoadingSession ? (
        <div className="space-y-6 max-w-[924px] mx-auto">
          {/* Skeleton loaders */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col space-y-2 animate-pulse">
              <div className="flex items-center gap-2">
                <div className="h-4 w-12 bg-muted rounded"></div>
                <div className="h-3 w-16 bg-muted rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-muted rounded"></div>
                <div className="h-4 w-3/4 bg-muted rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">Chat with b0t</h2>
            <p className="text-muted-foreground">Ask me anything about your workflows and automations</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6 max-w-[924px] mx-auto">
          {messages.map((message) => (
            <div key={message.id} className="w-full">
              <MessageItem message={message} />
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const MessageList = memo(MessageListComponent);
