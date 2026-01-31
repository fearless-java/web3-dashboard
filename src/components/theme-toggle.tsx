'use client';

import { Moon, Sun, Monitor, Check } from 'lucide-react';
import { useSettingsStore, type Theme } from '@/stores/settings-store';
import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function ThemeToggle() {
  const { theme, setTheme } = useSettingsStore();
  const [mounted, setMounted] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const themePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!showThemePicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (themePickerRef.current && !themePickerRef.current.contains(e.target as Node)) {
        setShowThemePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showThemePicker]);

  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-muted text-muted-foreground" aria-hidden>
          <Monitor className="w-5 h-5" />
        </div>
      </div>
    );
  }

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="w-5 h-5" />;
      case 'dark':
        return <Moon className="w-5 h-5" />;
      case 'system':
        return <Monitor className="w-5 h-5" />;
    }
  };

  const getLabel = () => {
    return THEME_OPTIONS.find((o) => o.value === theme)?.label ?? 'System';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative" ref={themePickerRef}>
        <button
          onClick={() => setShowThemePicker(!showThemePicker)}
          className="relative rounded-lg bg-muted p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground group"
          aria-label={`Choose theme, current: ${getLabel()}`}
          aria-expanded={showThemePicker}
          aria-haspopup="true"
          title={getLabel()}
        >
          {getIcon()}
          <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded border border-border bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 transition-opacity group-hover:opacity-100">
            Theme
          </span>
        </button>
        {showThemePicker && (
          <div className="absolute right-0 top-full z-50 mt-2 min-w-[140px] rounded-lg border border-border bg-popover py-1 shadow-lg animate-in fade-in slide-in-from-top-2">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Choose theme
            </div>
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = theme === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                    isSelected && 'bg-accent/50 text-accent-foreground'
                  )}
                  aria-label={option.label}
                  aria-pressed={isSelected}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{option.label}</span>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
