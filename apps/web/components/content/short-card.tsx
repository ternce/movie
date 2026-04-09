'use client';

import { Play, Heart, ChatCircle, ShareNetwork } from '@phosphor-icons/react';
import { forwardRef } from 'react';

<<<<<<< Updated upstream
import { cn, formatNumber } from '@/lib/utils';
=======
import { cn, copyTextToClipboard, formatNumber, formatRelativeTime } from '@/lib/utils';
import { normalizeMediaUrl } from '@/lib/media-url';
import { useStreamUrl } from '@/hooks/use-streaming';
import { useContentComments, useCreateContentComment } from '@/hooks/use-comments';
import { useLikeContent, useUnlikeContent } from '@/hooks/use-likes';
import { useIsAuthenticated, useUser } from '@/stores/auth.store';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/avatar';
>>>>>>> Stashed changes

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
 * Full-screen vertical short card for the Shorts feed
 * Uses native <video> for performance. Only active card plays.
 */
export const ShortCard = forwardRef<HTMLDivElement, ShortCardProps>(
  ({ content, isActive = false, className }, ref) => {
<<<<<<< Updated upstream
=======
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const hlsRef = useRef<Hls | null>(null);
    const { data, isLoading, error } = useStreamUrl(isActive ? content.id : undefined);
    const streamData = (data as any)?.data ?? data;

    const LIKES_STORAGE_KEY = 'mp-liked-content-ids';

    const getStoredLiked = (contentId: string): boolean => {
      if (typeof window === 'undefined') return false;
      try {
        const raw = localStorage.getItem(LIKES_STORAGE_KEY);
        if (!raw) return false;
        const ids = JSON.parse(raw) as unknown;
        if (!Array.isArray(ids)) return false;
        return ids.includes(contentId);
      } catch {
        return false;
      }
    };

    const setStoredLiked = (contentId: string, isLiked: boolean): void => {
      if (typeof window === 'undefined') return;
      try {
        const raw = localStorage.getItem(LIKES_STORAGE_KEY);
        const parsed = raw ? (JSON.parse(raw) as unknown) : [];
        const ids = Array.isArray(parsed) ? (parsed as string[]) : [];
        const next = new Set(ids);
        if (isLiked) next.add(contentId);
        else next.delete(contentId);
        localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
    };

    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(content.likeCount);
    const [isMuted, setIsMuted] = useState(true);
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [commentText, setCommentText] = useState('');

    const user = useUser();
    const isAuthenticated = useIsAuthenticated();
    const commentsQuery = useContentComments(content.id, commentsOpen);
    const createComment = useCreateContentComment(content.id);
    const likeMutation = useLikeContent(content.id);
    const unlikeMutation = useUnlikeContent(content.id);

    useEffect(() => {
      // Reset local state when card changes
      const storedLiked = getStoredLiked(content.id);
      setLiked(storedLiked);

      // For guests we keep local likes as a UI-only overlay.
      // For authenticated users, backend likeCount already reflects the like.
      const base = content.likeCount;
      const nextCount = !isAuthenticated && storedLiked ? base + 1 : base;
      setLikeCount(nextCount);
      setIsMuted(true);
      setCommentsOpen(false);
      setCommentText('');
    }, [content.id, content.likeCount, isAuthenticated]);

    useEffect(() => {
      // When card becomes inactive, ensure it's muted (prevents bleed when scrolling)
      if (!isActive) {
        setIsMuted(true);
        if (videoRef.current) {
          videoRef.current.muted = true;
        }
      }
    }, [isActive]);

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

    const handleToggleLike = async () => {
      if (likeMutation.isPending || unlikeMutation.isPending) return;

      const prevLiked = liked;
      const prevCount = likeCount;
      const nextLiked = !prevLiked;

      // Optimistic UI
      setLiked(nextLiked);
      setLikeCount((c) => (nextLiked ? c + 1 : Math.max(0, c - 1)));

      try {
        // Guests: persist locally only
        if (!isAuthenticated) {
          setStoredLiked(content.id, nextLiked);
          return;
        }

        const res = nextLiked
          ? await likeMutation.mutateAsync()
          : await unlikeMutation.mutateAsync();

        // Persist locally for heart fill across reload
        setStoredLiked(content.id, nextLiked);

        if (typeof res?.likeCount === 'number') setLikeCount(res.likeCount);
      } catch {
        // Rollback (global mutation toast will show error)
        setLiked(prevLiked);
        setLikeCount(prevCount);
      }
    };

    const handleComments = () => {
      setCommentsOpen(true);
    };

    const handleSubmitComment = async () => {
      const text = commentText.trim();
      if (!text) return;

      if (!isAuthenticated) {
        toast.message('Войдите, чтобы оставлять комментарии');
        return;
      }

      try {
        await createComment.mutateAsync({ text });
        setCommentText('');
      } catch {
        // handled by global mutation error toast
      }
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

      const ok = await copyTextToClipboard(url);
      if (ok) toast.success('Ссылка скопирована');
      else toast.error('Не удалось скопировать ссылку');
    };

    const handleToggleMute = () => {
      const el = videoRef.current;
      if (!el) return;
      const nextMuted = !el.muted;
      el.muted = nextMuted;
      if (!nextMuted && el.volume === 0) {
        el.volume = 1;
      }
      setIsMuted(nextMuted);

      // If autoplay was muted and audio is now enabled, keep playback running
      if (!nextMuted) {
        const playPromise = el.play();
        if (playPromise && typeof (playPromise as Promise<void>).catch === 'function') {
          (playPromise as Promise<void>).catch(() => {
            // ignore
          });
        }
      }
    };

>>>>>>> Stashed changes
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
          src={content.videoUrl}
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
