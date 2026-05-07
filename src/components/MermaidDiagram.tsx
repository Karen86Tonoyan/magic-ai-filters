import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'strict',
  fontFamily: 'JetBrains Mono, monospace',
});

interface MermaidDiagramProps {
  chart: string;
  id?: string;
}

export function MermaidDiagram({ chart, id }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const diagramId = id ?? `mermaid-${Math.random().toString(36).slice(2, 10)}`;

  useEffect(() => {
    let cancelled = false;
    setError(null);
    if (!chart || !ref.current) return;
    mermaid
      .render(diagramId, chart)
      .then(({ svg }) => {
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Render error');
      });
    return () => {
      cancelled = true;
    };
  }, [chart, diagramId]);

  if (error) {
    return (
      <div className="p-3 rounded border border-destructive/30 bg-destructive/5 text-xs font-mono text-destructive">
        Mermaid render failed: {error}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="w-full overflow-x-auto rounded-lg border border-border bg-card/40 p-4 [&_svg]:max-w-full [&_svg]:h-auto"
    />
  );
}
