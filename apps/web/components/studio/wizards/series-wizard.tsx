'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { FilmStrip } from '@phosphor-icons/react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { toast } from 'sonner';

import { CategorySelect } from '@/components/studio/category-select';
import { GenreSelect } from '@/components/studio/genre-select';
import {
  seriesFormSchema,
  type SeriesFormValues,
  type SeasonGroup,
} from '@/components/studio/schemas';
import { MediaUploadCard } from '@/components/studio/shared/media-upload-card';
import { PublishingCard } from '@/components/studio/shared/publishing-card';
import { SummaryPanel } from '@/components/studio/shared/summary-panel';
import { TitleDescriptionFields } from '@/components/studio/shared/title-description-fields';
import {
  WizardShell,
  type WizardStep,
} from '@/components/studio/shared/wizard-shell';
import { TagInput } from '@/components/studio/tag-input';
import { TreeManager, type TreeGroup } from '@/components/studio/tree-manager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useCreateSeriesContent,
  type CreateSeriesInput,
} from '@/hooks/use-series-structure';
import {
  useContentCategories,
  useContentTags,
  useContentGenres,
} from '@/hooks/use-studio-data';

// ============ Constants ============

const DRAFT_KEY = 'studio-draft-series';

const STEPS: WizardStep[] = [
  { id: 1, label: 'Основное' },
  { id: 2, label: 'Структура' },
  { id: 3, label: 'Медиа' },
  { id: 4, label: 'Публикация' },
];

/** Fields to validate per step */
const STEP_FIELDS: Record<number, Array<keyof SeriesFormValues>> = {
  1: ['title', 'description'],
  2: ['seasons'],
  3: [],
  4: ['categoryId', 'ageCategory'],
};

// ============ Helpers ============

function createDefaultSeason(): SeasonGroup {
  return {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    order: 1,
    items: [
      {
        id: Math.random().toString(36).slice(2) + Date.now().toString(36),
        title: '',
        description: '',
        order: 1,
      },
    ],
  };
}

function getDefaultValues(): SeriesFormValues {
  return {
    title: '',
    slug: '',
    description: '',
    contentType: 'SERIES',
    ageCategory: '0+',
    status: 'DRAFT',
    thumbnailUrl: '',
    previewUrl: '',
    isFree: false,
    individualPrice: 0,
    categoryId: '',
    tagIds: [],
    genreIds: [],
    seasons: [createDefaultSeason()],
  };
}

function loadDraft(): SeriesFormValues | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SeriesFormValues;
    // Basic sanity check
    if (parsed.title !== undefined && parsed.seasons?.length) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function saveDraft(values: SeriesFormValues): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
  } catch {
    // Quota exceeded — silently ignore
  }
}

function clearDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Ignore
  }
}

/** Convert TreeGroup[] from TreeManager to SeasonGroup[] for form state */
function treeGroupsToSeasons(groups: TreeGroup[]): SeasonGroup[] {
  return groups.map((g) => ({
    id: g.id,
    order: g.order,
    items: g.items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      order: item.order,
    })),
  }));
}

/** Convert SeasonGroup[] from form state to TreeGroup[] for TreeManager */
function seasonsToTreeGroups(seasons: SeasonGroup[]): TreeGroup[] {
  return seasons.map((s) => ({
    id: s.id,
    order: s.order,
    items: s.items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      order: item.order,
    })),
  }));
}

// ============ Props ============

export interface SeriesWizardProps {
  onSuccess?: (contentId: string) => void;
}

// ============ Component ============

export function SeriesWizard({ onSuccess }: SeriesWizardProps) {
  const [currentStep, setCurrentStep] = React.useState(1);
  const createSeries = useCreateSeriesContent();

  // Reference data
  const { flat: categoriesFlat } = useContentCategories();
  const { data: tagsData } = useContentTags();
  const { data: genresData } = useContentGenres();
  const availableTags = tagsData ?? [];
  const availableGenres = genresData ?? [];

  // Restore draft on mount
  const draft = React.useMemo(() => loadDraft(), []);

  const form = useForm<SeriesFormValues>({
    resolver: zodResolver(seriesFormSchema),
    defaultValues: draft ?? getDefaultValues(),
    mode: 'onTouched',
  });

  const { watch, setValue, trigger, handleSubmit, formState } = form;

  // Auto-save draft on every change (debounced)
  const watchedValues = watch();
  const draftTimerRef = React.useRef<ReturnType<typeof setTimeout>>();

  React.useEffect(() => {
    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current);
    }
    draftTimerRef.current = setTimeout(() => {
      saveDraft(watchedValues);
    }, 1000);

    return () => {
      if (draftTimerRef.current) {
        clearTimeout(draftTimerRef.current);
      }
    };
  }, [watchedValues]);

  // --- TreeManager sync ---
  const seasons = watch('seasons');
  const treeGroups = React.useMemo(
    () => seasonsToTreeGroups(seasons),
    [seasons]
  );

  const handleGroupsChange = React.useCallback(
    (groups: TreeGroup[]) => {
      const mapped = treeGroupsToSeasons(groups);
      setValue('seasons', mapped, { shouldValidate: false });
    },
    [setValue]
  );

  // --- Step navigation ---
  const handleNext = React.useCallback(async (): Promise<boolean> => {
    const fieldsToValidate = STEP_FIELDS[currentStep];
    if (!fieldsToValidate || fieldsToValidate.length === 0) return true;

    const result = await trigger(fieldsToValidate);
    if (!result) {
      toast.error('Пожалуйста, заполните обязательные поля');
    }
    return result;
  }, [currentStep, trigger]);

  const handleBack = React.useCallback(() => {
    setCurrentStep((s) => Math.max(1, s - 1));
  }, []);

  // --- Submit ---
  const onFormSubmit = React.useCallback(
    (values: SeriesFormValues) => {
      const payload: CreateSeriesInput = {
        title: values.title,
        description: values.description,
        contentType: 'SERIES',
        categoryId: values.categoryId,
        ageCategory: values.ageCategory,
        thumbnailUrl: values.thumbnailUrl || undefined,
        previewUrl: values.previewUrl || undefined,
        isFree: values.isFree,
        individualPrice: values.individualPrice,
        tagIds: values.tagIds,
        genreIds: values.genreIds,
        seasons: values.seasons.map((s) => ({
          title: `Сезон ${s.order}`,
          order: s.order,
          episodes: s.items.map((ep) => ({
            title: ep.title,
            description: ep.description,
            order: ep.order,
          })),
        })),
      };

      createSeries.mutate(payload, {
        onSuccess: (data) => {
          clearDraft();
          onSuccess?.(data.id);
        },
      });
    },
    [createSeries, onSuccess]
  );

  const handleFormSubmit = React.useCallback(() => {
    handleSubmit(onFormSubmit)();
  }, [handleSubmit, onFormSubmit]);

  return (
    <WizardShell
      steps={STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      onNext={handleNext}
      onBack={handleBack}
      onSubmit={handleFormSubmit}
      isSubmitting={createSeries.isPending}
      submitLabel="Создать сериал"
      submitIcon={<FilmStrip weight="bold" className="h-4 w-4" />}
      cancelHref="/studio"
    >
      {/* Step 1: Basic info */}
      {currentStep === 1 && (
        <TitleDescriptionFields
          form={form}
          slugPrefix="movieplatform.ru/watch/"
        />
      )}

      {/* Step 2: Structure */}
      {currentStep === 2 && (
        <Card className="border-[#272b38] bg-[#10131c]/50">
          <CardHeader>
            <CardTitle className="text-lg text-[#f5f7ff]">
              Структура сериала
            </CardTitle>
            <p className="text-sm text-[#9ca2bc]">
              Создайте сезоны и эпизоды. Перетаскивайте для изменения порядка.
            </p>
          </CardHeader>
          <CardContent>
            <TreeManager
              groupLabel="Сезон"
              itemLabel="Эпизод"
              groups={treeGroups}
              onGroupsChange={handleGroupsChange}
            />
            {formState.errors.seasons && (
              <p className="mt-3 text-xs text-[#ff9aa8]">
                {(formState.errors.seasons as { message?: string }).message}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Media */}
      {currentStep === 3 && <MediaUploadCard form={form} />}

      {/* Step 4: Publishing */}
      {currentStep === 4 && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Category */}
            <Card className="border-[#272b38] bg-[#10131c]/50">
              <CardHeader>
                <CardTitle className="text-lg text-[#f5f7ff]">
                  Тематика *
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Controller
                  name="categoryId"
                  control={form.control}
                  render={({ field }) => (
                    <CategorySelect
                      value={field.value}
                      onChange={field.onChange}
                      categories={categoriesFlat}
                    />
                  )}
                />
                {formState.errors.categoryId && (
                  <p className="mt-2 text-xs text-[#ff9aa8]">
                    {(formState.errors.categoryId as { message?: string }).message}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Genres */}
            <Card className="border-[#272b38] bg-[#10131c]/50">
              <CardHeader>
                <CardTitle className="text-lg text-[#f5f7ff]">
                  Жанры
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Controller
                  name="genreIds"
                  control={form.control}
                  render={({ field }) => (
                    <GenreSelect
                      value={field.value ?? []}
                      onChange={field.onChange}
                      availableGenres={availableGenres}
                    />
                  )}
                />
              </CardContent>
            </Card>

            {/* Tags */}
            <Card className="border-[#272b38] bg-[#10131c]/50">
              <CardHeader>
                <CardTitle className="text-lg text-[#f5f7ff]">
                  Теги
                </CardTitle>
                <p className="text-sm text-[#9ca2bc]">
                  Добавьте теги для улучшения поиска контента
                </p>
              </CardHeader>
              <CardContent>
                <Controller
                  name="tagIds"
                  control={form.control}
                  render={({ field }) => (
                    <TagInput
                      value={field.value ?? []}
                      onChange={field.onChange}
                      availableTags={availableTags}
                      maxTags={20}
                    />
                  )}
                />
              </CardContent>
            </Card>

            {/* Publishing settings */}
            <PublishingCard form={form} />
          </div>

          {/* Summary sidebar */}
          <div>
            <SummaryPanel form={form} contentType="SERIES" />
          </div>
        </div>
      )}
    </WizardShell>
  );
}

export default SeriesWizard;
