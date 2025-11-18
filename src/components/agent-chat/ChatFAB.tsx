"use client";

import React, { useState } from 'react';
import { MessageSquare } from "lucide-react";
import { ChatContainer } from "./ChatContainer";
import { Button } from "@/components/ui/button";

export function ChatFAB() {
  const [isOpen, setIsOpen] = useState(false);

  // Only show in development (Claude Agent SDK requires local filesystem)
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (!isDevelopment) {
    return null;
  }

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          variant="default"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
          aria-label="Build"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Build</span>
        </Button>
      )}

      <ChatContainer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
