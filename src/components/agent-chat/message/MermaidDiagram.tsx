import React, { useLayoutEffect, useRef, useState, useEffect } from 'react';
import type Mermaid from 'mermaid';

let mermaidInstance: typeof Mermaid | null = null;
let mermaidInitialized = false;

interface MermaidDiagramProps {
  chart: string;
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  const renderedChartRef = useRef<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Load mermaid library dynamically
  useEffect(() => {
    if (!mermaidInstance) {
      import('mermaid').then((module) => {
        mermaidInstance = module.default;
        if (!mermaidInitialized) {
          mermaidInstance.initialize({
            startOnLoad: false,
            theme: 'dark',
            themeVariables: {
              primaryColor: '#3b82f6',
              primaryTextColor: '#fafafa',
              primaryBorderColor: 'rgba(59, 130, 246, 0.3)',
              lineColor: 'rgba(59, 130, 246, 0.5)',
              secondaryColor: 'rgba(59, 130, 246, 0.1)',
              background: 'transparent',
              mainBkg: 'rgba(59, 130, 246, 0.1)',
              secondBkg: 'rgba(59, 130, 246, 0.05)',
              fontFamily: 'Inter, system-ui, sans-serif',
            },
            flowchart: {
              htmlLabels: true,
              curve: 'basis',
            },
            securityLevel: 'loose',
          });
          mermaidInitialized = true;
        }
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  useLayoutEffect(() => {
    // Wait for mermaid to load
    if (!mermaidInstance || isLoading) return;

    // Only render if chart content changed
    if (renderedChartRef.current === chart) return;

    const timeoutId = setTimeout(async () => {
      if (ref.current && renderedChartRef.current !== chart && mermaidInstance) {
        try {
          const id = `mermaid-${Date.now()}-${Math.random().toString(36).substring(2)}`;
          const { svg } = await mermaidInstance.render(id, chart);
          ref.current.innerHTML = svg;
          renderedChartRef.current = chart;
        } catch {
          if (ref.current) {
            ref.current.innerHTML = `<code class="text-sm text-muted-foreground">${chart}</code>`;
            renderedChartRef.current = chart;
          }
        }
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [chart, isLoading]);

  if (isLoading) {
    return (
      <div
        className="my-3 p-4 border border-border rounded-lg bg-black/20 overflow-x-auto flex items-center justify-center"
        style={{ minHeight: '100px' }}
      >
        <div className="text-sm text-muted-foreground animate-pulse">Loading diagram...</div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="my-3 p-4 border border-border rounded-lg bg-black/20 overflow-x-auto"
      style={{ minHeight: '100px' }}
    />
  );
}
