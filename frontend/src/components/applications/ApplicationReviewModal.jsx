import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { authAPI } from '../../api/endpoints';
import { updateApplicationStatus } from '../../redux/slices/applicationSlice';
import { APPLICATION_STATUS_LABELS } from '../../utils/constants';
import ApplicationStatus from './ApplicationStatus';

/**
 * Admin review of one application: read the submission, then move it along.
 *
 * Mirrors ApplicationStatusUpdateSerializer - status, assigned_teacher,
 * assigned_time_slot, admin_notes - and honours its rule that an approval
 * must name a teacher.
 */
const ApplicationReviewModal = ({ application, onClose }) => {
  const dispatch = useDispatch();
  const { updatingId, fieldErrors } = useSelector((state) => state.applications);

  const [teachers, setTeachers] = useState([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [form, setForm] = useState({
    status: application.status,
    assigned_teacher: application.assigned_teacher ?? '',
    assigned_time_slot: application.assigned_time_slot ?? '',
    admin_notes: application.admin_notes ?? '',
  });
  const [localError, setLocalError] = useState(null);

  const saving = updatingId === application.id;

  useEffect(() => {
    let cancelled = false;
    setTeachersLoading(true);
    authAPI
      .listTeachers()
      .then(({ data }) => {
        if (!cancelled) setTeachers(data?.results ?? data ?? []);
      })
      .catch(() => {
        if (!cancelled) setTeachers([]);
      })
      .finally(() => {
        if (!cancelled) setTeachersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = (field) => (event) => {
    setLocalError(null);
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();

    // The backend rejects this too; catching it here avoids a wasted round trip.
    if (form.status === 'approved' && !form.assigned_teacher) {
      setLocalError('Assign a teacher before approving this application.');
      return;
    }

    const payload = { id: application.id, ...form };
    if (!payload.assigned_teacher) delete payload.assigned_teacher;

    const result = await dispatch(updateApplicationStatus(payload));
    if (updateApplicationStatus.fulfilled.match(result)) onClose();
  };

  const teacherName = (teacher) =>
    [teacher.first_name, teacher.last_name].filter(Boolean).join(' ') || teacher.username || teacher.email;

  const serverError = (field) => {
    const value = fieldErrors?.[field];
    if (!value) return null;
    return Array.isArray(value) ? value[0] : String(value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-3xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold">Review application</h2>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-gray-400 hover:text-gray-600">
            &times;
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-6">
          <ApplicationStatus application={application} />

          <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900">Decision</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={update('status')} className="input-field">
                  {Object.entries(APPLICATION_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                {serverError('status') && <p className="text-red-500 text-sm mt-1">{serverError('status')}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned teacher {form.status === 'approved' && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={form.assigned_teacher}
                  onChange={update('assigned_teacher')}
                  className="input-field"
                  disabled={teachersLoading}
                >
                  <option value="">{teachersLoading ? 'Loading teachers...' : 'Not assigned'}</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>{teacherName(teacher)}</option>
                  ))}
                </select>
                {serverError('assigned_teacher') && (
                  <p className="text-red-500 text-sm mt-1">{serverError('assigned_teacher')}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time slot</label>
                <input
                  value={form.assigned_time_slot}
                  onChange={update('assigned_time_slot')}
                  className="input-field"
                  placeholder="e.g. Monday 5:00 PM"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin notes</label>
              <textarea
                value={form.admin_notes}
                onChange={update('admin_notes')}
                rows={3}
                className="input-field"
                placeholder="Internal notes - not shown to the applicant"
              />
            </div>

            {localError && <p className="text-red-500 text-sm">{localError}</p>}

            <div className="flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? 'Saving...' : 'Save decision'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ApplicationReviewModal;
