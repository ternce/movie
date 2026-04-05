'use client';

import * as React from 'react';
import { BookOpen, Play, Clock, CheckCircle, User, CaretRight } from '@phosphor-icons/react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { AgeBadge } from '@/components/content/age-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Spinner } from '@/components/ui/spinner';
import { useTutorialDetail, type TutorialLesson } from '@/hooks/use-content';
import { cn, formatDuration } from '@/lib/utils';
import type { AgeCategory } from '@/components/content';

type TabValue = 'lessons' | 'about' | 'reviews';

export default function TutorialDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [activeTab, setActiveTab] = React.useState<TabValue>('lessons');

  const { data: tutorial, isLoading } = useTutorialDetail(slug);

  const lessons: TutorialLesson[] = tutorial?.lessons ?? [];
  const completedCount = lessons.filter((l) => l.isCompleted).length;
  const totalCount = lessons.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const nextLesson = lessons.find((l) => !l.isCompleted);

  if (isLoading) {
    return (
      <Container size="lg" className="py-12 flex justify-center">
        <Spinner size="xl" />
      </Container>
    );
  }

  if (!tutorial) {
    return (
      <Container size="lg" className="py-12 text-center">
        <h2 className="text-xl font-semibold text-mp-text-primary mb-2">Курс не найден</h2>
        <p className="text-mp-text-secondary">Запрашиваемый курс не существует или был удалён</p>
      </Container>
    );
  }

  const tabs: { value: TabValue; label: string }[] = [
    { value: 'lessons', label: 'Уроки' },
    { value: 'about', label: 'О курсе' },
    { value: 'reviews', label: 'Отзывы' },
  ];

  return (
    <Container size="lg" className="py-6">
      {/* Hero section */}
      <div className="relative rounded-2xl overflow-hidden bg-mp-surface-2 mb-8">
        <div className="relative aspect-[21/9] sm:aspect-[3/1]">
          <Image
            src={tutorial.thumbnailUrl || '/images/movie-placeholder.jpg'}
            alt={tutorial.title}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 1152px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-3">
            <AgeBadge age={(tutorial.ageCategory || '0+') as AgeCategory} size="md" />
            {tutorial.category && (
              <span className="text-sm text-white/70 bg-white/10 px-2 py-1 rounded backdrop-blur-sm">
                {typeof tutorial.category === 'object' ? (tutorial.category as { name?: string }).name : tutorial.category}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            {tutorial.title}
          </h1>
          {tutorial.description && (
            <p className="text-white/70 max-w-2xl mb-4 line-clamp-2">
              {tutorial.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
            {tutorial.instructor && (
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
                {tutorial.instructor}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              {totalCount} уроков
            </span>
            {tutorial.duration && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {tutorial.duration}
              </span>
            )}
          </div>

          {/* Progress */}
          {totalCount > 0 && (
            <div className="mt-4 max-w-md">
              <div className="flex items-center justify-between text-sm text-white/70 mb-1.5">
                <span>{completedCount} из {totalCount} уроков</span>
                <span>{progress}%</span>
              </div>
              <ProgressBar value={progress} variant="gradient" size="sm" />
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
        <Button variant="gradient" size="lg" asChild>
          <Link href={nextLesson ? `/watch/${nextLesson.id}` : '#'}>
            <Play className="w-5 h-5" />
            {completedCount > 0 ? 'Продолжить обучение' : 'Начать обучение'}
          </Link>
        </Button>
        {nextLesson && (
          <p className="text-sm text-mp-text-secondary">
            Следующий: Урок {nextLesson.number} — {nextLesson.title}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-mp-border mb-6">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'pb-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.value
                  ? 'border-mp-accent-primary text-mp-accent-primary'
                  : 'border-transparent text-mp-text-secondary hover:text-mp-text-primary'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'lessons' && (
        <div className="space-y-2">
          {lessons.map((lesson) => {
            const isNext = lesson.id === nextLesson?.id;
            return (
              <Link
                key={lesson.id}
                href={`/watch/${lesson.id}`}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-xl transition-colors group',
                  isNext
                    ? 'bg-mp-accent-primary/10 ring-1 ring-mp-accent-primary/30'
                    : 'hover:bg-mp-surface'
                )}
              >
                {/* Number / status */}
                <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center">
                  {lesson.isCompleted ? (
                    <CheckCircle className="w-6 h-6 text-mp-success-text" />
                  ) : (
                    <span className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border',
                      isNext
                        ? 'border-mp-accent-primary text-mp-accent-primary bg-mp-accent-primary/10'
                        : 'border-mp-border text-mp-text-secondary'
                    )}>
                      {lesson.number}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'font-medium truncate',
                    lesson.isCompleted
                      ? 'text-mp-text-secondary'
                      : 'text-mp-text-primary'
                  )}>
                    {lesson.title}
                  </p>
                  <p className="text-sm text-mp-text-disabled mt-0.5">
                    {formatDuration(lesson.duration)}
                  </p>
                </div>

                {/* Arrow */}
                <CaretRight className={cn(
                  'w-5 h-5 shrink-0 transition-colors',
                  isNext
                    ? 'text-mp-accent-primary'
                    : 'text-mp-text-disabled group-hover:text-mp-text-secondary'
                )} />
              </Link>
            );
          })}
        </div>
      )}

      {activeTab === 'about' && (
        <Card className="border-mp-border bg-mp-surface/50">
          <CardContent className="pt-6">
            <div className="prose prose-invert max-w-none">
              <h3 className="text-lg font-semibold text-mp-text-primary mb-3">Описание курса</h3>
              <p className="text-mp-text-secondary leading-relaxed">
                {tutorial.description || 'Описание отсутствует'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'reviews' && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-mp-text-secondary">
            Отзывы пока отсутствуют
          </p>
        </div>
      )}
    </Container>
  );
}
