'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, SpinnerGap } from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';

import { ImageUpload } from '@/components/admin/content/image-upload';
import { VideoUpload } from '@/components/admin/content/video-upload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

// ============ Schema ============

const contentFormSchema = z.object({
  title: z.string().min(1, 'Название обязательно').max(200, 'Максимум 200 символов'),
  slug: z.string().max(200).optional().or(z.literal('')),
  description: z.string().max(5000, 'Максимум 5000 символов').optional().or(z.literal('')),
  contentType: z.enum(['SERIES', 'CLIP', 'SHORT', 'TUTORIAL'], {
    required_error: 'Выберите тип контента',
  }),
  ageCategory: z.enum(['0+', '6+', '12+', '16+', '18+'], {
    required_error: 'Выберите возрастную категорию',
  }),
  status: z.enum(['DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED', 'ARCHIVED']).default('DRAFT'),
  categoryId: z.string().optional().or(z.literal('')),
  thumbnailUrl: z.string().optional().or(z.literal('')),
  previewUrl: z.string().optional().or(z.literal('')),
  isFree: z.boolean().default(false),
  individualPrice: z.coerce.number().min(0).optional(),
});

export type ContentFormValues = z.infer<typeof contentFormSchema>;

// ============ Helpers ============

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[а-яё]/g, (char) => {
      const map: Record<string, string> = {
        а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
        з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
        п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
        ч: 'ch', ш: 'sh', щ: 'shch', ы: 'y', э: 'e', ю: 'yu', я: 'ya',
        ъ: '', ь: '',
      };
      return map[char] || char;
    })
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============ Component ============

interface ContentFormProps {
  defaultValues?: Partial<ContentFormValues>;
  onSubmit: (values: ContentFormValues) => void;
  isSubmitting: boolean;
  submitLabel: string;
  submitIcon?: React.ReactNode;
  cancelHref: string;
  contentId?: string;
}

export function ContentForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel,
  submitIcon,
  cancelHref,
  contentId,
}: ContentFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ContentFormValues>({
    resolver: zodResolver(contentFormSchema),
    defaultValues: {
      title: '',
      slug: '',
      description: '',
      contentType: undefined,
      ageCategory: undefined,
      status: 'DRAFT',
      categoryId: '',
      thumbnailUrl: '',
      previewUrl: '',
      isFree: false,
      individualPrice: undefined,
      ...defaultValues,
    },
  });

  const title = watch('title');
  const isFree = watch('isFree');
  const slug = watch('slug');

  // Auto-generate slug from title (only if slug is empty or matches previous auto-slug)
  const prevAutoSlug = React.useRef('');
  React.useEffect(() => {
    if (!title) return;
    const autoSlug = slugify(title);
    // Only auto-fill if slug is empty or matches the previous auto-generated value
    if (!slug || slug === prevAutoSlug.current) {
      setValue('slug', autoSlug);
      prevAutoSlug.current = autoSlug;
    }
  }, [title, slug, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Back link */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={cancelHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к списку
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main fields — left 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic info */}
          <Card className="border-mp-border bg-mp-surface/50">
            <CardHeader>
              <CardTitle className="text-lg">Основная информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Название *</Label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="Введите название"
                />
                {errors.title && (
                  <p className="text-xs text-mp-error-text">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL)</Label>
                <Input
                  id="slug"
                  {...register('slug')}
                  placeholder="Автоматически из названия"
                />
                <p className="text-xs text-mp-text-disabled">
                  Оставьте пустым для автоматической генерации
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Введите описание контента..."
                  rows={5}
                />
                {errors.description && (
                  <p className="text-xs text-mp-error-text">{errors.description.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Media */}
          <Card className="border-mp-border bg-mp-surface/50">
            <CardHeader>
              <CardTitle className="text-lg">Медиа</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Controller
                name="thumbnailUrl"
                control={control}
                render={({ field }) => (
                  <ImageUpload
                    label="Обложка"
                    description="Изображение обложки контента"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />

              <Controller
                name="previewUrl"
                control={control}
                render={({ field }) => (
                  <VideoUpload
                    label="Превью видео"
                    description="Короткое превью контента"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </CardContent>
          </Card>

          {/* Video upload — only on edit (when contentId provided) */}
          {contentId && (
            <Card className="border-mp-border bg-mp-surface/50">
              <CardHeader>
                <CardTitle className="text-lg">Видео контент</CardTitle>
              </CardHeader>
              <CardContent>
                <VideoUpload
                  contentId={contentId}
                  label="Основное видео"
                  description="Загрузите видео для транскодирования в HLS (MP4, WebM, MOV, MKV до 5GB)"
                  accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
                  maxSizeMB={5120}
                  onChange={() => {}}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar fields — right 1/3 */}
        <div className="space-y-6">
          {/* Settings */}
          <Card className="border-mp-border bg-mp-surface/50">
            <CardHeader>
              <CardTitle className="text-lg">Настройки</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Тип контента *</Label>
                <Controller
                  name="contentType"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SERIES">Сериал</SelectItem>
                        <SelectItem value="CLIP">Клип</SelectItem>
                        <SelectItem value="SHORT">Шорт</SelectItem>
                        <SelectItem value="TUTORIAL">Туториал</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.contentType && (
                  <p className="text-xs text-mp-error-text">{errors.contentType.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Категория возраста *</Label>
                <Controller
                  name="ageCategory"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите возраст" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0+">0+</SelectItem>
                        <SelectItem value="6+">6+</SelectItem>
                        <SelectItem value="12+">12+</SelectItem>
                        <SelectItem value="16+">16+</SelectItem>
                        <SelectItem value="18+">18+</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.ageCategory && (
                  <p className="text-xs text-mp-error-text">{errors.ageCategory.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Статус</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите статус" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Черновик</SelectItem>
                        <SelectItem value="PUBLISHED">Опубликован</SelectItem>
                        <SelectItem value="PENDING">На модерацию</SelectItem>
                        <SelectItem value="REJECTED">Отклонён</SelectItem>
                        <SelectItem value="ARCHIVED">Архив</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoryId">ID категории</Label>
                <Input
                  id="categoryId"
                  {...register('categoryId')}
                  placeholder="UUID категории"
                />
              </div>
            </CardContent>
          </Card>

          {/* Monetization */}
          <Card className="border-mp-border bg-mp-surface/50">
            <CardHeader>
              <CardTitle className="text-lg">Монетизация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Controller
                name="isFree"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isFree"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <Label htmlFor="isFree">Бесплатный контент</Label>
                  </div>
                )}
              />

              {!isFree && (
                <div className="space-y-2">
                  <Label htmlFor="individualPrice">Цена (руб.)</Label>
                  <Input
                    id="individualPrice"
                    type="number"
                    {...register('individualPrice')}
                    placeholder="0"
                    min="0"
                    step="1"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="border-mp-border bg-mp-surface/50">
            <CardContent className="p-4 space-y-2">
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  submitIcon
                )}
                {submitLabel}
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href={cancelHref}>Отмена</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
