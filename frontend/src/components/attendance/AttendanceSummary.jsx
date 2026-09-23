import React from 'react';
import { CheckCircle2, XCircle, Clock3 } from 'lucide-react';
import useTimeZone from '../../hooks/useTimeZone';

/** Green when healthy, amber when slipping, red when it needs a conversation. */
const rateTone = (percentage) => {
  if (percentage >= 85) return { bar: 'bg-green-600', text: 'text-green-700' };
  if (percentage >= 60) return { bar: 'bg-amber-500', text: 'text-amber-700' };
  return { bar: 'bg-red-600', text: 'text-red-700' };
};

/** One month's attendance, as a parent wants to read it. */
export const MonthlySummaryCard = ({ summary }) => {
  const percentage = Number(summary.attendance_percentage ?? 0);
  const tone = rateTone(percentage);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900">{summary.period}</h3>
          <p className="text-sm text-gray-500">{summary.course_title}</p>
        </div>
        <span className={`text-2xl font-bold ${tone.text}`}>{percentage.toFixed(0)}%</span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div>
          <dt className="text-xs text-gray-500">Attended</dt>
          <dd className="text-lg font-semibold text-green-700">{summary.present_sessions}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Missed</dt>
          <dd className="text-lg font-semibold text-red-700">{summary.absent_sessions}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Late</dt>
          <dd className="text-lg font-semibold text-amber-700">{summary.late_sessions}</dd>
        </div>
      </dl>

      {summary.teacher_feedback && (
        <p className="mt-4 border-t border-gray-100 pt-3 text-sm text-gray-700">
          {summary.teacher_feedback}
        </p>
      )}
    </div>
  );
};

/** The class-by-class list underneath the monthly figures. */
const AttendanceSummary = ({ records = [], summaries = [] }) => {
  const tz = useTimeZone();

  if (summaries.length === 0 && records.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
        No attendance recorded yet. It appears here once classes have been taught.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {summaries.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {summaries.map((summary) => (
            <MonthlySummaryCard key={summary.id} summary={summary} />
          ))}
        </div>
      )}

      {records.length > 0 && (
        <div>
          <h3 className="mb-3 font-semibold text-gray-900">Every class</h3>
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
            {records.map((record) => (
              <li key={record.id} className="flex flex-wrap items-center gap-3 p-4">
                {record.is_present ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0 text-red-600" />
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {record.course_title}
                    {record.is_late && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        <Clock3 className="h-3 w-3" /> Late
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">{tz.dateTime(record.session_time)}</p>
                  {record.teacher_remarks && (
                    <p className="mt-1 text-sm text-gray-600">{record.teacher_remarks}</p>
                  )}
                </div>

                {record.is_present && record.performance_display && (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                    {record.performance_display}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AttendanceSummary;
