'use client';

import {
  FilmSlate,
  Eye,
  FileText,
  CheckCircle,
  Plus,
} from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StudioPageHeader } from '@/components/studio/studio-page-header';
import { StudioContentCard, StudioContentCardSkeleton } from '@/components/studio/content-card';
import { ContentFilters } from '@/components/studio/content-filters';
import { useAdminContent, useUpdateContent } from '@/hooks/use-admin-content';

/**
 * Studio dashboard — content list with stats, filters, and grid
 */
export default function StudioPage() {
  const [search, setSearch] = React.useState('');
  const [contentType, setContentType] = React.useState('all');
  const [status, setStatus] = React.useState('all');
  const [page, setPage] = React.useState(1);
  const [debouncedSearch, setDebouncedSearch] = React.useState('');

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useAdminContent({
    page,
    limit: 12,
    search: debouncedSearch || undefined,
    contentType: contentType !== 'all' ? contentType : undefined,
    status: status !== 'all' ? status : undefined,
  });

  const updateContent = useUpdateContent();

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  // Compute stats from current data (simplified — ideally a separate endpoint)
  const publishedCount = items.filter((c) => c.status === 'PUBLISHED').length;
  const draftCount = items.filter((c) => c.status === 'DRAFT').length;
  const totalViews = items.reduce((sum, c) => sum + (c.viewCount || 0), 0);

  const handlePublish = (id: string) => {
    updateContent.mutate({ id, status: 'PUBLISHED' });
  };

  const stats = [
    { label: 'Всего контента', value: total, icon: FilmSlate },
    { label: 'Опубликовано', value: publishedCount, icon: CheckCircle },
    { label: 'Черновики', value: draftCount, icon: FileText },
    { label: 'Просмотры', value: totalViews.toLocaleString('ru-RU'), icon: Eye },
  ];

  return (
    <div className="py-8 md:py-12 space-y-8">
      <StudioPageHeader
        title="Мой контент"
        description="Управление контентом на платформе"
        action={
          <Button asChild className="bg-gradient-to-r from-mp-accent-primary to-mp-accent-secondary text-white hover:opacity-90">
            <Link href="/studio/create">
              <Plus className="mr-2 h-4 w-4" />
              Создать контент
            </Link>
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-mp-border bg-mp-surface/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-mp-accent-primary/10 p-2.5">
                <stat.icon className="h-5 w-5 text-mp-accent-primary" />
              </div>
              <div>
                <p className="text-xs text-mp-text-secondary">{stat.label}</p>
                <p className="text-lg font-bold text-mp-text-primary">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <ContentFilters
        search={search}
        onSearchChange={setSearch}
        contentType={contentType}
        onContentTypeChange={(v) => { setContentType(v); setPage(1); }}
        status={status}
        onStatusChange={(v) => { setStatus(v); setPage(1); }}
      />

      {/* Content grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <StudioContentCardSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="border-mp-border bg-mp-surface/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FilmSlate className="h-12 w-12 text-mp-text-disabled mb-4" />
            <h3 className="text-lg font-semibold text-mp-text-primary mb-1">
              Контент не найден
            </h3>
            <p className="text-sm text-mp-text-secondary mb-6 max-w-sm">
              {debouncedSearch || contentType !== 'all' || status !== 'all'
                ? 'Попробуйте изменить фильтры поиска'
                : 'Создайте свой первый контент, чтобы он появился здесь'}
            </p>
            {!debouncedSearch && contentType === 'all' && status === 'all' && (
              <Button asChild className="bg-gradient-to-r from-mp-accent-primary to-mp-accent-secondary text-white">
                <Link href="/studio/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Создать контент
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((content) => (
            <StudioContentCard
              key={content.id}
              content={content}
              onPublish={handlePublish}
              isPublishing={updateContent.isPending}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Назад
          </Button>
          <span className="text-sm text-mp-text-secondary">
            {page} из {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Далее
          </Button>
        </div>
      )}
    </div>
  );
}
