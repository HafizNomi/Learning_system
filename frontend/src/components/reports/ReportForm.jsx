import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FileText } from 'lucide-react';
import { saveReport } from '../../redux/slices/reportSlice';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Quran courses and tech courses need different questions asked. */
const QURAN_CATEGORIES = ['quran', 'quran_memorization', 'tajweed'];

const Field = ({ id, label, hint, error, children }) => (
  <div>
    <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
      {label}
    </label>
    {children}
    {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
  </div>
);

/**
 * The teacher's monthly write-up for one student.
 *
 * Attendance numbers are not asked for - the server works them out from the
 * completed classes, so they can never disagree with the attendance register.
 */
const ReportForm = ({ student, course, existing = null, onClose }) => {
  const dispatch = useDispatch();
  const { saving, fieldErrors } = useSelector((state) => state.reports);

  const now = new Date();
  const [form, setForm] = useState({
    month: existing?.month ?? now.getMonth() + 1,
    year: existing?.year ?? now.getFullYear(),
    topics_covered: existing?.topics_covered ?? '',
    strengths: existing?.strengths ?? '',
    areas_for_improvement: existing?.areas_for_improvement ?? '',
    surahs_memorized: existing?.surahs_memorized ?? '',
    tajweed_improvement: existing?.tajweed_improvement ?? '',
    projects_completed: existing?.projects_completed ?? '',
    skills_acquired: existing?.skills_acquired ?? '',
    teacher_comments: existing?.teacher_comments ?? '',
    recommended_next_level: existing?.recommended_next_level ?? '',
    is_finalized: existing?.is_finalized ?? false,
  });

  const set = (field) => (event) =>
    setForm((previous) => ({ ...previous, [field]: event.target.value }));

  const isQuran = QURAN_CATEGORIES.includes(course?.category);

  const submit = async (finalise) => {
    const result = await dispatch(saveReport({
      ...form,
      student_id: student.id,
      course_id: course.id,
      is_finalized: finalise,
    }));
    if (saveReport.fulfilled.match(result)) onClose();
  };

  const errorFor = (field) => {
    const value = fieldErrors?.[field];
    return Array.isArray(value) ? value[0] : value;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <FileText className="h-5 w-5 text-primary-600" />
            Monthly report
          </h2>
          <button
            type="button" onClick={onClose}
            className="text-2xl leading-none text-gray-400 hover:text-gray-600"
          >
            &times;
          </button>
        </div>

        <form
          onSubmit={(event) => { event.preventDefault(); submit(true); }}
          className="max-h-[72vh] space-y-5 overflow-y-auto px-6 py-5"
        >
          <div className="rounded-lg bg-gray-50 p-3 text-sm">
            <p className="font-medium text-gray-900">{student.name}</p>
            <p className="text-gray-500">{course?.title}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="month" label="Month" error={errorFor('month')}>
              <select id="month" value={form.month} onChange={set('month')} className="input-field">
                {MONTHS.map((name, index) => (
                  <option key={name} value={index + 1}>{name}</option>
                ))}
              </select>
            </Field>
            <Field id="year" label="Year" error={errorFor('year')}>
              <select id="year" value={form.year} onChange={set('year')} className="input-field">
                {[now.getFullYear() - 1, now.getFullYear()].map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field
            id="topics" label="What was covered"
            hint="The lessons and material you worked through this month."
            error={errorFor('topics_covered')}
          >
            <textarea
              id="topics" rows={3} value={form.topics_covered}
              onChange={set('topics_covered')} className="input-field"
            />
          </Field>

          {/* The questions that only make sense for this kind of course. */}
          {isQuran ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="surahs" label="Surahs memorised" error={errorFor('surahs_memorized')}>
                <textarea
                  id="surahs" rows={2} value={form.surahs_memorized}
                  onChange={set('surahs_memorized')} className="input-field"
                  placeholder="Al-Mulk, Ya-Sin..."
                />
              </Field>
              <Field id="tajweed" label="Tajweed progress" error={errorFor('tajweed_improvement')}>
                <textarea
                  id="tajweed" rows={2} value={form.tajweed_improvement}
                  onChange={set('tajweed_improvement')} className="input-field"
                  placeholder="Makharij, ghunnah, madd..."
                />
              </Field>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="projects" label="Projects completed" error={errorFor('projects_completed')}>
                <textarea
                  id="projects" rows={2} value={form.projects_completed}
                  onChange={set('projects_completed')} className="input-field"
                />
              </Field>
              <Field id="skills" label="Skills gained" error={errorFor('skills_acquired')}>
                <textarea
                  id="skills" rows={2} value={form.skills_acquired}
                  onChange={set('skills_acquired')} className="input-field"
                />
              </Field>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="strengths" label="Strengths" error={errorFor('strengths')}>
              <textarea
                id="strengths" rows={3} value={form.strengths}
                onChange={set('strengths')} className="input-field"
              />
            </Field>
            <Field id="improve" label="Areas to work on" error={errorFor('areas_for_improvement')}>
              <textarea
                id="improve" rows={3} value={form.areas_for_improvement}
                onChange={set('areas_for_improvement')} className="input-field"
              />
            </Field>
          </div>

          <Field
            id="comments" label="Your comments to the parent"
            hint="This is the part parents read first. Be specific and encouraging."
            error={errorFor('teacher_comments')}
          >
            <textarea
              id="comments" rows={4} value={form.teacher_comments}
              onChange={set('teacher_comments')} className="input-field"
            />
          </Field>

          <Field id="next" label="Recommended next level" error={errorFor('recommended_next_level')}>
            <input
              id="next" value={form.recommended_next_level}
              onChange={set('recommended_next_level')} className="input-field"
              placeholder="e.g. Intermediate Tajweed"
            />
          </Field>

          <p className="rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-900">
            Attendance figures are calculated automatically from the classes you
            have marked, so they always match the register.
          </p>

          <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button" onClick={onClose}
              className="rounded-lg border border-gray-300 px-5 py-2 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button" onClick={() => submit(false)} disabled={saving}
              className="rounded-lg border border-primary-600 px-5 py-2 font-medium text-primary-600 hover:bg-primary-50 disabled:opacity-50"
            >
              Save draft
            </button>
            <button
              type="submit" disabled={saving || !form.teacher_comments.trim()}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Finalise & send to parent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportForm;
