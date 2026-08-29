import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { StatusBadge } from '../components/applications/ApplicationStatus';
import ApplicationReviewModal from '../components/applications/ApplicationReviewModal';
import { fetchApplications, setFilters, clearFilters } from '../redux/slices/applicationSlice';
import { fetchCourses } from '../redux/slices/courseSlice';
import { APPLICATION_STATUS_LABELS } from '../utils/constants';

const PAGE_SIZE = 20; // matches REST_FRAMEWORK['PAGE_SIZE']

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

const AdminPanel = () => {
  const dispatch = useDispatch();
  const { items, count, loading, error, filters } = useSelector((state) => state.applications);
  const { courses } = useSelector((state) => state.courses);

  const [reviewing, setReviewing] = useState(null);
  const [searchInput, setSearchInput] = useState(filters.search);

  useEffect(() => {
    dispatch(fetchCourses());
    return () => {
      dispatch(clearFilters());
    };
  }, [dispatch]);

  // Typing in the search box shouldn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(setFilters({ search: searchInput }));
    }, 350);
    return () => clearTimeout(timer);
  }, [dispatch, searchInput]);

  useEffect(() => {
    dispatch(fetchApplications(filters));
  }, [dispatch, filters]);

  // The open record must track the list, so a save is reflected behind the modal.
  const openApplication = useMemo(
    () => (reviewing ? items.find((item) => item.id === reviewing) ?? null : null),
    [reviewing, items]
  );

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const statusCounts = useMemo(
    () =>
      items.reduce((tally, item) => {
        tally[item.status] = (tally[item.status] ?? 0) + 1;
        return tally;
      }, {}),
    [items]
  );

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container-custom space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-gray-600">Review course applications and assign teachers.</p>
        </div>

        {/* Counts for the current page - a quick read on the review queue. */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Total applications</p>
            <p className="text-2xl font-bold">{count}</p>
          </div>
          {['pending', 'approved', 'active'].map((status) => (
            <div key={status} className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-sm text-gray-500">{APPLICATION_STATUS_LABELS[status]} (this page)</p>
              <p className="text-2xl font-bold">{statusCounts[status] ?? 0}</p>
            </div>
          ))}
        </div>

        {/* Filters map 1:1 onto the list view's filterset + search backend. */}
        <div className="grid gap-4 rounded-xl border border-gray-200 bg-white p-5 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="input-field"
              placeholder="Student, parent, email or phone"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(event) => dispatch(setFilters({ status: event.target.value }))}
              className="input-field"
            >
              <option value="">All statuses</option>
              {Object.entries(APPLICATION_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
            <select
              value={filters.course}
              onChange={(event) => dispatch(setFilters({ course: event.target.value }))}
              className="input-field"
            >
              <option value="">All courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {loading && (
            <div className="py-12">
              <LoadingSpinner />
            </div>
          )}

          {!loading && error && (
            <div className="p-8 text-center">
              <p className="text-gray-700">{error}</p>
              <button type="button" onClick={() => dispatch(fetchApplications(filters))} className="btn-primary mt-4">
                Try again
              </button>
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <p className="p-8 text-center text-gray-600">No applications match these filters.</p>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Course</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Teacher</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Applied</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((application) => (
                    <tr key={application.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{application.student_name}</p>
                        <p className="text-xs text-gray-500">Age {application.student_age}</p>
                      </td>
                      <td className="px-4 py-3">{application.course_details?.title ?? '-'}</td>
                      <td className="px-4 py-3">
                        <p>{application.parent_name}</p>
                        <p className="text-xs text-gray-500">{application.parent_email}</p>
                      </td>
                      <td className="px-4 py-3">{application.assigned_teacher_details?.full_name ?? '-'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={application.status} label={application.status_display} />
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(application.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setReviewing(application.id)}
                          className="font-medium text-primary-600 hover:text-primary-700"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Page {filters.page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={filters.page <= 1}
                onClick={() => dispatch(setFilters({ page: filters.page - 1 }))}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={filters.page >= totalPages}
                onClick={() => dispatch(setFilters({ page: filters.page + 1 }))}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {openApplication && (
        <ApplicationReviewModal application={openApplication} onClose={() => setReviewing(null)} />
      )}
    </div>
  );
};

export default AdminPanel;
