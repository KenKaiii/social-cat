"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Model {
  id: string;
  name: string;
  description: string;
}

const AVAILABLE_MODELS: Model[] = [
  {
    id: 'sonnet',
    name: 'Claude Sonnet 4.5',
    description: 'Most intelligent model for complex agents and coding',
  },
  {
    id: 'haiku',
    name: 'Claude Haiku 4.5',
    description: 'Fast and efficient model for quick tasks',
  },
];

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
}

export function ModelSelector({ selectedModel, onModelChange, disabled = false }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentModel = AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          disabled
            ? 'text-muted-foreground cursor-not-allowed opacity-50'
            : 'text-foreground hover:bg-gray-alpha-200'
        }`}
      >
        <span className="text-14">{currentModel.name}</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 bg-card border border-border rounded-md w-96 max-w-[calc(100vw-1rem)] z-50 shadow-lg">
          <div className="px-4 py-3 font-semibold text-14 border-b border-border">Model</div>
          <div className="p-2 max-h-80 overflow-y-auto scrollbar-none">
            {AVAILABLE_MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  onModelChange(model.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left ${
                  selectedModel === model.id
                    ? 'bg-muted'
                    : 'hover:bg-gray-alpha-200'
                }`}
              >
                <div className="flex-1 flex flex-col gap-1">
                  <div className="text-14 font-medium text-foreground">{model.name}</div>
                  <div className="text-12 text-muted-foreground">{model.description}</div>
                </div>
                {selectedModel === model.id && (
                  <Check size={16} className="text-foreground" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
