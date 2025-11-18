'use client';

import { detectOutputDisplay, type OutputDisplayConfig } from '@/lib/workflows/analyze-output-display';
import { DataTable } from './data-table';
import { ImageDisplay, ImageGrid } from './image-display';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { Button } from '@/components/ui/button';
import { Copy, Download, Check, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { logger } from '@/lib/logger';

const ReactJson = dynamic(() => import('@microlink/react-json-view'), { ssr: false });

interface OutputRendererProps {
  output: unknown;
  modulePath?: string;
  displayHint?: OutputDisplayConfig;
  onClose?: () => void;
}

export function OutputRenderer({ output, modulePath, displayHint, onClose }: OutputRendererProps) {

  // Auto-parse JSON strings for table display
  // If output is a JSON string and displayHint expects a table, parse it
  let parsedOutput = output;
  if (typeof output === 'string' && displayHint?.type === 'table') {
    try {
      // Try to parse as JSON
      const trimmed = output.trim();
      if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
        parsedOutput = JSON.parse(output);
      }
    } catch (error) {
      // If parsing fails, keep original output
      logger.warn({ error }, 'Failed to parse output as JSON');
    }
  }

  // Extract table data from context object if needed
  // If output is an object (not array) and we expect a table, look for common table data keys
  if (typeof parsedOutput === 'object' && parsedOutput !== null && !Array.isArray(parsedOutput) && displayHint?.type === 'table') {
    const outputObj = parsedOutput as Record<string, unknown>;
    const possibleDataKeys = ['finalAnalysisTable', 'finalTableData', 'tableData', 'results', 'data', 'output'];

    for (const key of possibleDataKeys) {
      if (key in outputObj && Array.isArray(outputObj[key])) {
        parsedOutput = outputObj[key];
        break;
      }
    }
  }

  // Priority: 1) displayHint from workflow config, 2) module-based detection, 3) structure-based detection
  const display = displayHint || detectOutputDisplay(modulePath || '', parsedOutput);

  switch (display.type) {
    case 'table':
      return <DataTable data={parsedOutput} config={display.config} onClose={onClose} />;

    case 'image':
      return <ImageDisplay data={output} config={display.config} />;

    case 'images':
      return <ImageGrid data={output} config={display.config} />;

    case 'markdown':
      return <MarkdownDisplay content={output} onClose={onClose} />;

    case 'text':
      return <TextDisplay content={output} onClose={onClose} />;

    case 'list':
      return <ListDisplay data={output} onClose={onClose} />;

    case 'json':
    default:
      return <JSONDisplay data={output} onClose={onClose} />;
  }
}

// Floating action buttons component for all output types
function FloatingActionButtons({
  content,
  filename,
  format,
  onClose
}: {
  content: string;
  filename: string;
  format: 'md' | 'txt' | 'json' | 'csv';
  onClose?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded as ${filename}.${format}`);
  };

  const buttons = (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 9998,
        display: 'flex',
        gap: '8px',
        pointerEvents: 'auto',
        isolation: 'isolate',
        backfaceVisibility: 'hidden',
        transform: 'translateZ(0)',
      }}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <Button
        size="sm"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          handleCopy();
        }}
        className="h-8 gap-2 bg-background shadow-xl border-2 border-primary/20"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          handleDownload();
        }}
        className="h-8 gap-2 bg-background shadow-xl border-2 border-primary/20"
      >
        <Download className="h-3.5 w-3.5" />
        Download
      </Button>
      {onClose && (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="h-8 gap-2 bg-background shadow-xl border-2 border-primary/20"
        >
          <X className="h-3.5 w-3.5" />
          Close
        </Button>
      )}
    </div>
  );

  return mounted ? createPortal(buttons, document.body) : null;
}

function MarkdownDisplay({ content, onClose }: { content: unknown; onClose?: () => void }) {
  const text = String(content);

  return (
    <>
      <FloatingActionButtons content={text} filename="output" format="md" onClose={onClose} />
      <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg border border-border/50 bg-surface/50 p-6 pt-16">
        <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          // Headers
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold mb-4 mt-6 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-semibold mb-3 mt-6 border-b pb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-semibold mb-2 mt-4">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-lg font-semibold mb-2 mt-3">{children}</h4>
          ),
          // Paragraphs
          p: ({ children }) => (
            <p className="mb-4 leading-7">{children}</p>
          ),
          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-7">{children}</li>
          ),
          // Code blocks and inline code
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            return isInline ? (
              <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono text-foreground" {...props}>
                {children}
              </code>
            ) : (
              <code className="block bg-muted/80 p-4 rounded-lg overflow-x-auto text-sm font-mono mb-4" {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="mb-4">{children}</pre>
          ),
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-4 py-2 my-4 bg-muted/30 italic">
              {children}
            </blockquote>
          ),
          // Horizontal rules
          hr: () => (
            <hr className="my-6 border-t-2 border-border" />
          ),
          // Links
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
          // Strong/Bold
          strong: ({ children }) => (
            <strong className="font-bold text-foreground">{children}</strong>
          ),
          // Emphasis/Italic
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),
          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full divide-y divide-border">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/50">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr>{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left text-sm font-semibold">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-sm">{children}</td>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
      </div>
    </>
  );
}

function TextDisplay({ content, onClose }: { content: unknown; onClose?: () => void }) {
  const text = String(content);

  return (
    <>
      <FloatingActionButtons content={text} filename="output" format="txt" onClose={onClose} />
      <div className="rounded-lg border border-border/50 bg-surface/50 p-4 pt-16">
        <div className="text-sm whitespace-pre-wrap break-words">{text}</div>
      </div>
    </>
  );
}

function ListDisplay({ data, onClose }: { data: unknown; onClose?: () => void }) {
  if (!Array.isArray(data)) {
    return <div className="text-sm text-muted-foreground">Invalid list data</div>;
  }

  const text = data.map((item) => String(item)).join('\n');

  return (
    <>
      <FloatingActionButtons content={text} filename="list-output" format="txt" onClose={onClose} />
      <div className="rounded-lg border border-border/50 bg-surface/50 p-4 pt-16">
        <ul className="space-y-2 list-disc list-inside">
          {data.map((item, idx) => (
            <li key={idx} className="text-sm">
              {String(item)}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function JSONDisplay({ data, onClose }: { data: unknown; onClose?: () => void }) {
  // Parse data if it's a string
  let jsonData: unknown = data;
  if (typeof data === 'string') {
    try {
      jsonData = JSON.parse(data);
    } catch {
      jsonData = data;
    }
  }

  // Ensure jsonData is a valid object or array for ReactJson
  const isValidJson = jsonData !== null &&
                      jsonData !== undefined &&
                      typeof jsonData === 'object';

  const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  return (
    <>
      <FloatingActionButtons content={jsonString} filename="output" format="json" onClose={onClose} />
      <div className="rounded-lg border border-border/50 bg-muted/20 p-4 pt-16 overflow-y-auto max-h-[70vh] scrollbar-none">
        {isValidJson ? (
          <ReactJson
            src={jsonData as object}
            theme="monokai"
            iconStyle="circle"
            displayDataTypes={false}
            displayObjectSize={false}
            enableClipboard={true}
            collapsed={2}
            style={{
              backgroundColor: 'transparent',
              fontSize: '0.875rem',
            }}
          />
        ) : (
          <pre className="text-sm font-mono text-foreground whitespace-pre-wrap">
            {jsonString}
          </pre>
        )}
      </div>
    </>
  );
}
