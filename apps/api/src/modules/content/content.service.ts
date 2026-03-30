import { Injectable, NotFoundException } from '@nestjs/common';
import { AgeCategory, ContentStatus, Prisma } from '@prisma/client';

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
    }, { ttl: CACHE_TTL.DEFAULT });
  }

  /**
   * Get a single content item by slug.
   */
  async findBySlug(slug: string, userAgeCategory?: AgeCategory) {
    const cacheKey = CACHE_KEYS.content.detail(`${slug}:${userAgeCategory || 'ZERO_PLUS'}`);

    return this.cache.getOrSet(cacheKey, async () => {
      return this._findBySlugUncached(slug, userAgeCategory);
    }, { ttl: CACHE_TTL.MEDIUM });
  }

  private async _findBySlugUncached(slug: string, userAgeCategory?: AgeCategory) {
    const allowedCategories = this.getAllowedAgeCategories(userAgeCategory);

    // Support both UUID and slug lookup (consistent with streaming endpoint)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

    const content = await this.prisma.content.findFirst({
      where: {
        ...(isUuid ? { id: slug } : { slug }),
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
      throw new NotFoundException(`Контент с slug "${slug}" не найден`);
    }

    return this.mapContentToDetailDto(content);
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

    return this.mapContentToDetailDto(content);
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

  private readonly AGE_CATEGORY_MAP: Record<string, string> = {
    ZERO_PLUS: '0+',
    SIX_PLUS: '6+',
    TWELVE_PLUS: '12+',
    SIXTEEN_PLUS: '16+',
    EIGHTEEN_PLUS: '18+',
  };

  /**
   * Map content entity to list DTO.
   */
  private mapContentToDto(content: any) {
    return {
      id: content.id,
      title: content.title,
      slug: content.slug,
      description: content.description,
      contentType: content.contentType,
      ageCategory: this.AGE_CATEGORY_MAP[content.ageCategory] ?? content.ageCategory,
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
        ...(finalStatus === ContentStatus.PUBLISHED && { publishedAt: new Date() }),
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
