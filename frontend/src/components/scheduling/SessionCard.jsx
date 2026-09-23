import React, { useEffect, useState } from 'react';
import { Video, Clock, User, CalendarX2, Link2 } from 'lucide-react';
import useTimeZone from '../../hooks/useTimeZone';

const STATUS_STYLES = {
  scheduled: 'bg-blue-100 text-blue-800',
  ongoing: 'bg-green-100 text-green-800',
  completed: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800',
  missed: 'bg-gray-100 text-gray-700',
};

/**
 * One class.
 *
 * The Join button is the point of this component. The backend decides when a
 * class is joinable (`is_joinable`: a link exists, it is not cancelled, and we
 * are inside the window from 10 minutes before to 15 after). We re-check on a
 * timer so a card left open on screen goes live by itself rather than needing
 * a refresh.
 */
const SessionCard = ({
  session,
  role = 'student',
  onMarkAttendance,
  onAddLink,
  onCancel,
  compact = false,
}) => {
  const tz = useTimeZone();
  const [now, setNow] = useState(() => Date.now());

  // The join window opens on a clock, not on a click.
  useEffect(() => {
    if (session?.status !== 'scheduled') return undefined;
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [session?.status]);

  if (!session) return null;

  const {
    id, start_time, end_time, duration_minutes,
    course_title, student_name, teacher_name,
    meeting_link, status, status_display, cancellation_reason,
    join_opens_at,
  } = session;

  // Recompute locally so the button flips without another API call. `now` is a
  // dependency by way of being read here.
  const withinWindow =
    meeting_link &&
    status === 'scheduled' &&
    now >= new Date(join_opens_at).getTime() &&
    now <= new Date(end_time).getTime() + 15 * 60_000;

  const isCancelled = status === 'cancelled';
  const otherPerson = role === 'teacher' ? student_name : teacher_name;
  const otherLabel = role === 'teacher' ? 'Student' : 'Teacher';

  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm transition ${
        isCancelled ? 'border-gray-200 opacity-70' : 'border-gray-200 hover:shadow-md'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{course_title}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 shrink-0" />
              {tz.dayLabel(start_time)} · {tz.time(start_time)}–{tz.time(end_time)}
            </span>
            {otherPerson && (
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4 shrink-0" />
                {otherLabel}: {otherPerson}
              </span>
            )}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700'
          }`}
        >
          {status_display ?? status}
        </span>
      </div>

      {!compact && (
        <p className="mt-2 text-xs text-gray-500">
          {duration_minutes} minutes · times shown in {tz.zone}
        </p>
      )}

      {isCancelled && cancellation_reason && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          <CalendarX2 className="mt-0.5 h-4 w-4 shrink-0" />
          {cancellation_reason}
        </p>
      )}

      {!isCancelled && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {/* The class link. Opens in a new tab so the dashboard stays put. */}
          {meeting_link ? (
            <a
              href={withinWindow ? meeting_link : undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!withinWindow}
              onClick={(event) => !withinWindow && event.preventDefault()}
              className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
                withinWindow
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'cursor-not-allowed bg-gray-100 text-gray-400'
              }`}
            >
              <Video className="h-4 w-4" />
              {withinWindow ? 'Join class' : `Opens ${tz.countdown(join_opens_at)}`}
            </a>
          ) : (
            <span className="flex items-center gap-2 text-sm text-amber-700">
              <Link2 className="h-4 w-4" />
              No meeting link yet
            </span>
          )}

          {status === 'scheduled' && (
            <span className="text-sm text-gray-500">{tz.countdown(start_time)}</span>
          )}

          {/* Teacher and admin actions */}
          {onAddLink && (
            <button
              type="button"
              onClick={() => onAddLink(session)}
              className="ml-auto text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              {meeting_link ? 'Change link' : 'Add Meet link'}
            </button>
          )}
          {onMarkAttendance && status !== 'completed' && (
            <button
              type="button"
              onClick={() => onMarkAttendance(session)}
              className="text-sm font-medium text-green-700 hover:text-green-800"
            >
              Mark attendance
            </button>
          )}
          {onCancel && status === 'scheduled' && (
            <button
              type="button"
              onClick={() => onCancel(session)}
              className="text-sm font-medium text-gray-400 hover:text-red-600"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      <span className="sr-only">{id}</span>
    </div>
  );
};

export default SessionCard;
