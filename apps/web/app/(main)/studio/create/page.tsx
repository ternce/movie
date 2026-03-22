'use client';

import { Plus } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';

import { StudioPageHeader } from '@/components/studio/studio-page-header';
import { ContentForm } from '@/components/studio/content-form';
import type { ContentFormValues } from '@/components/studio/content-form';
import { useCreateContent } from '@/hooks/use-admin-content';

export default function StudioCreatePage() {
  const router = useRouter();
  const createContent = useCreateContent();

  const handleSubmit = (values: ContentFormValues) => {
    createContent.mutate(
      {
        title: values.title,
        slug: values.slug || undefined,
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
      },
      {
        onSuccess: (data) => {
          // Redirect to edit page so user can upload video
          router.push(`/studio/${data.id}`);
        },
      }
    );
  };

  return (
    <div className="py-8 md:py-12">
      <StudioPageHeader
        title="Новый контент"
        description="Создание нового контента на платформе"
      />

      <div className="mt-6">
        <ContentForm
          onSubmit={handleSubmit}
          isSubmitting={createContent.isPending}
          submitLabel="Создать контент"
          submitIcon={<Plus className="mr-2 h-4 w-4" />}
          cancelHref="/studio"
        />
      </div>
    </div>
  );
}
