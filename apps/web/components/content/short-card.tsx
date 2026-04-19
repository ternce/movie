'use client';

import { ChatCircle, Heart, Play, ShareNetwork } from '@phosphor-icons/react';
import { forwardRef, useEffect, useRef } from 'react';

import { cn, formatNumber } from '@/lib/utils';

export interface ShortContent {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  creator: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
}

interface ShortCardProps {
  content: ShortContent;
  isActive?: boolean;
  className?: string;
}

/**
 * Full-screen vertical short card for the Shorts feed.
 * Uses native <video> for performance. Only active card plays.
 */
export const ShortCard = forwardRef<HTMLDivElement, ShortCardProps>(
  ({ content, isActive = false, className }, ref) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
      const el = videoRef.current;
      if (!el) return;

      if (isActive) {
        const playPromise = el.play();
        if (playPromise && typeof (playPromise as Promise<void>).catch === 'function') {
          (playPromise as Promise<void>).catch(() => undefined);
        }
        return;
      }

      try {
        el.pause();
      } catch {
        // ignore
      }
    }, [isActive, content.videoUrl]);

    return (
      <div
        ref={ref}
        data-short-id={content.id}
        className={cn(
          'relative w-full h-full snap-start snap-always flex items-center justify-center bg-black',
          className
        )}
      >
        <video
          ref={videoRef}
          src={content.videoUrl}
          poster={content.thumbnailUrl}
          loop
          muted
          playsInline
          autoPlay={isActive}
          className="absolute inset-0 w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <Play weight="fill" className="w-8 h-8 fill-white text-white" />
            </div>
          </div>
        )}

        <div className="absolute bottom-10 md:bottom-6 left-4 right-[4.5rem] z-10">
          <h3 className="text-white font-semibold text-lg leading-tight mb-1 line-clamp-2">
            {content.title}
          </h3>
          <p className="text-white/70 text-sm">@{content.creator}</p>
        </div>

        <div className="absolute right-3 bottom-24 md:bottom-20 z-10 flex flex-col items-center gap-5">
          <button
            type="button"
            className="flex flex-col items-center gap-1 group"
            aria-label="Нравится"
          >
            <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs text-white/80">{formatNumber(content.likeCount)}</span>
          </button>

          <button
            type="button"
            className="flex flex-col items-center gap-1 group"
            aria-label="Комментарии"
          >
            <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <ChatCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs text-white/80">{formatNumber(content.commentCount)}</span>
          </button>

          <button
            type="button"
            className="flex flex-col items-center gap-1 group"
            aria-label="Поделиться"
          >
            <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <ShareNetwork className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs text-white/80">{formatNumber(content.shareCount)}</span>
          </button>
        </div>
      </div>
    );
  }
);

ShortCard.displayName = 'ShortCard';
