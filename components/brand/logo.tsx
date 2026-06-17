import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Sarion brand mark. Uses the hexagonal "S" icon from /public.
 * `wordmark` appends the Sarion wordmark; `glyphOnly` (collapsed rail) hides it.
 */
export function Logo({
  size = 28,
  wordmark = true,
  className,
}: {
  size?: number;
  wordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <Image
        src="/SARION-ICON.png"
        alt="Sarion"
        width={size}
        height={size}
        priority
        className="select-none"
      />
      {wordmark && (
        <span className="flex flex-col leading-none">
          <span className="text-[15px] font-semibold tracking-tight text-text">
            Sarion<span className="font-medium text-text-muted"> Team OS</span>
          </span>
        </span>
      )}
    </span>
  );
}
