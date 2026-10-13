import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Lock, PlayCircle, Video } from 'lucide-react';
import YouTubeEmbed from './YouTubeEmbed';

const formatLength = (minutes) => {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
};

/**
 * The recorded lessons for a course.
 *
 * One player at a time: selecting a lesson swaps the video above the list,
 * rather than mounting an iframe per row.
 */
function LessonList({ lessons = [], courseId }) {
  // Open on the first lesson the viewer is actually allowed to watch.
  const firstPlayable = lessons.find((lesson) => !lesson.is_locked) || lessons[0];
  const [activeId, setActiveId] = useState(firstPlayable?.id ?? null);

  if (lessons.length === 0) return null;

  const active = lessons.find((lesson) => lesson.id === activeId) || firstPlayable;
  const lockedCount = lessons.filter((lesson) => lesson.is_locked).length;

  return (
    <div className="card p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Video className="h-5 w-5 text-primary-600" />
          Recorded lessons
          <span className="text-sm font-normal text-gray-400">({lessons.length})</span>
        </h2>
        {lockedCount > 0 && (
          <span className="text-sm text-gray-500">
            {lessons.length - lockedCount} free to watch
          </span>
        )}
      </div>

      {active && (
        <div className="mb-6">
          <YouTubeEmbed
            embedUrl={active.embed_url}
            thumbnailUrl={active.thumbnail_url}
            title={active.title}
            isLocked={active.is_locked}
          />
          <h3 className="mt-3 font-semibold text-gray-900">{active.title}</h3>
          {active.description && (
            <p className="mt-1 text-sm text-gray-600">{active.description}</p>
          )}
        </div>
      )}

      <ol className="divide-y divide-gray-100 border-t border-gray-100">
        {lessons.map((lesson, index) => {
          const isActive = lesson.id === active?.id;
          const length = formatLength(lesson.duration_minutes);

          return (
            <li key={lesson.id}>
              <button
                type="button"
                onClick={() => setActiveId(lesson.id)}
                className={`flex w-full items-center gap-3 px-2 py-3 text-left transition hover:bg-gray-50 ${
                  isActive ? 'bg-primary-50/60' : ''
                }`}
              >
                <span className="w-6 shrink-0 text-center text-sm text-gray-400 tabular-nums">
                  {index + 1}
                </span>

                {lesson.is_locked ? (
                  <Lock className="h-5 w-5 shrink-0 text-gray-300" />
                ) : (
                  <PlayCircle
                    className={`h-5 w-5 shrink-0 ${
                      isActive ? 'text-primary-600' : 'text-gray-400'
                    }`}
                  />
                )}

                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-sm ${
                      isActive ? 'font-semibold text-primary-700' : 'text-gray-800'
                    }`}
                  >
                    {lesson.title}
                  </span>
                  {lesson.is_preview && !lesson.is_locked && (
                    <span className="text-xs font-medium text-green-600">Free preview</span>
                  )}
                </span>

                {length && (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3.5 w-3.5" />
                    {length}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {lockedCount > 0 && (
        <div className="mt-5 rounded-lg bg-primary-50 p-4 text-center">
          <p className="text-sm text-primary-900">
            {lockedCount} {lockedCount === 1 ? 'lesson is' : 'lessons are'} available to
            enrolled students.
          </p>
          <Link
            to={`/apply?course=${courseId}`}
            className="btn-primary mt-3 inline-flex text-sm"
          >
            Apply for this course
          </Link>
        </div>
      )}
    </div>
  );
}

export default LessonList;
