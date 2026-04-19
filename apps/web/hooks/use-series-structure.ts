'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, ApiError, endpoints } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';

// ============ Age Category Mapping ============
// Frontend uses display values (0+, 6+, etc.) but backend Prisma enum expects ZERO_PLUS, SIX_PLUS, etc.
const AGE_CATEGORY_TO_BACKEND: Record<string, string> = {
  '0+': 'ZERO_PLUS',
  '6+': 'SIX_PLUS',
  '12+': 'TWELVE_PLUS',
  '16+': 'SIXTEEN_PLUS',
  '18+': 'EIGHTEEN_PLUS',
};

function mapAgeCategoryToBackend(value?: string): string | undefined {
  if (!value) return undefined;
  return AGE_CATEGORY_TO_BACKEND[value] || value;
}

// ============ Types ============

export interface SeriesEpisode {
  id: string;
  contentId: string;
  seriesId: string;
  title: string;
  description: string;
  seasonNumber: number;
  episodeNumber: number;
  hasVideo: boolean;
  encodingStatus?: string;
  thumbnailUrl?: string;
}

export interface SeriesSeason {
  seasonNumber: number;
  title: string;
  episodes: SeriesEpisode[];
}

export interface SeriesStructure {
  id: string;
  title: string;
  contentType: string;
  seasons: SeriesSeason[];
}

export interface CreateSeriesInput {
  title: string;
  description: string;
  contentType: 'SERIES' | 'TUTORIAL';
  categoryId: string;
  ageCategory: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  isFree?: boolean;
  individualPrice?: number;
  tagIds?: string[];
  genreIds?: string[];
  seasons: Array<{
    title: string;
    order: number;
    episodes: Array<{
      title: string;
      description?: string;
      order: number;
    }>;
  }>;
}

export interface AddEpisodeInput {
  title: string;
  description?: string;
  seasonNumber: number;
  episodeNumber: number;
}

export interface UpdateEpisodeInput {
  id: string;
  title?: string;
  description?: string;
  seasonNumber?: number;
  episodeNumber?: number;
}

export interface ReorderStructureInput {
  episodes: Array<{
    id: string;
    seasonNumber: number;
    episodeNumber: number;
  }>;
}

export interface TreeStructureItem {
  id: string;
  title: string;
  description: string;
  order: number;
  /** Present only for existing episodes/lessons fetched from API */
  contentId?: string;
}

export interface TreeStructureGroup {
  id: string;
  order: number;
  items: TreeStructureItem[];
}

export interface SyncSeriesStructureInput {
  original: SeriesStructure;
  groups: TreeStructureGroup[];
}

// ============ Queries ============

/**
 * Hook to fetch series/tutorial structure (seasons + episodes or chapters + lessons)
 */
export function useSeriesStructure(contentId: string | undefined) {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminContent.structure(contentId || ''),
    queryFn: async () => {
      if (!contentId) throw new Error('Content ID required');
      const response = await api.get<SeriesStructure>(
        endpoints.adminContent.structure(contentId)
      );
      return response.data;
    },
    enabled: !!contentId && isAuthenticated && isHydrated && isAdmin,
  });
}

// ============ Mutations ============

/**
 * Hook to create series/tutorial content with full structure (seasons + episodes)
 */
export function useCreateSeriesContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSeriesInput) => {
      const payload = {
        ...data,
        ageCategory: mapAgeCategoryToBackend(data.ageCategory),
      };
      const response = await api.post<SeriesStructure>(
        endpoints.adminContent.createSeries,
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminContent.all });
      toast.success('Контент создан');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось создать контент');
    },
  });
}

/**
 * Hook to add an episode to an existing series/tutorial
 */
export function useAddEpisode(rootContentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddEpisodeInput) => {
      const response = await api.post<SeriesEpisode>(
        endpoints.adminContent.addEpisode(rootContentId),
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.adminContent.structure(rootContentId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.adminContent.detail(rootContentId),
      });
      toast.success('Эпизод добавлен');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось добавить эпизод');
    },
  });
}

/**
 * Hook to update an existing episode
 */
export function useUpdateEpisode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateEpisodeInput) => {
      const response = await api.patch<SeriesEpisode>(
        endpoints.adminContent.updateEpisode(id),
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminContent.all });
      toast.success('Эпизод обновлён');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось обновить эпизод');
    },
  });
}

/**
 * Hook to delete an episode
 */
export function useDeleteEpisode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (episodeId: string) => {
      const response = await api.delete<{ success: boolean; message: string }>(
        endpoints.adminContent.deleteEpisode(episodeId)
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminContent.all });
      toast.success('Эпизод удалён');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось удалить эпизод');
    },
  });
}

/**
 * Hook to reorder episodes within a series/tutorial structure
 */
export function useReorderStructure(rootContentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ReorderStructureInput) => {
      const response = await api.patch<SeriesStructure>(
        endpoints.adminContent.reorderStructure(rootContentId),
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.adminContent.structure(rootContentId),
      });
      toast.success('Порядок обновлён');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось обновить порядок');
    },
  });
}

function flattenOriginalEpisodes(structure: SeriesStructure) {
  const map = new Map<string, { title: string; description: string; seasonNumber: number; episodeNumber: number }>();
  for (const season of structure.seasons ?? []) {
    for (const ep of season.episodes ?? []) {
      if (ep.contentId) {
        map.set(ep.contentId, {
          title: ep.title,
          description: ep.description || '',
          seasonNumber: ep.seasonNumber,
          episodeNumber: ep.episodeNumber,
        });
      }
    }
  }
  return map;
}

/**
 * Sync series/tutorial structure edits from the TreeManager UI:
 * - creates new episodes/lessons
 * - updates title/description
 * - deletes removed episodes/lessons
 * - reorders/moves existing episodes/lessons across seasons
 */
export function useSyncSeriesStructure(rootContentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ original, groups }: SyncSeriesStructureInput) => {
      const originalByContentId = flattenOriginalEpisodes(original);

      const nextExisting: Array<{
        contentId: string;
        title: string;
        description: string;
        seasonNumber: number;
        episodeNumber: number;
      }> = [];

      const nextNew: Array<{
        title: string;
        description: string;
        seasonNumber: number;
        episodeNumber: number;
      }> = [];

      for (const group of groups ?? []) {
        for (const item of group.items ?? []) {
          const title = (item.title || '').trim();
          const description = item.description || '';
          if (!title) {
            throw new Error('Название эпизода/урока не может быть пустым');
          }

          const seasonNumber = group.order;
          const episodeNumber = item.order;

          if (item.contentId) {
            nextExisting.push({
              contentId: item.contentId,
              title,
              description,
              seasonNumber,
              episodeNumber,
            });
          } else {
            nextNew.push({
              title,
              description,
              seasonNumber,
              episodeNumber,
            });
          }
        }
      }

      const nextExistingIds = new Set(nextExisting.map((e) => e.contentId));
      const originalIds = new Set(originalByContentId.keys());

      const deletions: string[] = [];
      for (const id of originalIds) {
        if (!nextExistingIds.has(id)) deletions.push(id);
      }

      const updates: Array<{ contentId: string; title: string; description: string }> = [];
      const reorderPayload: ReorderStructureInput['episodes'] = [];

      let reorderNeeded = false;
      for (const ep of nextExisting) {
        const prev = originalByContentId.get(ep.contentId);
        if (prev) {
          if (prev.title !== ep.title || (prev.description || '') !== (ep.description || '')) {
            updates.push({ contentId: ep.contentId, title: ep.title, description: ep.description });
          }
          if (prev.seasonNumber !== ep.seasonNumber || prev.episodeNumber !== ep.episodeNumber) {
            reorderNeeded = true;
          }
        } else {
          // Episode exists in UI but not in original (shouldn't happen); treat as reorder-needed.
          reorderNeeded = true;
        }

        reorderPayload.push({
          id: ep.contentId,
          seasonNumber: ep.seasonNumber,
          episodeNumber: ep.episodeNumber,
        });
      }

      // 1) Delete removed episodes (best-effort sequential)
      for (const contentId of deletions) {
        await api.delete(endpoints.adminContent.deleteEpisode(contentId));
      }

      // 2) Create new episodes
      for (const ep of nextNew) {
        await api.post(endpoints.adminContent.addEpisode(rootContentId), {
          title: ep.title,
          description: ep.description || undefined,
          seasonNumber: ep.seasonNumber,
          episodeNumber: ep.episodeNumber,
        });
      }

      // 3) Update metadata
      for (const ep of updates) {
        await api.patch(endpoints.adminContent.updateEpisode(ep.contentId), {
          title: ep.title,
          description: ep.description,
        });
      }

      // 4) Reorder/move existing episodes
      if (reorderNeeded && reorderPayload.length > 0) {
        await api.patch(endpoints.adminContent.reorderStructure(rootContentId), {
          episodes: reorderPayload,
        });
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.adminContent.structure(rootContentId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.adminContent.detail(rootContentId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.adminContent.lists() }),
      ]);
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось сохранить структуру');
    },
  });
}
