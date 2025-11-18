"use client";

import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface EditWriteToolProps {
  toolName: 'Edit' | 'Write';
  filePath: string;
  oldString?: string;
  newString?: string;
  content?: string;
}

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'tsx',
    'js': 'javascript',
    'jsx': 'jsx',
    'py': 'python',
    'go': 'go',
    'rs': 'rust',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'sh': 'bash',
    'css': 'css',
    'html': 'html',
  };
  return languageMap[ext || ''] || 'text';
}

export function EditWriteTool({ toolName, filePath, oldString, newString, content }: EditWriteToolProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const language = getLanguageFromPath(filePath);

  // Calculate stats
  const stats = {
    added: (newString || content || '').split('\n').length,
    removed: (oldString || '').split('\n').length,
  };

  return (
    <div className="w-full border border-white/10 rounded-xl my-3 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between px-4 py-2 w-full text-xs bg-[#0C0E10] border-b border-white/10">
        <div className="flex overflow-hidden flex-1 gap-2 items-center whitespace-nowrap">
          <svg className="w-4 h-4" strokeWidth="1.5" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5.33398 4.33301L1.33398 8.47707L5.33398 12.333" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10.666 4.33301L14.666 8.47707L10.666 12.333" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9.33333 1.33301L7 14.6663" stroke="currentColor" strokeLinecap="round" />
          </svg>
          <span className="text-sm font-medium leading-6 text-white">{toolName}</span>
          <div className="bg-gray-700 shrink-0 min-h-4 w-[1px] h-4" role="separator" aria-orientation="vertical" />
          <span className="flex-1 min-w-0 text-xs truncate text-white/60">
            {filePath}
          </span>
        </div>
        <div className="flex gap-1 items-center whitespace-nowrap">
          <span className="text-green-500">+{stats.added}</span>
          {stats.removed > 0 && (
            <>
              <span className="text-white/40">/</span>
              <span className="text-red-500">-{stats.removed}</span>
            </>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            data-collapsed={!isExpanded}
            className="p-1.5 rounded-lg transition-all data-[collapsed=true]:-rotate-180 ml-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3.5" stroke="currentColor" className="w-3 h-3 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Diff Viewer */}
      {isExpanded && (
        <div className="max-h-[300px] overflow-auto bg-black/30 scrollbar-none">
          {/* Deleted chunk */}
          {oldString && (
            <div className="bg-red-500/10 border-l-2 border-red-500">
              <SyntaxHighlighter
                language={language}
                style={vscDarkPlus}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  padding: '0.5rem',
                  background: 'transparent',
                  fontSize: '0.75rem',
                  lineHeight: '1.5',
                }}
                showLineNumbers={false}
                wrapLines={true}
                lineProps={() => ({
                  style: {
                    textDecoration: 'line-through',
                    opacity: 0.7,
                    display: 'block',
                  },
                })}
              >
                {oldString}
              </SyntaxHighlighter>
            </div>
          )}

          {/* Added content */}
          {(newString || content) && (
            <div className="bg-green-500/10 border-l-2 border-green-500">
              <SyntaxHighlighter
                language={language}
                style={vscDarkPlus}
                PreTag="div"
                showLineNumbers={true}
                customStyle={{
                  margin: 0,
                  padding: '0.5rem',
                  background: 'transparent',
                  fontSize: '0.75rem',
                  lineHeight: '1.5',
                }}
              >
                {(newString || content) as string}
              </SyntaxHighlighter>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
