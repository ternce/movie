import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AgeCategory, ContentStatus, ContentType, Prisma } from '@prisma/client';
import { AgeCategory as SharedAgeCategory } from '@movie-platform/shared';

import { PrismaService } from '../../config/prisma.service';
import { CacheService, CACHE_TTL, CACHE_KEYS } from '../../common/cache/cache.service';
import { ContentQueryDto, CreateContentDto, SearchQueryDto, UpdateContentDto } from './dto';

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Get allowed age categories based on user's age category.
   * A user can access content for their age and below.
   */
  private getAllowedAgeCategories(userAgeCategory?: AgeCategory): AgeCategory[] {
    const order: AgeCategory[] = [
      AgeCategory.ZERO_PLUS,
      AgeCategory.SIX_PLUS,
      AgeCategory.TWELVE_PLUS,
      AgeCategory.SIXTEEN_PLUS,
      AgeCategory.EIGHTEEN_PLUS,
    ];

    if (!userAgeCategory) {
      // Unauthenticated users see content up to 16+
      // 18+ requires authenticated age verification
      return [
        AgeCategory.ZERO_PLUS,
        AgeCategory.SIX_PLUS,
        AgeCategory.TWELVE_PLUS,
        AgeCategory.SIXTEEN_PLUS,
      ];
    }

    const index = order.indexOf(userAgeCategory);
    return order.slice(0, index + 1);
  }

  /**
   * Get paginated content list with filters.
   */
  async findAll(query: ContentQueryDto, userAgeCategory?: AgeCategory) {
    const {
      type,
      categoryId,
      genreId,
      tagId,
      search,
      freeOnly,
      page = 1,
      limit = 20,
      sortBy = 'publishedAt',
      sortOrder = 'desc',
    } = query;

    // Build cache key from query params
    const cacheParams = CacheService.createKeyFromParams({
      type, categoryId, genreId, tagId, search, freeOnly,
      page, limit, sortBy, sortOrder, age: userAgeCategory,
    });
    const cacheKey = CACHE_KEYS.content.list(cacheParams);

    return this.cache.getOrSet(cacheKey, async () => {
      const allowedCategories = this.getAllowedAgeCategories(userAgeCategory);

      // Build where clause with type-safe Prisma input
      // Exclude child episodes/lessons — only show root content in listings
      const where: Prisma.ContentWhereInput = {
        status: ContentStatus.PUBLISHED,
        ageCategory: { in: allowedCategories },
        OR: [
          { series: null },                                    // Content with no Series record
          { series: { parentSeriesId: null } },                // Root series only
        ],
        ...(type && { contentType: type }),
        ...(categoryId && { categoryId }),
        ...(genreId && { genres: { some: { genreId } } }),
        ...(tagId && { tags: { some: { tagId } } }),
        ...(freeOnly && { isFree: true }),
        ...(search && {
          AND: [
            {
              OR: [
                { title: { contains: search, mode: 'insensitive' as const } },
                { description: { contains: search, mode: 'insensitive' as const } },
              ],
            },
          ],
        }),
      };

      // Execute count and find in parallel
      const [total, items] = await Promise.all([
        this.prisma.content.count({ where }),
        this.prisma.content.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            thumbnailUrl: true,
            contentType: true,
            ageCategory: true,
            isFree: true,
            individualPrice: true,
            publishedAt: true,
            viewCount: true,
            duration: true,
            series: {
              select: {
                id: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            tags: {
              select: {
                tag: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
            genres: {
              select: {
                genre: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
        }),
      ]);

      // Compute season/episode counts for root series/tutorial items shown in listings.
      // Root content has a Series row with parentSeriesId=null; episodes reference it via parentSeriesId.
      const rootSeriesIds = Array.from(
        new Set(
          items
            .map((item: any) => item.series?.id)
            .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0),
        ),
      );

      const episodeCountBySeriesId = new Map<string, number>();
      const seasonCountBySeriesId = new Map<string, number>();

      if (rootSeriesIds.length > 0) {
        const [episodeCounts, seasonGroups] = await Promise.all([
          this.prisma.series.groupBy({
            by: ['parentSeriesId'],
            where: { parentSeriesId: { in: rootSeriesIds } },
            _count: { _all: true },
          }),
          this.prisma.series.groupBy({
            by: ['parentSeriesId', 'seasonNumber'],
            where: { parentSeriesId: { in: rootSeriesIds } },
          }),
        ]);

        for (const row of episodeCounts) {
          if (row.parentSeriesId) {
            episodeCountBySeriesId.set(row.parentSeriesId, row._count._all);
          }
        }

        for (const row of seasonGroups) {
          if (row.parentSeriesId) {
            seasonCountBySeriesId.set(
              row.parentSeriesId,
              (seasonCountBySeriesId.get(row.parentSeriesId) ?? 0) + 1,
            );
          }
        }
      }

      const totalPages = Math.ceil(total / limit);

      return {
        items: items.map((item: any) => {
          const dto = this.mapContentToDto(item);
          const seriesId = item.series?.id as string | undefined;
          if (!seriesId) return dto;

          return {
            ...dto,
            seasonCount: seasonCountBySeriesId.get(seriesId) ?? 0,
            episodeCount: episodeCountBySeriesId.get(seriesId) ?? 0,
          };
        }),
        meta: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    }, { ttl: CACHE_TTL.DEFAULT });
  }

  /**
   * Get a single content item by slug.
   */
  async findBySlug(slug: string, userAgeCategory?: AgeCategory, userRole?: string) {
    const roleKey = userRole || 'ANON';
    const ageKey = userAgeCategory || 'ANON';
    const cacheKey = CACHE_KEYS.content.detail(`${slug}:${ageKey}:${roleKey}`);

    return this.cache.getOrSet(cacheKey, async () => {
      return this._findBySlugUncached(slug, userAgeCategory, userRole);
    }, { ttl: CACHE_TTL.MEDIUM });
  }

  private isPrivilegedViewer(userRole?: string): boolean {
    return userRole === 'ADMIN' || userRole === 'MODERATOR';
  }

  private async _findBySlugUncached(
    slug: string,
    userAgeCategory?: AgeCategory,
    userRole?: string,
  ) {
    const isPrivileged = this.isPrivilegedViewer(userRole);

    const allowedCategories = isPrivileged
      ? [
          AgeCategory.ZERO_PLUS,
          AgeCategory.SIX_PLUS,
          AgeCategory.TWELVE_PLUS,
          AgeCategory.SIXTEEN_PLUS,
          AgeCategory.EIGHTEEN_PLUS,
        ]
      : this.getAllowedAgeCategories(userAgeCategory);

    // Support both UUID and slug lookup (consistent with streaming endpoint)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

    const content = await this.prisma.content.findFirst({
      where: {
        ...(isUuid ? { id: slug } : { slug }),
        ...(isPrivileged
          ? { status: { not: ContentStatus.ARCHIVED } }
          : { status: ContentStatus.PUBLISHED }),
        ageCategory: { in: allowedCategories },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        genres: {
          include: {
            genre: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!content) {
      if (isUuid) {
        throw new NotFoundException(`Контент с ID "${slug}" не найден`);
      }
      throw new NotFoundException(`Контент с slug "${slug}" не найден`);
    }

    const dto = this.mapContentToDetailDto(content);

    // For SERIES and TUTORIAL types, include season/episode structure
    if (content.contentType === ContentType.SERIES || content.contentType === ContentType.TUTORIAL) {
      const structure = await this._getSeriesStructure(content.id);
      return { ...dto, seasons: structure.seasons };
    }

    return dto;
  }

  /**
   * Get a single content item by ID.
   */
  async findById(id: string, userAgeCategory?: AgeCategory) {
    const allowedCategories = this.getAllowedAgeCategories(userAgeCategory);

    const content = await this.prisma.content.findFirst({
      where: {
        id,
        status: ContentStatus.PUBLISHED,
        ageCategory: { in: allowedCategories },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        genres: {
          include: {
            genre: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!content) {
      throw new NotFoundException(`Контент с ID "${id}" не найден`);
    }

    const dto = this.mapContentToDetailDto(content);

    // For SERIES and TUTORIAL types, include season/episode structure
    if (content.contentType === ContentType.SERIES || content.contentType === ContentType.TUTORIAL) {
      const structure = await this._getSeriesStructure(content.id);
      return { ...dto, seasons: structure.seasons };
    }

    return dto;
  }

  /**
   * Search content using PostgreSQL full-text search or ILIKE fallback.
   */
  async search(query: SearchQueryDto, userAgeCategory?: AgeCategory) {
    const { q, page = 1, limit = 20 } = query;
    const allowedCategories = this.getAllowedAgeCategories(userAgeCategory);

    const where: any = {
      status: ContentStatus.PUBLISHED,
      ageCategory: { in: allowedCategories },
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    };

    const [total, items] = await Promise.all([
      this.prisma.content.count({ where }),
      this.prisma.content.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { viewCount: 'desc' },
          { publishedAt: 'desc' },
        ],
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          tags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          genres: {
            include: {
              genre: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: items.map((item) => this.mapContentToDto(item)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Get all categories as a hierarchical tree.
   */
  async getCategories() {
    return this.cache.getOrSet(CACHE_KEYS.category.tree(), async () => {
      const categories = await this.prisma.category.findMany({
        where: { parentId: null },
        orderBy: { order: 'asc' },
        include: {
          children: {
            orderBy: { order: 'asc' },
            include: {
              children: {
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      });

      return { categories };
    }, { ttl: CACHE_TTL.LONG });
  }

  /**
   * Get all active tags.
   */
  async getTags() {
    return this.prisma.tag.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get all active genres.
   */
  async getGenres() {
    return this.prisma.genre.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Increment view count for content.
   */
  async incrementViewCount(contentId: string) {
    await this.prisma.content.update({
      where: { id: contentId },
      data: { viewCount: { increment: 1 } },
    });
  }

  private readonly AGE_CATEGORY_MAP: Record<AgeCategory, SharedAgeCategory> = {
    [AgeCategory.ZERO_PLUS]: SharedAgeCategory.ZERO_PLUS,
    [AgeCategory.SIX_PLUS]: SharedAgeCategory.SIX_PLUS,
    [AgeCategory.TWELVE_PLUS]: SharedAgeCategory.TWELVE_PLUS,
    [AgeCategory.SIXTEEN_PLUS]: SharedAgeCategory.SIXTEEN_PLUS,
    [AgeCategory.EIGHTEEN_PLUS]: SharedAgeCategory.EIGHTEEN_PLUS,
  };

  /**
   * Map content entity to list DTO.
   */
  private mapContentToDto(content: any) {
    const mappedAgeCategory = this.AGE_CATEGORY_MAP[content.ageCategory as AgeCategory];
    return {
      id: content.id,
      title: content.title,
      slug: content.slug,
      description: content.description,
      contentType: content.contentType,
      ageCategory: mappedAgeCategory ?? (content.ageCategory as unknown as SharedAgeCategory),
      thumbnailUrl: content.thumbnailUrl,
      duration: content.duration,
      isFree: content.isFree,
      individualPrice: content.individualPrice
        ? Number(content.individualPrice)
        : undefined,
      viewCount: content.viewCount,
      publishedAt: content.publishedAt,
      category: content.category,
      tags: content.tags.map((ct: any) => ct.tag),
      genres: content.genres.map((cg: any) => cg.genre),
    };
  }

  /**
   * Map content entity to detail DTO.
   */
  private mapContentToDetailDto(content: any) {
    return {
      ...this.mapContentToDto(content),
      previewUrl: content.previewUrl,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
    };
  }

  /**
   * Get series structure (seasons and episodes) for a content item.
   * Used to provide season/episode information for SERIES and TUTORIAL content types.
   */
  private async _getSeriesStructure(contentId: string) {
    // Get root content with series reference
    const rootContent = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        series: true,
      },
    });

    if (!rootContent || !rootContent.series) {
      // Not a series/tutorial, return empty seasons
      return { seasons: [] };
    }

    // Get all episodes (children of root series)
    const episodes = await this.prisma.series.findMany({
      where: { parentSeriesId: rootContent.series.id },
      include: {
        content: {
          include: {
            videoFiles: {
              select: { encodingStatus: true },
            },
          },
        },
      },
      orderBy: [
        { seasonNumber: 'asc' },
        { episodeNumber: 'asc' },
      ],
    });

    // Group episodes by season number
    const seasonMap = new Map<number, any[]>();

    for (const ep of episodes) {
      const seasonNum = ep.seasonNumber;
      if (!seasonMap.has(seasonNum)) {
        seasonMap.set(seasonNum, []);
      }

      const hasVideo = !!ep.content.edgecenterVideoId || ep.content.videoFiles.length > 0;

      seasonMap.get(seasonNum)!.push({
        id: ep.content.id,
        contentId: ep.content.id,
        title: ep.content.title,
        description: ep.content.description,
        seasonNumber: ep.seasonNumber,
        episodeNumber: ep.episodeNumber,
        hasVideo,
        thumbnailUrl: ep.content.thumbnailUrl ?? undefined,
        duration: ep.content.duration,
        slug: ep.content.slug,
      });
    }

    // Build seasons array
    const seasons: any[] = [];
    const sortedSeasonNums = [...seasonMap.keys()].sort((a, b) => a - b);

    for (const seasonNum of sortedSeasonNums) {
      const label = rootContent.contentType === ContentType.TUTORIAL
        ? `Глава ${seasonNum}`
        : `Сезон ${seasonNum}`;

      seasons.push({
        number: seasonNum,
        title: label,
        episodes: seasonMap.get(seasonNum)!,
      });
    }

    return { seasons };
  }

  // ============================================
  // Admin Methods
  // ============================================

  /**
   * Generate URL-friendly slug from title.
   * Supports Russian characters (Cyrillic).
   */
  private generateSlug(title: string): string {
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\u0400-\u04FF\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return `${slug}-${Date.now().toString(36)}`;
  }

  /**
   * Get all content for admin (includes all statuses).
   */
  async findAllAdmin(query: { status?: string; contentType?: string; search?: string; page: number; limit: number; includeEpisodes?: boolean }) {
    const { status, contentType, search, page, limit, includeEpisodes } = query;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (contentType) {
      where.contentType = contentType;
    }
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }
    // By default, exclude child episodes/lessons from admin listing
    if (!includeEpisodes) {
      where.OR = [
        { series: null },
        { series: { parentSeriesId: null } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.content.count({ where }),
      this.prisma.content.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
          genres: { include: { genre: { select: { id: true, name: true, slug: true } } } },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: items.map((item) => ({
        ...this.mapContentToDto(item),
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Get content by ID for admin (includes all statuses).
   */
  async findByIdAdmin(id: string) {
    const content = await this.prisma.content.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
        genres: { include: { genre: { select: { id: true, name: true, slug: true } } } },
        videoFiles: true,
      },
    });

    if (!content) {
      throw new NotFoundException(`Контент с ID "${id}" не найден`);
    }

    return {
      ...this.mapContentToDetailDto(content),
      status: content.status,
      edgecenterVideoId: content.edgecenterVideoId || undefined,
      edgecenterClientId: content.edgecenterClientId || undefined,
      videoFiles: content.videoFiles,
    };
  }

  /**
   * Create new content (Admin only).
   */
  async create(dto: CreateContentDto) {
    // Resolve categoryId — required by DB schema, use first category as fallback for SHORT
    let categoryId = dto.categoryId;
    if (categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!category) {
        throw new NotFoundException(`Категория с ID "${categoryId}" не найдена`);
      }
    } else {
      const fallback = await this.prisma.category.findFirst({ select: { id: true } });
      if (!fallback) {
        throw new NotFoundException('Нет доступных категорий');
      }
      categoryId = fallback.id;
    }

    // Generate unique slug
    const slug = this.generateSlug(dto.title);

    // Only allow DRAFT or PUBLISHED on creation
    const finalStatus =
      dto.status === ContentStatus.DRAFT || dto.status === ContentStatus.PUBLISHED
        ? dto.status
        : ContentStatus.DRAFT;

    // Validate: cannot publish content on creation without videos
    if (finalStatus === ContentStatus.PUBLISHED) {
      throw new BadRequestException(
        `Новый контент не может быть опубликован без видео. ` +
        `Создайте контент как DRAFT, загрузите видео, а затем опубликуйте.`,
      );
    }

    // Create content with relations
    const content = await this.prisma.content.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        contentType: dto.contentType,
        categoryId,
        ageCategory: dto.ageCategory,
        thumbnailUrl: dto.thumbnailUrl,
        previewUrl: dto.previewUrl,
        duration: dto.duration ?? 0,
        isFree: dto.isFree ?? false,
        individualPrice: dto.individualPrice,
        status: finalStatus,
        tags: dto.tagIds?.length
          ? {
              create: dto.tagIds.map((tagId) => ({ tagId })),
            }
          : undefined,
        genres: dto.genreIds?.length
          ? {
              create: dto.genreIds.map((genreId) => ({ genreId })),
            }
          : undefined,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
        genres: { include: { genre: { select: { id: true, name: true, slug: true } } } },
      },
    });

    // Invalidate content caches
    await this.cache.invalidatePattern('content:*');

    return {
      ...this.mapContentToDetailDto(content),
      status: content.status,
      edgecenterVideoId: content.edgecenterVideoId || undefined,
      edgecenterClientId: content.edgecenterClientId || undefined,
    };
  }

  /**
   * Update existing content (Admin only).
   */
  async update(id: string, dto: UpdateContentDto) {
    // Verify content exists
    const existing = await this.prisma.content.findUnique({
      where: { id },
      include: { tags: true, genres: true },
    });
    if (!existing) {
      throw new NotFoundException(`Контент с ID "${id}" не найден`);
    }

    // If category is being updated, verify it exists
    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException(`Категория с ID "${dto.categoryId}" не найдена`);
      }
    }

    // Validate publishing requirements
    if (dto.status === ContentStatus.PUBLISHED && existing.status !== ContentStatus.PUBLISHED) {
      // Publishing for the first time — verify content requirements
      const videoFiles = await this.prisma.videoFile.findMany({
        where: { contentId: id },
      });

      // Check if content has videos (either local VideoFiles or EdgeCenter reference)
      const hasLocalVideos = videoFiles.length > 0;
      const hasEdgecenterVideo = !!existing.edgecenterVideoId;
      const hasVideos = hasLocalVideos || hasEdgecenterVideo;
      
      if (!hasVideos) {
        // For series/tutorials, also check if any episodes have videos
        if (existing.contentType === ContentType.SERIES || existing.contentType === ContentType.TUTORIAL) {
          const rootSeries = await this.prisma.series.findUnique({
            where: { contentId: id },
            select: { id: true },
          });

          if (!rootSeries) {
            throw new BadRequestException(
              `Невозможно опубликовать ${existing.contentType === ContentType.SERIES ? 'сериал' : 'курс'} без видео. ` +
                `Структура эпизодов не найдена — создайте хотя бы один эпизод и загрузите видео.`,
            );
          }

          const episodesWithContent = await this.prisma.content.count({
            where: {
              series: {
                parentSeriesId: rootSeries.id,
              },
              OR: [
                { videoFiles: { some: {} } },
                { edgecenterVideoId: { not: null } },
              ],
            },
          });

          if (episodesWithContent === 0) {
            throw new BadRequestException(
              `Невозможно опубликовать ${existing.contentType === ContentType.SERIES ? 'сериал' : 'курс'} без видео. ` +
              `Загрузите видео для как минимум одного эпизода.`,
            );
          }
        } else {
          throw new BadRequestException(
            `Новый контент не может быть опубликован без видео. Создайте контент как DRAFT, загрузите видео, а затем опубликуйте.`,
          );
        }
      }
    }

    // Build update data
    const updateData: any = {
      ...(dto.title && { title: dto.title }),
      ...(dto.description && { description: dto.description }),
      ...(dto.contentType && { contentType: dto.contentType }),
      ...(dto.categoryId && { categoryId: dto.categoryId }),
      ...(dto.ageCategory && { ageCategory: dto.ageCategory }),
      ...(dto.thumbnailUrl !== undefined && { thumbnailUrl: dto.thumbnailUrl }),
      ...(dto.previewUrl !== undefined && { previewUrl: dto.previewUrl }),
      ...(dto.duration !== undefined && { duration: dto.duration }),
      ...(dto.isFree !== undefined && { isFree: dto.isFree }),
      ...(dto.individualPrice !== undefined && { individualPrice: dto.individualPrice }),
      ...(dto.status && { status: dto.status }),
      ...(dto.status === ContentStatus.PUBLISHED &&
        !existing.publishedAt && { publishedAt: new Date() }),
    };

    // Use transaction for tag/genre updates
    const content = await this.prisma.$transaction(async (tx) => {
      // Update tags if provided
      if (dto.tagIds !== undefined) {
        await tx.contentTag.deleteMany({ where: { contentId: id } });
        if (dto.tagIds.length > 0) {
          await tx.contentTag.createMany({
            data: dto.tagIds.map((tagId) => ({ contentId: id, tagId })),
          });
        }
      }

      // Update genres if provided
      if (dto.genreIds !== undefined) {
        await tx.contentGenre.deleteMany({ where: { contentId: id } });
        if (dto.genreIds.length > 0) {
          await tx.contentGenre.createMany({
            data: dto.genreIds.map((genreId) => ({ contentId: id, genreId })),
          });
        }
      }

      // Update content
      return tx.content.update({
        where: { id },
        data: updateData,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
          genres: { include: { genre: { select: { id: true, name: true, slug: true } } } },
        },
      });
    });

    // Invalidate content caches
    await this.cache.invalidatePattern('content:*');

    return {
      ...this.mapContentToDetailDto(content),
      status: content.status,
      edgecenterVideoId: content.edgecenterVideoId || undefined,
      edgecenterClientId: content.edgecenterClientId || undefined,
    };
  }

  /**
   * Soft delete content (Admin only).
   * Sets status to ARCHIVED instead of deleting.
   */
  async delete(id: string) {
    const content = await this.prisma.content.findUnique({
      where: { id },
    });
    if (!content) {
      throw new NotFoundException(`Контент с ID "${id}" не найден`);
    }

    await this.prisma.content.update({
      where: { id },
      data: { status: ContentStatus.ARCHIVED },
    });

    // Invalidate content caches
    await this.cache.invalidatePattern('content:*');

    return { success: true, message: 'Content archived successfully' };
  }
}
