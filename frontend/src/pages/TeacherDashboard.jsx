import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CalendarDays, Users, Video, AlertTriangle, ClipboardList } from 'lucide-react';
import SessionCard from '../components/scheduling/SessionCard';
import SessionCalendar from '../components/scheduling/SessionCalendar';
import MeetLinkModal from '../components/scheduling/MeetLinkModal';
import AttendanceModal from '../components/attendance/AttendanceModal';
import ReportForm from '../components/reports/ReportForm';
import ReportCard from '../components/reports/ReportCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { fetchUpcomingSessions, fetchSessionHistory, updateSession } from '../redux/slices/sessionSlice';
import { fetchReports } from '../redux/slices/reportSlice';
import useTimeZone from '../hooks/useTimeZone';
import useAuth from '../hooks/useAuth';

const Stat = ({ icon: Icon, label, value, tone = 'default' }) => (
  <div
    className={`rounded-xl border p-5 ${
      tone === 'warn' ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'
    }`}
  >
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <Icon className="h-4 w-4" />
      {label}
    </div>
    <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
  </div>
);

const TeacherDashboard = () => {
  const dispatch = useDispatch();
  const tz = useTimeZone();
  const { user } = useAuth();
  const { upcoming, history, loading } = useSelector((state) => state.sessions);
  const { items: reports } = useSelector((state) => state.reports);

  const [tab, setTab] = useState('today');
  const [linkingSession, setLinkingSession] = useState(null);
  const [markingSession, setMarkingSession] = useState(null);
  const [writingReport, setWritingReport] = useState(null);

  useEffect(() => {
    dispatch(fetchUpcomingSessions());
    dispatch(fetchSessionHistory());
    dispatch(fetchReports());
  }, [dispatch]);

  const todaysClasses = useMemo(
    () => upcoming.filter((session) => tz.isSameDay(session.start_time)),
    [upcoming, tz]
  );

  // The thing a teacher most needs prompting about: a class with no link yet.
  const missingLinks = useMemo(
    () => upcoming.filter((session) => !session.meeting_link),
    [upcoming]
  );

  const uniqueStudents = useMemo(
    () => new Set(upcoming.map((session) => session.student)).size,
    [upcoming]
  );

  // A finished class still marked 'scheduled' has not had its register taken.
  const needsAttendance = useMemo(
    () => history.filter((session) => session.status === 'scheduled'),
    [history]
  );

  // Who this teacher could write a report about, from the classes they teach.
  const studentsTaught = useMemo(() => {
    const seen = new Map();
    [...history, ...upcoming].forEach((session) => {
      if (!seen.has(session.student)) {
        seen.set(session.student, {
          id: session.student,
          name: session.student_name,
          course: { id: session.course, title: session.course_title },
        });
      }
    });
    return [...seen.values()];
  }, [history, upcoming]);

  const handleCancel = (session) => {
    const reason = window.prompt('Why is this class being cancelled?');
    if (!reason?.trim()) return;
    dispatch(updateSession({
      id: session.id, status: 'cancelled', cancellation_reason: reason.trim(),
    }));
  };

  // The modals read from the store, so they reflect the latest save.
  const activeLinkSession = linkingSession
    ? upcoming.find((item) => item.id === linkingSession) ?? null
    : null;
  const activeMarkSession = markingSession
    ? history.find((item) => item.id === markingSession) ?? null
    : null;

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container-custom space-y-8">
        <div>
          <h1 className="text-3xl font-bold">
            Assalamu alaikum{user?.first_name ? `, ${user.first_name}` : ''}
          </h1>
          <p className="text-gray-600">
            {todaysClasses.length === 0
              ? 'No classes today.'
              : `You have ${todaysClasses.length} ${
                  todaysClasses.length === 1 ? 'class' : 'classes'
                } today. Times in ${tz.zone}.`}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Stat icon={CalendarDays} label="Today" value={todaysClasses.length} />
          <Stat icon={CalendarDays} label="Upcoming" value={upcoming.length} />
          <Stat icon={Users} label="Students" value={uniqueStudents} />
          <Stat
            icon={ClipboardList}
            label="Registers to take"
            value={needsAttendance.length}
            tone={needsAttendance.length > 0 ? 'warn' : 'default'}
          />
          <Stat
            icon={AlertTriangle}
            label="Missing meeting link"
            value={missingLinks.length}
            tone={missingLinks.length > 0 ? 'warn' : 'default'}
          />
        </div>

        {/* A class without a link is one a student cannot attend - lead with it. */}
        {missingLinks.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
            <h2 className="flex items-center gap-2 font-semibold text-amber-900">
              <Video className="h-5 w-5" />
              {missingLinks.length}{' '}
              {missingLinks.length === 1 ? 'class needs' : 'classes need'} a Google Meet link
            </h2>
            <p className="mt-1 text-sm text-amber-800">
              Students cannot join until you add one. Create it at
              meet.google.com/new and paste it in.
            </p>
            <div className="mt-4 space-y-2">
              {missingLinks.slice(0, 3).map((session) => (
                <div
                  key={session.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-3"
                >
                  <span className="text-sm">
                    <span className="font-medium">{session.course_title}</span>
                    {' · '}
                    {tz.dayLabel(session.start_time)} {tz.time(session.start_time)}
                    {session.student_name && ` · ${session.student_name}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setLinkingSession(session.id)}
                    className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                  >
                    Add link
                  </button>
                </div>
              ))}
              {missingLinks.length > 3 && (
                <p className="text-sm text-amber-800">
                  and {missingLinks.length - 3} more in the list below.
                </p>
              )}
            </div>
          </div>
        )}

        <div>
          <div className="mb-4 flex gap-1 border-b border-gray-200">
            {[
              { key: 'today', label: `Today (${todaysClasses.length})` },
              { key: 'upcoming', label: `Upcoming (${upcoming.length})` },
              { key: 'calendar', label: 'Calendar' },
              { key: 'past', label: `Past (${history.length})` },
              { key: 'reports', label: `Reports (${reports.length})` },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`px-4 py-2.5 text-sm font-medium transition ${
                  tab === key
                    ? 'border-b-2 border-primary-600 text-primary-700'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loading && <LoadingSpinner />}

          {!loading && (tab === 'today' || tab === 'upcoming') && (
            (() => {
              const list = tab === 'today' ? todaysClasses : upcoming;
              return list.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
                  {tab === 'today'
                    ? 'Nothing scheduled for today.'
                    : 'No upcoming classes. The admin sets timetables from the admin panel.'}
                </p>
              ) : (
                <div className="space-y-3">
                  {list.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      role="teacher"
                      onAddLink={() => setLinkingSession(session.id)}
                      onCancel={handleCancel}
                    />
                  ))}
                </div>
              );
            })()
          )}

          {!loading && tab === 'calendar' && (
            <SessionCalendar
              role="teacher"
              onAddLink={(session) => setLinkingSession(session.id)}
              onCancel={handleCancel}
            />
          )}

          {!loading && tab === 'reports' && (
            <div className="space-y-5">
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="font-semibold text-gray-900">Write a monthly report</h3>
                <p className="mt-0.5 text-sm text-gray-500">
                  Attendance figures are filled in automatically from the registers
                  you have taken.
                </p>

                {studentsTaught.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">
                    You have no students assigned yet.
                  </p>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {studentsTaught.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => setWritingReport({
                          student, course: student.course, existing: null,
                        })}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:border-primary-600 hover:text-primary-700"
                      >
                        {student.name || 'Student'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {reports.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
                  No reports written yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <ReportCard
                      key={report.id}
                      report={report}
                      onEdit={(existing) => setWritingReport({
                        student: { id: existing.student, name: existing.student_name },
                        course: {
                          id: existing.course,
                          title: existing.course_title,
                          category: existing.course_category,
                        },
                        existing,
                      })}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && tab === 'past' && (
            history.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
                No past classes yet.
              </p>
            ) : (
              <div className="space-y-3">
                {history.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    role="teacher"
                    compact
                    onMarkAttendance={() => setMarkingSession(session.id)}
                  />
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {activeLinkSession && (
        <MeetLinkModal
          session={activeLinkSession}
          onClose={() => setLinkingSession(null)}
        />
      )}

      {activeMarkSession && (
        <AttendanceModal
          session={activeMarkSession}
          onClose={() => setMarkingSession(null)}
        />
      )}

      {writingReport && (
        <ReportForm
          student={writingReport.student}
          course={writingReport.course}
          existing={writingReport.existing}
          onClose={() => setWritingReport(null)}
        />
      )}
    </div>
  );
};

export default TeacherDashboard;
