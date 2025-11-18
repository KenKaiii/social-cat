"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface SetupOverlayProps {
  workspaceDir: string;
  onComplete: () => void;
}

export function SetupOverlay({ workspaceDir, onComplete }: SetupOverlayProps) {
  const [isInstalling, setIsInstalling] = useState(false);
  const [output, setOutput] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleInstall = async () => {
    setIsInstalling(true);
    setOutput([]);
    setError(null);

    try {
      const response = await fetch('/api/agent-chat/setup', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to start installation');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

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

              if (data.type === 'output') {
                setOutput((prev) => [...prev, data.message]);
              } else if (data.type === 'complete') {
                if (data.success) {
                  onComplete();
                } else {
                  setError(data.error || 'Installation failed');
                }
                setIsInstalling(false);
              } else if (data.type === 'error') {
                setError(data.error);
                setIsInstalling(false);
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsInstalling(false);
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/95 backdrop-blur-sm z-50">
      <div className="bg-card border border-border rounded-lg p-8 max-w-md w-full shadow-lg">
        <h2 className="text-xl font-semibold text-foreground mb-2">Workspace Setup Required</h2>
        <p className="text-muted-foreground text-14 mb-4">
          The agent workspace needs dependencies installed to run scripts.
        </p>
        <p className="text-12 text-muted-foreground mb-6 font-mono bg-muted p-2 rounded">
          {workspaceDir}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
            {error}
          </div>
        )}

        {output.length > 0 && (
          <div className="mb-4 p-3 bg-muted rounded max-h-48 overflow-y-auto scrollbar-none">
            <pre className="text-12 text-foreground font-mono whitespace-pre-wrap">
              {output.join('')}
            </pre>
          </div>
        )}

        <Button
          onClick={handleInstall}
          disabled={isInstalling}
          className="w-full"
        >
          {isInstalling ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Installing dependencies...
            </>
          ) : (
            'Install Dependencies'
          )}
        </Button>
      </div>
    </div>
  );
}
