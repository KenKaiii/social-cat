'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, User, Bot, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ChatInterfaceProps {
  workflowId: string;
  workflowName: string;
  workflowDescription?: string;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

export function ChatInterface({
  workflowId,
  workflowName,
  workflowDescription,
  onFullscreenChange,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [input, setInput] = useState('');

  const toggleFullscreen = () => {
    const newFullscreen = !isFullscreen;
    setIsFullscreen(newFullscreen);
    onFullscreenChange?.(newFullscreen);
  };

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/workflows/${workflowId}/chat`,
    }),
    messages: [
      {
        id: 'welcome',
        role: 'assistant',
        parts: [
          {
            type: 'text',
            text: `Hi! I'm here to help you with **${workflowName}**.\n\n${workflowDescription || 'How can I assist you today?'}`,
          },
        ],
      },
    ],
  });

  // Extract text content from message parts
  const getMessageText = (message: typeof messages[0]) => {
    if (!message.parts || message.parts.length === 0) return '';
    return (message.parts as Array<{ type: string; text?: string }>)
      .filter((part) => part.type === 'text')
      .map((part) => part.text || '')
      .join('');
  };

  // Only show loading if we're waiting for a response (no assistant message being streamed yet)
  const lastMessage = messages[messages.length - 1];
  const isLoading = (status === 'submitted' || status === 'streaming') && (lastMessage?.role as string) === 'user';

  // Auto-focus input when component mounts
  useEffect(() => {
    // Small delay to ensure the dialog/modal is fully rendered
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Maintain focus on input when messages change (streaming responses)
  useEffect(() => {
    if (status === 'streaming' && inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus();
    }
  }, [messages, status]);

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input || !input.trim()) return;

    sendMessage({ text: input });
    setInput(''); // Clear input after sending
  };

  return (
    <div className="flex flex-col h-full">
      {/* Fullscreen toggle button - positioned absolutely to be next to close button */}
      <button
        type="button"
        onClick={toggleFullscreen}
        className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-12 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
      >
        {isFullscreen ? (
          <Minimize2 className="h-4 w-4" />
        ) : (
          <Maximize2 className="h-4 w-4" />
        )}
        <span className="sr-only">Toggle fullscreen</span>
      </button>

      {/* Header */}
      <div className="flex items-start px-4 py-3 border-b">
        <div>
          <h3 className="font-semibold text-sm">{workflowName}</h3>
          {workflowDescription && (
            <p className="text-xs text-muted-foreground">{workflowDescription}</p>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={cn(
                'flex gap-4',
                (message.role as string) === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {(message.role as string) === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
              )}

              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-3',
                  (message.role as string) === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                {(message.role as string) === 'assistant' ? (
                  <div className="prose prose-sm max-w-none text-foreground [&_*]:!text-foreground [&_a]:!text-blue-500 [&_code]:!text-foreground [&_pre]:!bg-gray-200">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {getMessageText(message)}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {getMessageText(message)}
                  </p>
                )}
              </div>

              {(message.role as string) === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-foreground" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
        <form onSubmit={handleFormSubmit} className="flex gap-3">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="min-h-[60px] max-h-[200px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleFormSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
              }
            }}
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            className="h-[60px] w-[60px] flex-shrink-0"
            disabled={isLoading || !input || !input.trim()}
            onMouseDown={(e) => {
              // Prevent button from taking focus when clicked
              e.preventDefault();
            }}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> to send,{' '}
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Shift + Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
}
