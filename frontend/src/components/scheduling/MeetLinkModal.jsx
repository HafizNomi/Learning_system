import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Video } from 'lucide-react';
import { updateSession } from '../../redux/slices/sessionSlice';
import useTimeZone from '../../hooks/useTimeZone';

/**
 * Paste the Google Meet link for one class.
 *
 * Meet has no "create me a room" API without a Google Cloud project, so the
 * teacher makes the link at meet.google.com/new and pastes it here. When that
 * is automated later, only this modal is replaced - the `meeting_link` field
 * and every screen reading it stay exactly the same.
 */
const MeetLinkModal = ({ session, onClose }) => {
  const dispatch = useDispatch();
  const tz = useTimeZone();
  const { updatingId, fieldErrors } = useSelector((state) => state.sessions);

  const [link, setLink] = useState(session.meeting_link ?? '');
  const saving = updatingId === session.id;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await dispatch(updateSession({ id: session.id, meeting_link: link.trim() }));
    if (updateSession.fulfilled.match(result)) onClose();
  };

  const serverError = Array.isArray(fieldErrors?.meeting_link)
    ? fieldErrors.meeting_link[0]
    : fieldErrors?.meeting_link;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Video className="h-5 w-5 text-primary-600" />
            Meeting link
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-gray-400 hover:text-gray-600"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
            <p className="font-medium">{session.course_title}</p>
            <p className="text-gray-500">
              {tz.dayLabel(session.start_time)} at {tz.time(session.start_time)}
              {session.student_name && ` · with ${session.student_name}`}
            </p>
          </div>

          <ol className="list-inside list-decimal space-y-1 text-sm text-gray-600">
            <li>
              Open{' '}
              <a
                href="https://meet.google.com/new"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary-600 hover:underline"
              >
                meet.google.com/new
              </a>
            </li>
            <li>Copy the link Google gives you</li>
            <li>Paste it below and save</li>
          </ol>

          <div>
            <label htmlFor="meeting-link" className="mb-1 block text-sm font-medium text-gray-700">
              Meeting link
            </label>
            <input
              id="meeting-link"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              className="input-field"
              placeholder="https://meet.google.com/abc-defg-hij"
              autoFocus
            />
            {serverError && <p className="mt-1 text-sm text-red-500">{serverError}</p>}
            <p className="mt-1.5 text-xs text-gray-500">
              The student sees a Join button from 10 minutes before the class starts.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-5 py-2 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !link.trim()}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MeetLinkModal;
