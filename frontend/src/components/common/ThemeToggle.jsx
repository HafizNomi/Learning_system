import React from 'react';
import { Sun, Moon } from 'lucide-react';
import useTheme from '../../hooks/useTheme';

/**
 * Day / night switch - one button, one click.
 *
 * The icon shows what is on screen now (a moon at night), and the label says
 * what pressing it will do, so the button is readable either way round.
 *
 * Before the first click there is no stored choice and the page follows the
 * operating system; clicking makes it explicit and it stays that way.
 */
const ThemeToggle = ({ className = '' }) => {
  const { isDark, toggleTheme } = useTheme();
  const next = isDark ? 'day' : 'night';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={`relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 ${className}`}
    >
      {/* Both icons are mounted and cross-faded, so the swap does not jump
          the layout. Stacked, hence the absolute positioning. */}
      <Sun
        aria-hidden="true"
        className={`absolute h-5 w-5 transition-all duration-200 ${
          isDark ? 'scale-50 opacity-0' : 'scale-100 opacity-100'
        }`}
      />
      <Moon
        aria-hidden="true"
        className={`absolute h-5 w-5 transition-all duration-200 ${
          isDark ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        }`}
      />
    </button>
  );
};

export default ThemeToggle;
