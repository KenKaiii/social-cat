"use client";

import React, { useState, memo, useEffect } from 'react';
import type { Prism as SyntaxHighlighterType } from 'react-syntax-highlighter';
import type { SyntaxHighlighterProps } from 'react-syntax-highlighter';
import { toast } from 'sonner';

let SyntaxHighlighterComponent: typeof SyntaxHighlighterType | null = null;
let vscDarkPlusTheme: SyntaxHighlighterProps['style'] | null = null;

interface CodeBlockWithCopyProps {
  code: string;
  language: string;
}

const CodeBlockWithCopyComponent = ({ code, language }: CodeBlockWithCopyProps) => {
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load syntax highlighter dynamically
  useEffect(() => {
    if (!SyntaxHighlighterComponent || !vscDarkPlusTheme) {
      Promise.all([
        import('react-syntax-highlighter').then(mod => mod.Prism),
        import('react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus')
      ]).then(([SyntaxHighlighter, theme]) => {
        SyntaxHighlighterComponent = SyntaxHighlighter as typeof SyntaxHighlighterType;
        vscDarkPlusTheme = theme.default;
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="flex flex-col bg-card border border-border rounded-lg overflow-hidden my-3">
      {/* Title bar */}
      <div className="flex justify-between items-center px-4 py-2 w-full text-xs border-b border-border bg-muted/50">
        <div className="flex gap-2 items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4 text-foreground/80"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
          </svg>
          <div className="text-sm font-medium text-foreground">{language}</div>
        </div>

        <button
          onClick={handleCopy}
          className="px-2 py-1 rounded-md hover:bg-gray-alpha-200 transition text-xs text-foreground"
          aria-label={copied ? "Copied!" : "Copy code"}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Code content */}
      {isLoading ? (
        <div className="p-4 animate-pulse">
          <pre className="text-sm text-muted-foreground font-mono">{code}</pre>
        </div>
      ) : SyntaxHighlighterComponent ? (
        <SyntaxHighlighterComponent
          style={vscDarkPlusTheme || undefined}
          language={language || 'text'}
          PreTag="div"
          customStyle={{
            margin: 0,
            borderRadius: 0,
            background: 'transparent',
          }}
        >
          {code}
        </SyntaxHighlighterComponent>
      ) : (
        <div className="p-4">
          <pre className="text-sm text-foreground font-mono">{code}</pre>
        </div>
      )}
    </div>
  );
}

export const CodeBlockWithCopy = memo(CodeBlockWithCopyComponent);
