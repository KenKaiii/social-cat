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

// Animation constants to avoid creating new objects on each render
const MESSAGE_ANIMATION_INITIAL = { opacity: 0, y: 10 };
const MESSAGE_ANIMATION_ANIMATE = { opacity: 1, y: 0 };
const MESSAGE_ANIMATION_TRANSITION = { duration: 0.3, ease: 'easeOut' as const };

interface ChatInterfaceProps {
  workflowId: string;
  workflowName: string;
  workflowDescription?: string;
  conversationId?: string;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

export function ChatInterface({
  workflowId,
  workflowName,
  workflowDescription,
  conversationId: initialConversationId,
  onFullscreenChange,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);

  const toggleFullscreen = () => {
    const newFullscreen = !isFullscreen;
    setIsFullscreen(newFullscreen);
    onFullscreenChange?.(newFullscreen);
  };

  const { messages, setMessages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/workflows/${workflowId}/chat`,
      fetch: async (url, options) => {
        const response = await fetch(url, options);

        // Extract conversation ID from response headers
        const newConversationId = response.headers.get('X-Conversation-Id');

        if (newConversationId && !conversationId) {
          setConversationId(newConversationId);
        }

        return response;
      },
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

  // Load conversation history if conversationId is provided
  useEffect(() => {
    if (initialConversationId && !isLoadingHistory) {
      setIsLoadingHistory(true);
      fetch(`/api/workflows/${workflowId}/chat?conversationId=${initialConversationId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.messages && data.messages.length > 0) {
            // Convert DB messages to AI SDK format
            const loadedMessages = data.messages.map((msg: { id: string; role: string; content: string }) => ({
              id: msg.id,
              role: msg.role,
              parts: [{
                type: 'text',
                text: msg.content,
              }],
            }));

            // Prepend welcome message
            setMessages([
              {
                id: 'welcome',
                role: 'assistant',
                parts: [{
                  type: 'text',
                  text: `Hi! I'm here to help you with **${workflowName}**.\n\n${workflowDescription || 'How can I assist you today?'}`,
                }],
              },
              ...loadedMessages,
            ]);
          }
        })
        .catch((error) => {
          console.error('Failed to load conversation history:', error);
        })
        .finally(() => {
          setIsLoadingHistory(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConversationId]);

  // Extract text content from message parts
  const getMessageText = (message: typeof messages[0]) => {
    if (!message.parts || message.parts.length === 0) return '';
    return (message.parts as Array<{ type: string; text?: string }>)
      .filter((part) => part.type === 'text')
      .map((part) => part.text || '')
      .join('');
  };

  // Show loading indicator when waiting for response or when response just started (empty assistant message)
  const lastMessage = messages[messages.length - 1];
  const lastMessageText = lastMessage ? getMessageText(lastMessage) : '';
  const isLoading = status === 'submitted' ||
    (status === 'streaming' && (lastMessage?.role as string) === 'assistant' && lastMessageText.trim() === '');

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

  // Maintain focus on input when status changes (during streaming and after response completes)
  useEffect(() => {
    if (inputRef.current && document.activeElement !== inputRef.current) {
      // Re-focus during streaming and when returning to ready state (after response completes)
      if (status === 'streaming' || status === 'ready') {
        inputRef.current.focus();
      }
    }
  }, [status]);

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input || !input.trim()) return;

    sendMessage(
      { text: input },
      conversationId ? { body: { conversationId } } : undefined
    );
    setInput(''); // Clear input after sending
  };

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-lg">
      {/* Fullscreen toggle button - positioned absolutely to be next to close button */}
      <button
        type="button"
        onClick={toggleFullscreen}
        className="ring-offset-background focus:ring-ring absolute top-4 right-14 rounded-sm p-1.5 opacity-70 transition-all hover:opacity-100 hover:bg-muted focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 z-10"
      >
        {isFullscreen ? (
          <Minimize2 className="h-4 w-4" />
        ) : (
          <Maximize2 className="h-4 w-4" />
        )}
        <span className="sr-only">Toggle fullscreen</span>
      </button>

      {/* Header */}
      <div className="relative flex items-start px-4 py-3 border-b bg-gradient-to-r from-primary/5 via-blue-500/3 to-transparent rounded-t-lg">
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-primary/30 via-blue-400/30 to-transparent" />
        <div>
          <h3 className="font-semibold text-sm">{workflowName}</h3>
          {workflowDescription && (
            <p className="text-xs text-muted-foreground">{workflowDescription}</p>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <AnimatePresence initial={false}>
          {messages.map((message, index) => (
            <motion.div
              key={`${message.id}-${index}`}
              initial={MESSAGE_ANIMATION_INITIAL}
              animate={MESSAGE_ANIMATION_ANIMATE}
              transition={MESSAGE_ANIMATION_TRANSITION}
              className={cn(
                'flex gap-4',
                (message.role as string) === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {(message.role as string) === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary via-blue-500 to-primary flex items-center justify-center shadow-sm">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}

              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-3',
                  (message.role as string) === 'user'
                    ? 'bg-gradient-to-br from-primary via-blue-500 to-primary text-primary-foreground shadow-sm'
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
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary via-blue-500 to-primary flex items-center justify-center shadow-sm">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={MESSAGE_ANIMATION_INITIAL}
            animate={MESSAGE_ANIMATION_ANIMATE}
            className="flex gap-4"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary via-blue-500 to-primary flex items-center justify-center shadow-sm">
              <Bot className="w-5 h-5 text-white" />
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
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 rounded-b-lg">
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
