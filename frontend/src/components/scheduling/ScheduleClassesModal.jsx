import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CalendarPlus } from 'lucide-react';
import { generateSessions, clearGenerated } from '../../redux/slices/sessionSlice';
import { PREFERRED_DAYS_OPTIONS, TIMEZONE_OPTIONS } from '../../utils/constants';

/** 0 = Monday, matching Python's `date.weekday()`. */
const WEEKDAYS = [
  { value: 0, short: 'Mon' },
  { value: 1, short: 'Tue' },
  { value: 2, short: 'Wed' },
  { value: 3, short: 'Thu' },
  { value: 4, short: 'Fri' },
  { value: 5, short: 'Sat' },
  { value: 6, short: 'Sun' },
];

const DAY_PRESETS = {
  mon_wed_fri: [0, 2, 4],
  tue_thu_sat: [1, 3, 5],
  weekends: [5, 6],
};

const TIME_DEFAULTS = { morning: '09:00', afternoon: '14:00', evening: '17:00' };

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * Schedule a run of classes for one approved application.
 *
 * Seeded from what the family asked for on the application form, so the usual
 * case is "check it and press Schedule". The times are entered in the family's
 * own timezone - the backend converts to UTC.
 */
const ScheduleClassesModal = ({ application, onClose }) => {
  const dispatch = useDispatch();
  const { generating, lastGenerated, fieldErrors } = useSelector((state) => state.sessions);

  const [form, setForm] = useState({
    start_date: todayISO(),
    weeks: 4,
    time_of_day: TIME_DEFAULTS[application.preferred_time] ?? '17:00',
    timezone: application.preferred_timezone || 'UTC',
    weekdays: DAY_PRESETS[application.preferred_days] ?? [0, 2, 4],
  });

  const update = (field) => (event) =>
    setForm((previous) => ({ ...previous, [field]: event.target.value }));

  const toggleDay = (day) =>
    setForm((previous) => ({
      ...previous,
      weekdays: previous.weekdays.includes(day)
        ? previous.weekdays.filter((value) => value !== day)
        : [...previous.weekdays, day].sort((a, b) => a - b),
    }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    dispatch(generateSessions({
      application_id: application.id,
      start_date: form.start_date,
      weeks: Number(form.weeks),
      time_of_day: form.time_of_day,
      timezone: form.timezone,
      weekdays: form.weekdays,
    }));
  };

  const handleClose = () => {
    dispatch(clearGenerated());
    onClose();
  };

  const classesPerRun = form.weekdays.length * Number(form.weeks || 0);
  const errorFor = (field) => {
    const value = fieldErrors?.[field];
    return Array.isArray(value) ? value[0] : value;
  };

  const preferred = PREFERRED_DAYS_OPTIONS.find(
    (option) => option.value === application.preferred_days
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <CalendarPlus className="h-5 w-5 text-primary-600" />
            Schedule classes
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-2xl leading-none text-gray-400 hover:text-gray-600"
          >
            &times;
          </button>
        </div>

        {/* After a run, show what happened instead of the form again. */}
        {lastGenerated ? (
          <div className="space-y-4 px-6 py-6">
            <p className="text-lg font-semibold text-gray-900">
              {lastGenerated.created_count} classes scheduled
            </p>

            {lastGenerated.skipped_count > 0 && (
              <div className="rounded-lg bg-amber-50 p-4">
                <p className="font-medium text-amber-900">
                  {lastGenerated.skipped_count} slots were skipped
                </p>
                <ul className="mt-2 space-y-1 text-sm text-amber-800">
                  {lastGenerated.skipped.slice(0, 6).map((item) => (
                    <li key={item.start_time}>
                      {new Date(item.start_time).toLocaleString('en-GB', {
                        weekday: 'short', day: 'numeric', month: 'short',
                        hour: '2-digit', minute: '2-digit', hour12: false,
                      })}{' '}
                      — {item.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end">
              <button type="button" onClick={handleClose} className="btn-primary">
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
            <div className="rounded-lg bg-gray-50 p-3 text-sm">
              <p className="font-medium text-gray-900">{application.student_name}</p>
              <p className="text-gray-500">
                {application.course_details?.title}
                {application.assigned_teacher_details &&
                  ` · ${application.assigned_teacher_details.full_name}`}
              </p>
              {preferred && (
                <p className="mt-1 text-xs text-gray-500">
                  Requested: {preferred.label}, {application.preferred_time}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="start-date" className="mb-1 block text-sm font-medium text-gray-700">
                  Start date
                </label>
                <input
                  id="start-date" type="date" value={form.start_date}
                  onChange={update('start_date')} min={todayISO()} className="input-field"
                />
                {errorFor('start_date') && (
                  <p className="mt-1 text-sm text-red-500">{errorFor('start_date')}</p>
                )}
              </div>

              <div>
                <label htmlFor="weeks" className="mb-1 block text-sm font-medium text-gray-700">
                  How many weeks
                </label>
                <select id="weeks" value={form.weeks} onChange={update('weeks')} className="input-field">
                  {[1, 2, 4, 8, 12].map((n) => (
                    <option key={n} value={n}>{n} {n === 1 ? 'week' : 'weeks'}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="time-of-day" className="mb-1 block text-sm font-medium text-gray-700">
                  Class time
                </label>
                <input
                  id="time-of-day" type="time" value={form.time_of_day}
                  onChange={update('time_of_day')} className="input-field"
                />
              </div>

              <div>
                <label htmlFor="tz" className="mb-1 block text-sm font-medium text-gray-700">
                  In which timezone
                </label>
                <select id="tz" value={form.timezone} onChange={update('timezone')} className="input-field">
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <span className="mb-2 block text-sm font-medium text-gray-700">Days of the week</span>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => {
                  const on = form.weekdays.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      aria-pressed={on}
                      className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition ${
                        on
                          ? 'border-primary-600 bg-primary-600 text-white'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {day.short}
                    </button>
                  );
                })}
              </div>
              {errorFor('weekdays') && (
                <p className="mt-1 text-sm text-red-500">{errorFor('weekdays')}</p>
              )}
            </div>

            <p className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-900">
              This will create up to <strong>{classesPerRun} classes</strong>. Slots where
              the teacher is already booked are skipped and listed afterwards.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button" onClick={handleClose}
                className="rounded-lg border border-gray-300 px-5 py-2 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={generating || form.weekdays.length === 0}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generating ? 'Scheduling...' : 'Schedule classes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ScheduleClassesModal;
