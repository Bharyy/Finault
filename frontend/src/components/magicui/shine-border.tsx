import { cn } from '@/lib/utils';

interface ShineBorderProps {
  shineColor?: string[];
  duration?: number;
  className?: string;
}

export function ShineBorder({ shineColor = ['#A07CFE', '#FE8FB5', '#FFBE7B'], duration = 8, className }: ShineBorderProps) {
  const gradient = `linear-gradient(135deg, ${shineColor.join(', ')})`;

  return (
    <div
      className={cn('pointer-events-none absolute inset-0 rounded-[inherit]', className)}
      style={{
        padding: '1.5px',
        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        maskComposite: 'exclude',
        WebkitMaskComposite: 'xor',
      }}
    >
      <div
        className="absolute inset-[-200%] rounded-[inherit]"
        style={{
          background: gradient,
          animation: `shine-rotate ${duration}s linear infinite`,
        }}
      />
      <style>{`
        @keyframes shine-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
