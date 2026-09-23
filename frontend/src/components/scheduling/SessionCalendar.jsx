import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Calendar from 'react-calendar';
import SessionCard from './SessionCard';
import LoadingSpinner from '../common/LoadingSpinner';
import { fetchSchedule } from '../../redux/slices/sessionSlice';
import useTimeZone from '../../hooks/useTimeZone';

/** YYYY-MM-DD in the viewer's own timezone, which is what the API expects. */
const isoDate = (date, zone) => {
  try {
    return date.toLocaleDateString('en-CA', { timeZone: zone });
  } catch {
    return date.toISOString().slice(0, 10);
  }
};

/**
 * Month view with a day panel underneath.
 *
 * Days that already have classes get a dot, so a teacher can see their week at
 * a glance without clicking through it. The dots come from `upcoming`, which
 * the dashboards have already loaded - no extra request per month.
 */
const SessionCalendar = ({ role = 'student', onAddLink, onMarkAttendance, onCancel }) => {
  const dispatch = useDispatch();
  const tz = useTimeZone();
  const { schedule, scheduleLoading, upcoming } = useSelector((state) => state.sessions);

  const [selected, setSelected] = useState(() => new Date());

  useEffect(() => {
    dispatch(fetchSchedule(isoDate(selected, tz.zone)));
  }, [dispatch, selected, tz.zone]);

  // Which calendar squares get a dot.
  const daysWithClasses = useMemo(() => {
    const days = new Set();
    upcoming.forEach((session) => {
      days.add(isoDate(new Date(session.start_time), tz.zone));
    });
    return days;
  }, [upcoming, tz.zone]);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <Calendar
          onChange={setSelected}
          value={selected}
          className="session-calendar"
          tileContent={({ date, view }) =>
            view === 'month' && daysWithClasses.has(isoDate(date, tz.zone)) ? (
              <span className="mx-auto mt-0.5 block h-1.5 w-1.5 rounded-full bg-primary-600" />
            ) : null
          }
        />
        <p className="mt-3 text-center text-xs text-gray-500">
          Times shown in {tz.zone}
        </p>
      </div>

      <div>
        <h3 className="mb-3 font-semibold text-gray-900">
          {tz.dayLabel(selected)} &middot;{' '}
          <span className="font-normal text-gray-500">
            {schedule.length} {schedule.length === 1 ? 'class' : 'classes'}
          </span>
        </h3>

        {scheduleLoading && <LoadingSpinner />}

        {!scheduleLoading && schedule.length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            No classes on this day.
          </p>
        )}

        {!scheduleLoading && schedule.length > 0 && (
          <div className="space-y-3">
            {schedule.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                role={role}
                onAddLink={onAddLink}
                onMarkAttendance={onMarkAttendance}
                onCancel={onCancel}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionCalendar;
