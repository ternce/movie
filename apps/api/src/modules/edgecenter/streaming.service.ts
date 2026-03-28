import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

import { PrismaService } from '../../config/prisma.service';
import { VideoQuality } from '@movie-platform/shared';
import { StreamUrlResponseDto, ContentAccessResultDto } from './dto';
import { EdgeCenterService } from './edgecenter.service';
import { StorageService } from '../storage/storage.service';

interface ContentAccessContext {
  userId?: string;
  userRole?: string;
  userSubscriptionTier?: string;
}

@Injectable()
export class StreamingService {
  private readonly cdnHostname: string;
  private readonly signedUrlExpiryHours: number;
  private readonly edgecenterCdnSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly edgecenterService: EdgeCenterService,
    private readonly storageService: StorageService,
  ) {
    this.cdnHostname = this.configService.get<string>('EDGECENTER_CDN_HOSTNAME', '');
    this.signedUrlExpiryHours = this.configService.get<number>('SIGNED_URL_EXPIRY_HOURS', 4);
    this.edgecenterCdnSecret = this.configService.get<string>('EDGECENTER_CDN_SECRET', '');
  }

  /**
   * Get streaming URL for content
   * Supports local (MinIO) and EdgeCenter video sources
   */
  async getStreamUrl(
    contentId: string,
    context?: ContentAccessContext,
  ): Promise<StreamUrlResponseDto> {
    // Get content with video files — support both UUID and slug lookup
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contentId);
    const content = await this.prisma.content.findUnique({
      where: isUuid ? { id: contentId } : { slug: contentId },
      include: {
        videoFiles: {
          where: { encodingStatus: 'COMPLETED' },
          orderBy: { quality: 'desc' },
        },
      },
    });

    if (!content) {
      throw new NotFoundException(`Контент с ID ${contentId} не найден`);
    }

    // Check if any video exists (local or EdgeCenter)
    if (!content.edgecenterVideoId && content.videoFiles.length === 0) {
      throw new NotFoundException(`У контента ${contentId} нет видео`);
    }

    // Verify access
    const accessResult = await this.verifyContentAccess(content, context);
    if (!accessResult.hasAccess) {
      throw new ForbiddenException(accessResult.reason || 'Доступ запрещён');
    }

    // Get available qualities from video files
    const availableQualities = this.mapDbQualitiesToEnum(
      content.videoFiles.map((vf) => vf.quality),
    );

    // Determine max quality based on access type
    const maxQuality = this.getMaxQualityForAccess(
      availableQualities,
      accessResult.accessType,
    );

    // Set expiry time (for client-side cache management)
    const expiryTimestamp = Math.floor(Date.now() / 1000) + this.signedUrlExpiryHours * 3600;

    // LOCAL VIDEO: Serve HLS from MinIO
    if (content.edgecenterClientId === 'local') {
      const streamUrl = this.storageService.getPublicUrl(
        'videos',
        `${content.id}/master.m3u8`,
      );

      return {
        streamUrl,
        expiresAt: new Date(expiryTimestamp * 1000).toISOString(),
        maxQuality,
        availableQualities,
        thumbnailUrls: content.thumbnailUrl ? [content.thumbnailUrl] : undefined,
        duration: content.duration,
        title: content.title,
        description: content.description,
        contentType: content.contentType,
      };
    }

    // EDGECENTER VIDEO: Fetch from CDN API
    if (!content.edgecenterVideoId) {
      throw new NotFoundException(`У контента ${contentId} нет видео`);
    }

    const ecVideo = await this.edgecenterService.getVideo(content.edgecenterVideoId);

    if (!ecVideo.hls_url) {
      throw new NotFoundException(`Видео ${content.edgecenterVideoId} не готово для трансляции`);
    }

    const streamUrl = this.generateSignedHlsUrl(ecVideo.hls_url, this.signedUrlExpiryHours);
    const thumbnailUrls = this.edgecenterService.getThumbnailUrls(ecVideo);

    return {
      streamUrl,
      expiresAt: new Date(expiryTimestamp * 1000).toISOString(),
      maxQuality,
      availableQualities,
      thumbnailUrls: thumbnailUrls.length > 0 ? thumbnailUrls : undefined,
      duration: content.duration,
      title: content.title,
      description: content.description,
      contentType: content.contentType,
    };
  }

  /**
   * Verify user has access to content
   */
  async verifyContentAccess(
    content: {
      id: string;
      isFree: boolean;
      individualPrice: any;
      status: string;
    },
    context?: ContentAccessContext,
  ): Promise<ContentAccessResultDto> {
    // Admin/moderator always has access
    if (context?.userRole === 'ADMIN' || context?.userRole === 'MODERATOR') {
      return { hasAccess: true, accessType: 'admin' };
    }

    // Check if content is published (unless admin)
    if (content.status !== 'PUBLISHED') {
      return { hasAccess: false, reason: 'Content is not available' };
    }

    // Free content is accessible to everyone
    if (content.isFree) {
      return { hasAccess: true, accessType: 'free' };
    }

    // For premium content, user must be authenticated
    if (!context?.userId) {
      return { hasAccess: false, reason: 'Authentication required for premium content' };
    }

    // Check if user has an active subscription that includes this content
    const hasSubscriptionAccess = await this.checkSubscriptionAccess(
      context.userId,
      content.id,
    );
    if (hasSubscriptionAccess) {
      return { hasAccess: true, accessType: 'subscription' };
    }

    // Check if user has purchased this content individually
    const hasPurchaseAccess = await this.checkPurchaseAccess(context.userId, content.id);
    if (hasPurchaseAccess) {
      return { hasAccess: true, accessType: 'purchase' };
    }

    // No access
    return {
      hasAccess: false,
      reason: 'Premium subscription or individual purchase required',
    };
  }

  /**
   * Check if user has subscription access to content
   */
  private async checkSubscriptionAccess(
    userId: string,
    contentId: string,
  ): Promise<boolean> {
    // Check for active subscription that includes this content via SubscriptionAccess
    const subscriptionAccess = await this.prisma.subscriptionAccess.findFirst({
      where: {
        contentId,
        subscription: {
          userId,
          status: 'ACTIVE',
          expiresAt: { gt: new Date() },
        },
      },
    });

    if (subscriptionAccess) {
      return true;
    }

    // Also check if user has a subscription plan that directly references this content
    const directSubscription = await this.prisma.userSubscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
        plan: {
          contentId,
        },
      },
    });

    return !!directSubscription;
  }

  /**
   * Check if user has purchased this content individually
   */
  private async checkPurchaseAccess(
    userId: string,
    contentId: string,
  ): Promise<boolean> {
    // This is already covered by checkSubscriptionAccess with plan.contentId
    // Keep this method for future individual purchase implementation
    void userId;
    void contentId;
    return false;
  }

  /**
   * Get max quality based on access type
   */
  private getMaxQualityForAccess(
    availableQualities: VideoQuality[],
    accessType?: 'free' | 'subscription' | 'purchase' | 'admin',
  ): VideoQuality {
    const qualityPriority = [
      VideoQuality.Q_4K,
      VideoQuality.Q_1080P,
      VideoQuality.Q_720P,
      VideoQuality.Q_480P,
      VideoQuality.Q_240P,
    ];

    // Find the highest available quality
    let maxQuality = VideoQuality.Q_240P;
    for (const quality of qualityPriority) {
      if (availableQualities.includes(quality)) {
        maxQuality = quality;
        break;
      }
    }

    // Limit quality for free content
    if (accessType === 'free') {
      const freeMaxIndex = qualityPriority.indexOf(VideoQuality.Q_720P);
      const currentIndex = qualityPriority.indexOf(maxQuality);
      if (currentIndex < freeMaxIndex) {
        maxQuality = VideoQuality.Q_720P;
      }
    }

    return maxQuality;
  }

  /**
   * Map database quality enum to VideoQuality
   */
  private mapDbQualitiesToEnum(dbQualities: string[]): VideoQuality[] {
    const mapping: Record<string, VideoQuality> = {
      Q_240P: VideoQuality.Q_240P,
      Q_480P: VideoQuality.Q_480P,
      Q_720P: VideoQuality.Q_720P,
      Q_1080P: VideoQuality.Q_1080P,
      Q_4K: VideoQuality.Q_4K,
    };

    return dbQualities
      .filter((q) => q in mapping)
      .map((q) => mapping[q]);
  }

  /**
   * Generate a Gcore Secure Token signed HLS URL
   * Uses MD5-based signature: md5(base64url({expires}{path} {secret}))
   * If no CDN secret is configured, returns the raw URL unchanged.
   */
  private generateSignedHlsUrl(rawUrl: string, expiryHours: number): string {
    if (!this.edgecenterCdnSecret || !rawUrl) {
      return rawUrl;
    }

    try {
      const url = new URL(rawUrl);
      const pathname = url.pathname;
      const expires = Math.floor(Date.now() / 1000) + expiryHours * 3600;

      // Gcore secure token: md5({expires}{path} {secret}) → base64url
      const signInput = `${expires}${pathname} ${this.edgecenterCdnSecret}`;
      const md5Hash = createHash('md5').update(signInput).digest('base64url');

      url.searchParams.set('md5', md5Hash);
      url.searchParams.set('expires', String(expires));

      return url.toString();
    } catch {
      // If URL parsing fails, return raw URL
      return rawUrl;
    }
  }

  /**
   * Get direct MP4 URL for a specific quality (if available)
   */
  getDirectUrl(videoId: string, quality: VideoQuality): string {
    // EdgeCenter may provide direct download URLs through the video API
    // For now, return empty - implement based on EdgeCenter API response
    return `https://${this.cdnHostname}/videos/${videoId}/${quality}.mp4`;
  }
}
