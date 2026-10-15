import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ClipboardCheck } from 'lucide-react';
import { markAttendance } from '../../redux/slices/attendanceSlice';
import { fetchUpcomingSessions, fetchSessionHistory } from '../../redux/slices/sessionSlice';
import useTimeZone from '../../hooks/useTimeZone';

const PERFORMANCE = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'average', label: 'Average' },
  { value: 'needs_improvement', label: 'Needs improvement' },
];

/**
 * Record who turned up to one class.
 *
 * Saving also marks the class completed and recalculates the student's monthly
 * attendance percentage on the server, so both session lists are refetched
 * afterwards rather than patched locally.
 */
const AttendanceModal = ({ session, onClose }) => {
  const dispatch = useDispatch();
  const tz = useTimeZone();
  const { saving, fieldErrors } = useSelector((state) => state.attendance);

  const [form, setForm] = useState({
    is_present: true,
    is_late: false,
    duration_attended: session.duration_minutes ?? 45,
    student_performance: 'good',
    teacher_remarks: '',
  });

  const set = (field, value) => setForm((previous) => ({ ...previous, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();

    const result = await dispatch(markAttendance({
      session_id: session.id,
      ...form,
      // An absent student attended nothing, whatever the box says.
      duration_attended: form.is_present ? Number(form.duration_attended) : 0,
    }));

    if (markAttendance.fulfilled.match(result)) {
      dispatch(fetchUpcomingSessions());
      dispatch(fetchSessionHistory());
      onClose();
    }
  };

  const errorFor = (field) => {
    const value = fieldErrors?.[field] ?? fieldErrors?.error;
    return Array.isArray(value) ? value[0] : value;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ClipboardCheck className="h-5 w-5 text-primary-600" />
            Mark attendance
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-gray-400 hover:text-gray-600"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <div className="rounded-lg bg-gray-50 p-3 text-sm">
            <p className="font-medium text-gray-900">{session.student_name}</p>
            <p className="text-gray-500">
              {session.course_title} · {tz.dayLabel(session.start_time)} at{' '}
              {tz.time(session.start_time)}
            </p>
          </div>

          {/* Present / absent is the whole point, so make it the biggest control. */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { present: true, label: 'Present', tone: 'green' },
              { present: false, label: 'Absent', tone: 'red' },
            ].map(({ present, label, tone }) => {
              const active = form.is_present === present;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => set('is_present', present)}
                  aria-pressed={active}
                  className={`rounded-lg border-2 py-3 font-semibold transition ${
                    active
                      ? tone === 'green'
                        ? 'border-green-600 bg-green-50 text-green-800'
                        : 'border-red-600 bg-red-50 text-red-800'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Everything below only makes sense for a student who showed up. */}
          {form.is_present && (
            <>
              <label className="flex items-center gap-2.5 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.is_late}
                  onChange={(event) => set('is_late', event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                The student joined late
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="duration" className="mb-1 block text-sm font-medium text-gray-700">
                    Minutes attended
                  </label>
                  <input
                    id="duration" type="number" min="0"
                    max={session.duration_minutes ?? 240}
                    value={form.duration_attended}
                    onChange={(event) => set('duration_attended', event.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label htmlFor="performance" className="mb-1 block text-sm font-medium text-gray-700">
                    How did they do?
                  </label>
                  <select
                    id="performance" value={form.student_performance}
                    onChange={(event) => set('student_performance', event.target.value)}
                    className="input-field"
                  >
                    {PERFORMANCE.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          <div>
            <label htmlFor="remarks" className="mb-1 block text-sm font-medium text-gray-700">
              Notes for this class
            </label>
            <textarea
              id="remarks" rows={3} value={form.teacher_remarks}
              onChange={(event) => set('teacher_remarks', event.target.value)}
              className="input-field"
              placeholder={form.is_present
                ? 'What was covered, how it went...'
                : 'Did the parent give a reason?'}
            />
          </div>

          {errorFor('session') && <p className="text-sm text-red-500">{errorFor('session')}</p>}

          <div className="flex justify-end gap-3">
            <button
              type="button" onClick={onClose}
              className="rounded-lg border border-gray-300 px-5 py-2 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={saving}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save attendance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AttendanceModal;
