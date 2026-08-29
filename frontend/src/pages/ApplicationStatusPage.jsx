import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import ApplicationStatus, { StatusBadge } from '../components/applications/ApplicationStatus';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { fetchApplicationById, fetchMyApplications, clearCurrent } from '../redux/slices/applicationSlice';
import { getSubmittedApplications, forgetApplication } from '../api/applicationStorage';
import useAuth from '../hooks/useAuth';

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

/**
 * Track a course application.
 *
 * Applications are submitted anonymously but read back behind a login, so this
 * page works at two levels: the local receipt is always available, and the live
 * record is fetched once the applicant signs in with the email they applied
 * under. Without a session we show the receipt and say what to do next.
 */
const ApplicationStatusPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { items, current, loading, error, lastSubmitted } = useSelector((state) => state.applications);

  const [receipts, setReceipts] = useState(() => getSubmittedApplications());

  useEffect(() => {
    if (id && isAuthenticated) {
      dispatch(fetchApplicationById(id));
    }
    return () => {
      dispatch(clearCurrent());
    };
  }, [dispatch, id, isAuthenticated]);

  // Signed in with no id in the URL: the server knows every application tied
  // to this account, including ones submitted from another device.
  useEffect(() => {
    if (!id && isAuthenticated) {
      dispatch(fetchMyApplications());
    }
  }, [dispatch, id, isAuthenticated]);

  // The server list is authoritative; local receipts fill in applications this
  // browser submitted that are not linked to an account yet.
  const listed = useMemo(() => {
    const fromServer = (isAuthenticated ? items : []).map((application) => ({
      id: application.id,
      student_name: application.student_name,
      course_title: application.course_details?.title ?? '',
      status: application.status,
      status_display: application.status_display,
      submitted_at: application.created_at,
      local: false,
    }));
    const serverIds = new Set(fromServer.map((item) => item.id));
    return [
      ...fromServer,
      ...receipts.filter((receipt) => !serverIds.has(receipt.id)).map((receipt) => ({ ...receipt, local: true })),
    ];
  }, [isAuthenticated, items, receipts]);

  // The record we just submitted is the freshest thing we have for this id.
  const submittedReceipt = lastSubmitted?.id === id ? lastSubmitted : null;
  const application = current ?? submittedReceipt;
  const localReceipt = receipts.find((item) => item.id === id);

  const handleForget = (applicationId) => {
    setReceipts(forgetApplication(applicationId));
  };

  // --- No id in the URL: the list of applications this browser submitted ----
  if (!id) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container-custom max-w-3xl">
          <h1 className="text-3xl font-bold mb-2">Your Applications</h1>
          <p className="text-gray-600 mb-8">
            {isAuthenticated
              ? 'Applications linked to your account, plus any submitted from this device.'
              : 'Applications submitted from this device. Select one to see its current status.'}
          </p>

          {listed.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              <p className="text-gray-600">You haven&apos;t submitted an application yet.</p>
              <Link to="/apply" className="btn-primary mt-4 inline-block">
                Apply for a course
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {listed.map((receipt) => (
                <li
                  key={receipt.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{receipt.student_name}</p>
                    <p className="text-sm text-gray-500">
                      {receipt.course_title} &middot; {formatDate(receipt.submitted_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={receipt.status} label={receipt.status_display} />
                    <Link
                      to={`/application-status/${receipt.id}`}
                      className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                    >
                      View
                    </Link>
                    {receipt.local && (
                      <button
                        type="button"
                        onClick={() => handleForget(receipt.id)}
                        className="text-sm text-gray-400 hover:text-red-600"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  // --- A specific application ---------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container-custom max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Application Status</h1>
          <button type="button" onClick={() => navigate('/application-status')} className="text-sm text-primary-600 hover:text-primary-700">
            All applications
          </button>
        </div>

        {loading && <LoadingSpinner />}

        {!loading && application && <ApplicationStatus application={application} />}

        {/* Signed out, or the record belongs to another account: the receipt is
            all we can show, so explain how to see the live status. */}
        {!loading && !application && localReceipt && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{localReceipt.student_name}</h3>
                <p className="text-sm text-gray-500">
                  {localReceipt.course_title} &middot; submitted {formatDate(localReceipt.submitted_at)}
                </p>
              </div>
              <StatusBadge status={localReceipt.status} />
            </div>
            <p className="mt-4 text-sm text-gray-700">
              We have your application. Reference{' '}
              <span className="font-mono text-xs">{localReceipt.id}</span> &mdash; keep it for your records.
            </p>
            {!isAuthenticated && (
              <div className="mt-4 rounded-lg bg-primary-50 p-4 text-sm text-primary-900">
                Sign in with the email you applied under to follow this application live.
                <div className="mt-3 flex gap-3">
                  <Link to="/login" className="btn-primary text-sm py-2 px-4">Sign in</Link>
                  <Link to="/register" className="btn-outline text-sm py-2 px-4">Create an account</Link>
                </div>
              </div>
            )}
            {isAuthenticated && error && (
              <p className="mt-4 text-sm text-gray-600">
                This application isn&apos;t linked to your account yet. It becomes visible once it is
                approved, or if you sign in with{' '}
                <span className="font-medium">the email used on the form</span>.
              </p>
            )}
          </div>
        )}

        {/* Nothing local and nothing fetched - a stale or foreign link. */}
        {!loading && !application && !localReceipt && (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-700">{error ?? 'We could not find that application.'}</p>
            {!isAuthenticated && (
              <p className="mt-2 text-sm text-gray-500">
                You may need to <Link to="/login" className="text-primary-600">sign in</Link> to view it.
              </p>
            )}
            <Link to="/apply" className="btn-primary mt-4 inline-block">
              Apply for a course
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationStatusPage;
