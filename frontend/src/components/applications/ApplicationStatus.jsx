import React from 'react';
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_STYLES,
  PREFERRED_DAYS_OPTIONS,
  PREFERRED_TIME_OPTIONS,
} from '../../utils/constants';

const labelFor = (options, value) =>
  options.find((option) => option.value === value)?.label ?? value ?? '-';

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : '-';

/** Status pill, shared by the applicant view and the admin table. */
export const StatusBadge = ({ status, label }) => (
  <span
    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
      APPLICATION_STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700'
    }`}
  >
    {label ?? APPLICATION_STATUS_LABELS[status] ?? status}
  </span>
);

/** What happens next, per status - the question every applicant actually has. */
const NEXT_STEP = {
  pending: "We're reviewing your application. Expect to hear from us within 24 hours.",
  approved: 'Approved. Your teacher and time slot are shown below - we will email your login details.',
  waiting_payment: 'Approved, pending payment. Complete the first month to lock in your slot.',
  active: 'You are enrolled. Your classes appear on your dashboard.',
  completed: 'This course is complete. Congratulations!',
  rejected: 'This application was not accepted. You are welcome to apply for another course.',
  withdrawn: 'This application was withdrawn.',
};

const Row = ({ label, value }) => (
  <div>
    <dt className="text-sm text-gray-500">{label}</dt>
    <dd className="font-medium text-gray-900 break-words">{value || '-'}</dd>
  </div>
);

/**
 * Read-only view of one application, driven by the API record.
 * `application` is the serialized shape from applications/serializers.py.
 */
const ApplicationStatus = ({ application, compact = false }) => {
  if (!application) return null;

  const {
    id,
    student_name,
    student_age,
    status,
    status_display,
    course_details,
    assigned_teacher_details,
    assigned_time_slot,
    preferred_days,
    preferred_time,
    preferred_timezone,
    parent_name,
    parent_email,
    parent_phone,
    special_requests,
    created_at,
    updated_at,
  } = application;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{student_name}</h3>
          <p className="text-sm text-gray-500">
            {course_details?.title ?? 'Course'} &middot; submitted {formatDate(created_at)}
          </p>
        </div>
        <StatusBadge status={status} label={status_display} />
      </div>

      <p className="mt-4 text-sm text-gray-700">{NEXT_STEP[status] ?? ''}</p>

      {!compact && (
        <>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <Row label="Application reference" value={<span className="font-mono text-xs">{id}</span>} />
            <Row label="Student age" value={student_age} />
            <Row label="Course" value={course_details?.title} />
            <Row label="Monthly fee" value={course_details?.price ? `$${course_details.price}` : '-'} />
            <Row label="Preferred days" value={labelFor(PREFERRED_DAYS_OPTIONS, preferred_days)} />
            <Row label="Preferred time" value={labelFor(PREFERRED_TIME_OPTIONS, preferred_time)} />
            <Row label="Timezone" value={preferred_timezone} />
            <Row label="Last updated" value={formatDate(updated_at)} />
          </dl>

          {(assigned_teacher_details || assigned_time_slot) && (
            <div className="mt-6 rounded-lg bg-primary-50 p-4">
              <h4 className="font-semibold text-primary-800">Your assignment</h4>
              <dl className="mt-3 grid gap-4 sm:grid-cols-2">
                <Row label="Teacher" value={assigned_teacher_details?.full_name} />
                <Row label="Time slot" value={assigned_time_slot} />
              </dl>
            </div>
          )}

          <div className="mt-6 border-t border-gray-100 pt-4">
            <h4 className="font-semibold text-gray-900">Contact on file</h4>
            <dl className="mt-3 grid gap-4 sm:grid-cols-3">
              <Row label="Parent/Guardian" value={parent_name} />
              <Row label="Email" value={parent_email} />
              <Row label="Phone" value={parent_phone} />
            </dl>
          </div>

          {special_requests && (
            <div className="mt-6 border-t border-gray-100 pt-4">
              <h4 className="font-semibold text-gray-900">Your notes</h4>
              <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">{special_requests}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ApplicationStatus;
