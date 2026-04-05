'use client';

import { X } from '@phosphor-icons/react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// ============ Types ============

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface TagInputProps {
  value: string[];
  onChange: (ids: string[]) => void;
  availableTags: Tag[];
  placeholder?: string;
  disabled?: boolean;
  maxTags?: number;
}

// ============ Component ============

export function TagInput({
  value,
  onChange,
  availableTags,
  placeholder = 'Добавить тег...',
  disabled = false,
  maxTags,
}: TagInputProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const maxReached = maxTags !== undefined && value.length >= maxTags;

  const selectedTags = React.useMemo(
    () => availableTags.filter((tag) => value.includes(tag.id)),
    [availableTags, value]
  );

  const filteredSuggestions = React.useMemo(() => {
    const selectedSet = new Set(value);
    return availableTags.filter(
      (tag) =>
        !selectedSet.has(tag.id) &&
        tag.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [availableTags, value, query]);

  const handleAdd = React.useCallback(
    (tagId: string) => {
      if (maxReached) return;
      onChange([...value, tagId]);
      setQuery('');
      setOpen(false);
      // Refocus input after selection
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [value, onChange, maxReached]
  );

  const handleRemove = React.useCallback(
    (tagId: string) => {
      onChange(value.filter((id) => id !== tagId));
    },
    [value, onChange]
  );

  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setQuery(val);
      if (val.length > 0 && !maxReached) {
        setOpen(true);
      } else {
        setOpen(false);
      }
    },
    [maxReached]
  );

  const handleInputFocus = React.useCallback(() => {
    if (query.length > 0 && !maxReached) {
      setOpen(true);
    }
  }, [query, maxReached]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Remove last tag on Backspace when input is empty
      if (e.key === 'Backspace' && query === '' && value.length > 0) {
        onChange(value.slice(0, -1));
      }
      // Close dropdown on Escape
      if (e.key === 'Escape') {
        setOpen(false);
      }
    },
    [query, value, onChange]
  );

  return (
    <div className="space-y-2">
      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              className="border-mp-border bg-mp-surface text-mp-text-primary hover:bg-mp-surface-elevated gap-1 pr-1"
            >
              <span className="text-xs">{tag.name}</span>
              <button
                type="button"
                onClick={() => handleRemove(tag.id)}
                disabled={disabled}
                className="rounded-sm p-0.5 text-mp-text-secondary hover:text-mp-text-primary hover:bg-white/10 transition-colors disabled:pointer-events-none"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input with dropdown */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onKeyDown={handleKeyDown}
              disabled={disabled || maxReached}
              placeholder={
                maxReached
                  ? `Максимум ${maxTags} тегов`
                  : placeholder
              }
              className={cn(
                'flex h-9 w-full rounded-md border border-mp-border bg-mp-surface/50 px-3 py-1 text-sm text-mp-text-primary shadow-sm transition-colors',
                'placeholder:text-muted-foreground',
                'hover:bg-mp-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            />
          </div>
        </PopoverTrigger>

        {open && (
          <PopoverContent
            className="w-[--radix-popover-trigger-width] p-0"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="max-h-[200px] overflow-y-auto p-1">
              {filteredSuggestions.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Теги не найдены
                </p>
              ) : (
                filteredSuggestions.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleAdd(tag.id)}
                    className={cn(
                      'relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm text-mp-text-primary outline-none transition-colors',
                      'hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    {tag.name}
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
}
