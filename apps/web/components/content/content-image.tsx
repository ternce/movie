'use client';

import { FilmStrip } from '@phosphor-icons/react';
import Image, { type ImageProps } from 'next/image';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

interface ContentImageProps extends Omit<ImageProps, 'onError'> {
  fallbackIcon?: React.ReactNode;
  fallbackClassName?: string;
}

/**
 * Image wrapper with graceful error fallback.
 * When src is falsy or the image fails to load, renders
 * a placeholder icon instead of a broken-image icon.
 */
export function ContentImage({
  src,
  fallbackIcon,
  fallbackClassName,
  className,
  alt,
  ...props
}: ContentImageProps) {
  const [hasError, setHasError] = useState(false);

  // Reset error state when src changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div
        className={cn(
          'w-full h-full bg-mp-surface-elevated flex items-center justify-center',
          fallbackClassName,
        )}
      >
        {fallbackIcon ?? (
          <FilmStrip className="w-12 h-12 text-mp-text-disabled" />
        )}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      {...props}
    />
  );
}
