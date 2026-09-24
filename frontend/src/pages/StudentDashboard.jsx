import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { CalendarDays, Video, TrendingUp, BookOpen } from 'lucide-react';
import SessionCard from '../components/scheduling/SessionCard';
import SessionCalendar from '../components/scheduling/SessionCalendar';
import AttendanceSummary from '../components/attendance/AttendanceSummary';
import ReportCard from '../components/reports/ReportCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { fetchUpcomingSessions, fetchSessionHistory } from '../redux/slices/sessionSlice';
import { fetchMyApplications } from '../redux/slices/applicationSlice';
import { fetchMonthlySummary, fetchStudentAttendance } from '../redux/slices/attendanceSlice';
import { fetchReports } from '../redux/slices/reportSlice';
import useTimeZone from '../hooks/useTimeZone';
import useJoinWindow from '../hooks/useJoinWindow';
import useAuth from '../hooks/useAuth';

const Stat = ({ icon: Icon, label, value, hint }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-5">
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <Icon className="h-4 w-4" />
      {label}
    </div>
    <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
  </div>
);

const StudentDashboard = () => {
  const dispatch = useDispatch();
  const tz = useTimeZone();
  const { user } = useAuth();
  const { upcoming, history, loading } = useSelector((state) => state.sessions);
  const { items: applications } = useSelector((state) => state.applications);
  const { records, summaries } = useSelector((state) => state.attendance);
  const { items: reports } = useSelector((state) => state.reports);

  const [tab, setTab] = useState('next');

  useEffect(() => {
    dispatch(fetchUpcomingSessions());
    dispatch(fetchSessionHistory());
    dispatch(fetchMyApplications());
    // A student's own records - the API scopes these to them, so no id needed.
    dispatch(fetchMonthlySummary());
    dispatch(fetchStudentAttendance());
    dispatch(fetchReports());
  }, [dispatch]);

  const nextClass = upcoming[0] ?? null;
  // Ticks locally: a student waiting on this page must see the button
  // enable without reloading.
  const canJoinNext = useJoinWindow(nextClass);

  const attended = useMemo(
    () => records.filter((record) => record.is_present).length,
    [records]
  );

  // The server already computes this per month from the register; averaging
  // those is more trustworthy than counting session rows in the browser.
  const attendanceRate = useMemo(() => {
    if (summaries.length === 0) return null;
    const total = summaries.reduce(
      (sum, item) => sum + Number(item.attendance_percentage ?? 0), 0
    );
    return Math.round(total / summaries.length);
  }, [summaries]);

  const activeApplication = applications.find((item) =>
    ['active', 'approved', 'waiting_payment'].includes(item.status)
  );

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container-custom space-y-8">
        <div>
          <h1 className="text-3xl font-bold">
            Assalamu alaikum{user?.first_name ? `, ${user.first_name}` : ''}
          </h1>
          <p className="text-gray-600">
            {nextClass
              ? `Your next class is ${tz.countdown(nextClass.start_time)}.`
              : 'No classes scheduled yet.'}
          </p>
        </div>

        {/* --- The next class, given the space it deserves ----------------- */}
        {nextClass && (
          <div className="rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white shadow-lg">
            <p className="text-sm font-medium uppercase tracking-wide text-white/70">
              Next class
            </p>
            <h2 className="mt-1 text-2xl font-bold">{nextClass.course_title}</h2>
            <p className="mt-1 text-white/90">
              {tz.dayLabel(nextClass.start_time)} at {tz.time(nextClass.start_time)}
              {nextClass.teacher_name && ` · with ${nextClass.teacher_name}`}
            </p>
            <p className="mt-0.5 text-sm text-white/70">Times shown in {tz.zone}</p>

            <div className="mt-5">
              {nextClass.meeting_link ? (
                <a
                  href={canJoinNext ? nextClass.meeting_link : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => !canJoinNext && event.preventDefault()}
                  className={`inline-flex items-center gap-2 rounded-lg px-6 py-3 font-semibold transition ${
                    canJoinNext
                      ? 'bg-white text-primary-700 hover:bg-gray-100'
                      : 'cursor-not-allowed bg-white/20 text-white/70'
                  }`}
                >
                  <Video className="h-5 w-5" />
                  {canJoinNext
                    ? 'Join class now'
                    : `Join opens ${tz.countdown(nextClass.join_opens_at)}`}
                </a>
              ) : (
                <p className="rounded-lg bg-white/15 px-4 py-3 text-sm">
                  Your teacher has not added the meeting link yet.
                </p>
              )}
            </div>
          </div>
        )}

        {/* --- Numbers ---------------------------------------------------- */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            icon={CalendarDays}
            label="Upcoming classes"
            value={upcoming.length}
          />
          <Stat
            icon={BookOpen}
            label="Classes attended"
            value={attended}
            hint={records.length ? `of ${records.length} recorded` : undefined}
          />
          <Stat
            icon={TrendingUp}
            label="Attendance"
            value={attendanceRate === null ? '—' : `${attendanceRate}%`}
            hint={attendanceRate === null ? 'No classes yet' : undefined}
          />
          <Stat
            icon={BookOpen}
            label="Course"
            value={activeApplication?.course_details?.title ?? '—'}
            hint={activeApplication?.status_display}
          />
        </div>

        {/* --- Classes ---------------------------------------------------- */}
        <div>
          <div className="mb-4 flex gap-1 border-b border-gray-200">
            {[
              { key: 'next', label: `Upcoming (${upcoming.length})` },
              { key: 'calendar', label: 'Calendar' },
              { key: 'past', label: `Past (${history.length})` },
              { key: 'attendance', label: 'Attendance' },
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

          {!loading && tab === 'next' && (
            upcoming.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
                <p className="text-gray-600">You have no classes scheduled yet.</p>
                <p className="mt-1 text-sm text-gray-500">
                  Classes appear here once your application is approved and the
                  admin sets your timetable.
                </p>
                <Link to="/application-status" className="btn-primary mt-4 inline-block">
                  Check my application
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((session) => (
                  <SessionCard key={session.id} session={session} role="student" />
                ))}
              </div>
            )
          )}

          {!loading && tab === 'calendar' && <SessionCalendar role="student" />}

          {!loading && tab === 'attendance' && (
            <AttendanceSummary records={records} summaries={summaries} />
          )}

          {!loading && tab === 'reports' && (
            reports.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
                <p className="text-gray-600">No progress reports yet.</p>
                <p className="mt-1 text-sm text-gray-500">
                  Your teacher writes one at the end of each month.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))}
              </div>
            )
          )}

          {!loading && tab === 'past' && (
            history.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
                No past classes yet.
              </p>
            ) : (
              <div className="space-y-3">
                {history.map((session) => (
                  <SessionCard key={session.id} session={session} role="student" compact />
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
