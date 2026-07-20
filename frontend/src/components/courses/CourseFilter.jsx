import { Search, X } from 'lucide-react';

export const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'quran', label: 'Quran Recitation' },
  { value: 'quran_memorization', label: 'Quran Memorization' },
  { value: 'tajweed', label: 'Tajweed Rules' },
  { value: 'ai', label: 'Artificial Intelligence' },
  { value: 'blockchain', label: 'Blockchain Basics' },
  { value: 'programming', label: 'Programming for Kids' },
  { value: 'web_dev', label: 'Web Development' },
];

export const LEVEL_OPTIONS = [
  { value: '', label: 'All Levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

function CourseFilter({ filters, onChange }) {
  const hasActiveFilters = filters.search || filters.category || filters.level;

  const update = (patch) => onChange({ ...filters, ...patch });

  const clearAll = () => onChange({ search: '', category: '', level: '' });

  return (
    <div className="card p-4 md:p-5 mb-8">
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder="Search courses by title or description..."
            className="input-field pl-11"
          />
        </div>

        {/* Category */}
        <select
          value={filters.category}
          onChange={(e) => update({ category: e.target.value })}
          className="input-field md:w-56"
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Level */}
        <select
          value={filters.level}
          onChange={(e) => update({ level: e.target.value })}
          className="input-field md:w-44"
        >
          {LEVEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

export default CourseFilter;
