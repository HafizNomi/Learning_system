import SessionCalendar from '../components/scheduling/SessionCalendar'

function StudentDashboard() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Student Dashboard</h1>
      <SessionCalendar />
    </div>
  )
}

export default StudentDashboard
