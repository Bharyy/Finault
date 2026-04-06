import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface VanishingInputProps {
  placeholders: string[];
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  className?: string;
  interval?: number;
}

export function VanishingInput({
  placeholders,
  value,
  onChange,
  onSubmit,
  className,
  interval = 3000,
}: VanishingInputProps) {
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length);
    }, interval);
    return () => clearInterval(timer);
  }, [placeholders.length, interval]);

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        'relative flex h-12 w-full items-center overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-colors focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary',
        className
      )}
    >
      <input
        ref={inputRef}
        value={value}
        onChange={onChange}
        className="relative z-10 h-full w-full bg-transparent px-4 text-sm text-text outline-none placeholder-transparent"
      />
      <AnimatePresence mode="wait">
        {!value && (
          <motion.span
            key={currentPlaceholder}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 0.5 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="pointer-events-none absolute left-4 text-sm text-text-muted"
          >
            {placeholders[currentPlaceholder]}
          </motion.span>
        )}
      </AnimatePresence>
    </form>
  );
}
