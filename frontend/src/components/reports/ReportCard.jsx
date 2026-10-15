import React from 'react';
import { FileText, Pencil } from 'lucide-react';

const Section = ({ title, body }) =>
  body ? (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h4>
      <p className="mt-1 whitespace-pre-line text-sm text-gray-800">{body}</p>
    </div>
  ) : null;

const rateTone = (percentage) => {
  if (percentage >= 85) return 'text-green-700';
  if (percentage >= 60) return 'text-amber-700';
  return 'text-red-700';
};

/**
 * One month's report, as the parent reads it.
 *
 * `onEdit` is only passed on the teacher's own screens, which is what keeps
 * this one component usable by both sides.
 */
const ReportCard = ({ report, onEdit }) => {
  if (!report) return null;

  const percentage = Number(report.attendance_percentage ?? 0);

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <FileText className="h-5 w-5 text-primary-600" />
            {report.period}
          </h3>
          <p className="mt-0.5 text-sm text-gray-500">
            {report.course_title}
            {report.teacher_name && ` · ${report.teacher_name}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!report.is_finalized && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              Draft
            </span>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(report)}
              className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          )}
        </div>
      </header>

      <div className="mt-4 flex flex-wrap gap-6 rounded-lg bg-gray-50 px-4 py-3">
        <div>
          <p className="text-xs text-gray-500">Classes held</p>
          <p className="text-lg font-semibold text-gray-900">{report.total_classes}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Attended</p>
          <p className="text-lg font-semibold text-gray-900">{report.classes_attended}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Attendance</p>
          <p className={`text-lg font-semibold ${rateTone(percentage)}`}>
            {percentage.toFixed(0)}%
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <Section title="Covered this month" body={report.topics_covered} />
        <Section title="Surahs memorised" body={report.surahs_memorized} />
        <Section title="Tajweed progress" body={report.tajweed_improvement} />
        <Section title="Projects completed" body={report.projects_completed} />
        <Section title="Skills gained" body={report.skills_acquired} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Section title="Strengths" body={report.strengths} />
          <Section title="Areas to work on" body={report.areas_for_improvement} />
        </div>

        {report.teacher_comments && (
          <div className="rounded-lg bg-primary-50 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-primary-800">
              From the teacher
            </h4>
            <p className="mt-1 whitespace-pre-line text-sm text-primary-900">
              {report.teacher_comments}
            </p>
          </div>
        )}

        <Section title="Recommended next level" body={report.recommended_next_level} />
      </div>
    </article>
  );
};

export default ReportCard;
