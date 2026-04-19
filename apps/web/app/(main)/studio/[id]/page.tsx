'use client';

import { Trash } from '@phosphor-icons/react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { StudioPageHeader } from '@/components/studio/studio-page-header';
import { ContentEditorRouter } from '@/components/studio/editors/content-editor-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  useDeleteContent,
} from '@/hooks/use-admin-content';

export default function StudioEditPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const contentId = params.id as string;
  const { data: content } = useAdminContentDetail(contentId);
  const deleteContent = useDeleteContent();

  const created = searchParams.get('created') === '1';
  const watchPath = `/watch/${contentId}`;
  const watchUrl = typeof window !== 'undefined' ? `${window.location.origin}${watchPath}` : watchPath;

  const handleDelete = () => {
    deleteContent.mutate(contentId, {
      onSuccess: () => router.push('/studio'),
    });
  };

  return (
    <div className="py-8 md:py-12">
      <StudioPageHeader
        title={content?.title || 'Загрузка...'}
        description="Редактирование контента"
        action={
          content ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-mp-error-text border-mp-error-text/30 hover:bg-mp-error-bg/50"
                >
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
          ) : undefined
        }
      />

      {created && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Ссылка на видео</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input value={watchUrl} readOnly className="flex-1" />
            <div className="flex gap-2">
              <Button type="button" variant="outline" asChild>
                <Link href={watchPath} target="_blank">
                  Открыть
                </Link>
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(watchUrl);
                    toast.success('Ссылка скопирована');
                  } catch {
                    toast.error('Не удалось скопировать ссылку');
                  }
                }}
              >
                Копировать
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-6">
        <ContentEditorRouter contentId={contentId} />
      </div>
    </div>
  );
}
