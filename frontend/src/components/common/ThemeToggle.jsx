import React, { useEffect, useRef, useState } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import useTheme, { THEMES } from '../../hooks/useTheme';

const LABELS = {
  light: { icon: Sun, label: 'Day' },
  dark: { icon: Moon, label: 'Night' },
  system: { icon: Monitor, label: 'Match device' },
};

/**
 * Day / night switch.
 *
 * A plain two-way toggle would throw away "follow my device", which is the
 * setting most people are actually on - so this is a small menu of three.
 * The button itself shows what is currently painted, not what is selected,
 * because that is the question someone glancing at it is asking.
 */
const ThemeToggle = ({ className = '' }) => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Click-away and Escape, so the menu never strands the page.
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const CurrentIcon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Appearance: ${LABELS[theme].label}. Change it.`}
        title="Appearance"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
      >
        <CurrentIcon className="h-5 w-5" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          {THEMES.map((option) => {
            const { icon: Icon, label } = LABELS[option];
            const selected = theme === option;
            return (
              <button
                key={option}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setTheme(option);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition hover:bg-gray-100 ${
                  selected ? 'font-semibold text-primary-700' : 'text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{label}</span>
                {selected && <Check className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;
