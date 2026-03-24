'use client';

import { FloppyDisk, Trash } from '@phosphor-icons/react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';

import { StudioPageHeader } from '@/components/studio/studio-page-header';
import type { ContentFormValues } from '@/components/studio/content-form';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const ContentForm = dynamic(
  () => import('@/components/studio/content-form').then((m) => ({ default: m.ContentForm })),
  {
    loading: () => (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-mp-surface rounded" />
        <div className="h-40 bg-mp-surface rounded" />
        <div className="h-10 bg-mp-surface rounded" />
      </div>
    ),
  }
);
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  useAdminContentDetail,
  useUpdateContent,
  useDeleteContent,
  AGE_CATEGORY_FROM_BACKEND,
} from '@/hooks/use-admin-content';

export default function StudioEditPage() {
  const params = useParams();
  const router = useRouter();
  const contentId = params.id as string;

  const { data: content, isLoading } = useAdminContentDetail(contentId);
  const updateContent = useUpdateContent();
  const deleteContent = useDeleteContent();

  const handleSubmit = (values: ContentFormValues) => {
    updateContent.mutate({
      id: contentId,
      title: values.title,
      description: values.description || undefined,
      contentType: values.contentType,
      categoryId: values.categoryId || undefined,
      ageCategory: values.ageCategory,
      thumbnailUrl: values.thumbnailUrl || undefined,
      previewUrl: values.previewUrl || undefined,
      isFree: values.isFree,
      individualPrice: values.individualPrice || undefined,
      status: values.status,
      tagIds: values.tagIds?.length ? values.tagIds : undefined,
      genreIds: values.genreIds?.length ? values.genreIds : undefined,
    });
  };

  const handleDelete = () => {
    deleteContent.mutate(contentId, {
      onSuccess: () => {
        router.push('/studio');
      },
    });
  };

  if (isLoading) {
    return (
      <div className="py-8 md:py-12">
        <Skeleton className="mb-6 h-8 w-36" />
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border-mp-border bg-mp-surface/50">
                <CardContent className="p-6">
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="space-y-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="border-mp-border bg-mp-surface/50">
                <CardContent className="p-6">
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="py-8 md:py-12">
        <Card className="border-mp-border bg-mp-surface/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <h3 className="text-lg font-semibold text-mp-text-primary mb-1">
              Контент не найден
            </h3>
            <p className="text-sm text-mp-text-secondary mb-4">
              Контент был удалён или не существует
            </p>
            <Button variant="outline" asChild>
              <Link href="/studio">Вернуться к списку</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-8 md:py-12">
      <StudioPageHeader
        title={content.title}
        description="Редактирование контента"
        action={
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-mp-error-text border-mp-error-text/30 hover:bg-mp-error-bg/50">
                <Trash className="mr-1.5 h-4 w-4" />
                Удалить
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить контент?</AlertDialogTitle>
                <AlertDialogDescription>
                  Контент &quot;{content.title}&quot; будет перемещён в архив. Это действие можно отменить.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Удалить
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        }
      />

      <div className="mt-6">
        <ContentForm
          defaultValues={{
            title: content.title || '',
            slug: content.slug || '',
            description: content.description || '',
            contentType: content.contentType as ContentFormValues['contentType'],
            ageCategory: (AGE_CATEGORY_FROM_BACKEND[content.ageCategory] || content.ageCategory) as ContentFormValues['ageCategory'],
            status: content.status as ContentFormValues['status'],
            categoryId: content.categoryId || (content as unknown as { category?: { id: string } }).category?.id || '',
            thumbnailUrl: content.thumbnailUrl || '',
            previewUrl: content.previewUrl || '',
            isFree: content.isFree || false,
            individualPrice: content.individualPrice ? Number(content.individualPrice) : undefined,
            tagIds: Array.isArray((content as unknown as { tags?: unknown[] }).tags)
              ? ((content as unknown as { tags: Array<{ id?: string; tag?: { id: string } }> }).tags).map((t) => t.id || t.tag?.id || '')
              : [],
            genreIds: Array.isArray((content as unknown as { genres?: unknown[] }).genres)
              ? ((content as unknown as { genres: Array<{ id?: string; genre?: { id: string } }> }).genres).map((g) => g.id || g.genre?.id || '')
              : [],
          }}
          onSubmit={handleSubmit}
          isSubmitting={updateContent.isPending}
          submitLabel="Сохранить"
          submitIcon={<FloppyDisk className="mr-2 h-4 w-4" />}
          cancelHref="/studio"
          contentId={contentId}
          isEditMode
        />
      </div>
    </div>
  );
}
