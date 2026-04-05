'use client';

import { Play, Heart, ChatCircle, ShareNetwork } from '@phosphor-icons/react';
import Hls from 'hls.js';
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { cn, formatNumber } from '@/lib/utils';
import { useStreamUrl } from '@/hooks/use-streaming';

export interface ShortContent {
  id: string;
  title: string;
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
 * Full-screen vertical short card for the Shorts feed
 * Uses native <video> for performance. Only active card plays.
 */
export const ShortCard = forwardRef<HTMLDivElement, ShortCardProps>(
  ({ content, isActive = false, className }, ref) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const hlsRef = useRef<Hls | null>(null);
    const { data, isLoading, error } = useStreamUrl(isActive ? content.id : undefined);
    const streamData = (data as any)?.data ?? data;

    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(content.likeCount);

    useEffect(() => {
      // Reset local state when card changes
      setLiked(false);
      setLikeCount(content.likeCount);
    }, [content.id, content.likeCount]);

    const videoSrc = useMemo(() => {
      if (!isActive) return undefined;
      return streamData?.streamUrl as string | undefined;
    }, [isActive, streamData?.streamUrl]);

    useEffect(() => {
      const el = videoRef.current;
      if (!el) return;

      // Always clean up previous HLS instance before switching cards/URLs
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (!isActive || !videoSrc) {
        try {
          el.pause();
          el.removeAttribute('src');
          el.load();
          el.currentTime = 0;
        } catch {
          // ignore
        }
        return;
      }

      const isHls = /\.m3u8(\?|$)/i.test(videoSrc);

      // Chrome/Firefox: native <video> does not play HLS, so we must use hls.js
      if (isHls && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 30,
          maxBufferLength: 20,
          startLevel: -1,
          capLevelToPlayerSize: true,
        });

        hlsRef.current = hls;
        hls.loadSource(videoSrc);
        hls.attachMedia(el);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const playPromise = el.play();
          if (playPromise && typeof (playPromise as Promise<void>).catch === 'function') {
            (playPromise as Promise<void>).catch(() => {
              // Autoplay can be blocked; user can tap the video.
            });
          }
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            try {
              hls.destroy();
              hlsRef.current = null;
            } catch {
              // ignore
            }
          }
        });

        return () => {
          if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
          }
        };
      }

      // Safari (native HLS) or non-HLS URL
      try {
        el.src = videoSrc;
        const playPromise = el.play();
        if (playPromise && typeof (playPromise as Promise<void>).catch === 'function') {
          (playPromise as Promise<void>).catch(() => {
            // ignore
          });
        }
      } catch {
        // ignore
      }
    }, [isActive, videoSrc]);

    const handleToggleLike = () => {
      setLiked((prev) => {
        const next = !prev;
        setLikeCount((c) => (next ? c + 1 : Math.max(0, c - 1)));
        return next;
      });
    };

    const handleComments = () => {
      toast.message('Комментарии будут доступны позже');
    };

    const handleShare = async () => {
      const url = typeof window !== 'undefined' ? `${window.location.origin}/watch/${content.id}` : '';
      try {
        if (typeof navigator !== 'undefined' && 'share' in navigator) {
          await (navigator as any).share({ title: content.title, url });
          return;
        }
      } catch {
        // fall back to clipboard
      }
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Ссылка скопирована');
      } catch {
        toast.error('Не удалось скопировать ссылку');
      }
    };

    return (
      <div
        ref={ref}
        data-short-id={content.id}
        className={cn(
          'relative w-full h-full snap-start snap-always flex items-center justify-center bg-black',
          className
        )}
      >
        {/* Video element */}
        <video
          ref={videoRef}
          poster={content.thumbnailUrl}
          loop
          muted
          playsInline
          autoPlay={isActive}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

        {/* Bottom info */}
        <div className="absolute bottom-10 md:bottom-6 left-4 right-[4.5rem] z-10">
          <h3 className="text-white font-semibold text-lg leading-tight mb-1 line-clamp-2">
            {content.title}
          </h3>
          <p className="text-white/70 text-sm">
            @{content.creator}
          </p>
        </div>

        {/* Side action bar */}
        <div className="absolute right-3 bottom-24 md:bottom-20 z-10 flex flex-col items-center gap-5">
          <button
            type="button"
            className="flex flex-col items-center gap-1 group"
            aria-label="Нравится"
            onClick={handleToggleLike}
          >
            <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <Heart className={cn('w-5 h-5 text-white', liked && 'fill-current')} />
            </div>
            <span className="text-xs text-white/80">{formatNumber(likeCount)}</span>
          </button>

          <button
            type="button"
            className="flex flex-col items-center gap-1 group"
            aria-label="Комментарии"
            onClick={handleComments}
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
            onClick={handleShare}
          >
            <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <ShareNetwork className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs text-white/80">{formatNumber(content.shareCount)}</span>
          </button>
        </div>

        {/* Stream state indicator for active card */}
        {isActive && (isLoading || error || !videoSrc) && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm text-white/90 text-sm">
              Видео готовится…
            </div>
          </div>
        )}

        {/* Center play indicator (shown when paused) */}
        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-8 h-8 text-white ml-1" weight="fill" />
            </div>
          </div>
        )}
      </div>
    );
  }
);
ShortCard.displayName = 'ShortCard';
