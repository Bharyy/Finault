import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface InteractiveGridPatternProps {
  width?: number;
  height?: number;
  squares?: [number, number][];
  className?: string;
  squaresClassName?: string;
}

export function InteractiveGridPattern({
  width = 40,
  height = 40,
  className,
  squaresClassName,
}: InteractiveGridPatternProps) {
  const id = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [activeCells, setActiveCells] = useState<Set<string>>(new Set());

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / width);
      const y = Math.floor((e.clientY - rect.top) / height);
      const key = `${x}-${y}`;
      setHoveredCell(key);
      setActiveCells((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
    },
    [width, height]
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener('mousemove', handleMouseMove);
    return () => svg.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCells((prev) => {
        if (prev.size === 0) return prev;
        const next = new Set(prev);
        const arr = Array.from(next);
        if (arr.length > 0) next.delete(arr[0]);
        return next;
      });
    }, 300);
    return () => clearInterval(interval);
  }, []);

  const cols = 40;
  const rows = 25;

  return (
    <svg
      ref={svgRef}
      className={cn('absolute inset-0 h-full w-full', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id={id} width={width} height={height} patternUnits="userSpaceOnUse">
          <path
            d={`M ${width} 0 L 0 0 0 ${height}`}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.07"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      {Array.from(activeCells).map((key) => {
        const [x, y] = key.split('-').map(Number);
        const isHovered = key === hoveredCell;
        return (
          <rect
            key={key}
            x={x * width}
            y={y * height}
            width={width}
            height={height}
            className={cn(
              'fill-primary/10 transition-all duration-500',
              isHovered && 'fill-primary/20',
              squaresClassName
            )}
            strokeWidth="1"
            stroke="currentColor"
            strokeOpacity="0.05"
          />
        );
      })}
    </svg>
  );
}
