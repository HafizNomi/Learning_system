import api from './axios';

// Auth endpoints - see backend/quran_platform/accounts/urls.py
export const authAPI = {
  // Registration & session
  register: (data) => api.post('/accounts/register/', data),
  login: (data) => api.post('/accounts/login/', data),
  logout: (refresh) => api.post('/accounts/logout/', { refresh }),

  // Token lifecycle
  refreshToken: (refresh) => api.post('/accounts/token/refresh/', { refresh }),
  verifyToken: (token) => api.post('/accounts/token/verify/', { token }),

  // Current user & profile
  me: () => api.get('/accounts/me/'),
  profile: () => api.get('/accounts/profile/'),
  updateProfile: (data) => api.patch('/accounts/profile/', data),

  // Passwords
  changePassword: (data) => api.post('/accounts/change-password/', data),
  requestPasswordReset: (email) => api.post('/accounts/password-reset/', { email }),
  confirmPasswordReset: (data) => api.post('/accounts/password-reset/confirm/', data),

  // Email verification
  verifyEmail: ({ uid, token }) => api.post('/accounts/verify-email/', { uid, token }),
  resendVerification: (email) => api.post('/accounts/verify-email/resend/', { email }),

  // Teacher profiles
  teacherProfile: () => api.get('/accounts/teacher-profile/'),
  updateTeacherProfile: (data) => api.patch('/accounts/teacher-profile/', data),
  listTeachers: (params) => api.get('/accounts/teachers/', { params }),
  getTeacher: (id) => api.get(`/accounts/teachers/${id}/`),
};

// Course endpoints
export const courseAPI = {
  getAll: (params) => api.get('/courses/', { params }),
  getById: (id) => api.get(`/courses/${id}/`),
  create: (data) => api.post('/courses/create/', data),
};

// Application endpoints - see backend/quran_platform/applications/urls.py
export const applicationAPI = {
  // Open to anonymous visitors: the public "apply for a course" form.
  submit: (data) => api.post('/applications/apply/', data),

  // Admin only. Supports ?status=&course=&assigned_teacher=&search=&page=
  getAll: (params) => api.get('/applications/', { params }),

  // The signed-in user's own applications (matched by account or by the
  // email they applied with).
  getMine: (params) => api.get('/applications/my/', { params }),

  getById: (id) => api.get(`/applications/${id}/`),

  // Admin only: approve / reject / move an application along.
  updateStatus: (id, data) => api.patch(`/applications/${id}/update-status/`, data),
};

// Scheduling endpoints - see backend/quran_platform/scheduling/urls.py
export const sessionAPI = {
  // Classes that have not finished yet, for whoever is signed in.
  getUpcoming: (params) => api.get('/scheduling/upcoming/', { params }),

  // Classes that have already finished; `?student_id=` for admins/teachers.
  getHistory: (params) => api.get('/scheduling/history/', { params }),

  // Everything on one date, bounded in the viewer's own timezone.
  getSchedule: (date) => api.get('/scheduling/schedule/', { params: { date } }),

  getById: (id) => api.get(`/scheduling/${id}/`),

  // Admin only: one class at a time.
  create: (data) => api.post('/scheduling/create/', data),

  // Admin only: a whole run of classes in one call. Returns what it created
  // and what it skipped because the teacher was already booked.
  generate: (data) => api.post('/scheduling/generate/', data),

  // Teacher or admin: reschedule, cancel, or paste the Google Meet link.
  update: (id, data) => api.patch(`/scheduling/${id}/update/`, data),
};

// Attendance endpoints
export const attendanceAPI = {
  // Teacher only: marks the class complete and recalculates the monthly summary.
  mark: (data) => api.post('/attendance/mark/', data),
  getMonthlySummary: (params) => api.get('/attendance/monthly-summary/', { params }),
  getStudentAttendance: (studentId, params) =>
    api.get('/attendance/student-attendance/', {
      params: { ...params, ...(studentId ? { student_id: studentId } : {}) },
    }),
};

// Payment endpoints
export const paymentAPI = {
  create: (data) => api.post('/payments/create/', data),
  history: () => api.get('/payments/history/'),
  status: (id) => api.get(`/payments/${id}/status/`),
};

// Report endpoints
export const reportAPI = {
  // Teacher only. Create-or-update: the same student/course/month edits the
  // existing report rather than making a second one.
  create: (data) => api.post('/reports/create/', data),

  // `?student_id=&month=&year=`. Parents only ever see finalised reports.
  getAll: (params) => api.get('/reports/', { params }),
  getById: (id) => api.get(`/reports/${id}/`),
};