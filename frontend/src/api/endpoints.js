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

// Scheduling endpoints
export const sessionAPI = {
  getUpcoming: () => api.get('/scheduling/upcoming/'),
  getSchedule: (date) => api.get(`/scheduling/schedule/?date=${date}`),
  create: (data) => api.post('/scheduling/create/', data),
  update: (id, data) => api.patch(`/scheduling/${id}/update/`, data),
};

// Attendance endpoints
export const attendanceAPI = {
  mark: (data) => api.post('/attendance/mark/', data),
  getMonthlySummary: () => api.get('/attendance/monthly-summary/'),
  getStudentAttendance: (studentId) => 
    api.get(`/attendance/student-attendance/?student_id=${studentId}`),
};

// Payment endpoints
export const paymentAPI = {
  create: (data) => api.post('/payments/create/', data),
  history: () => api.get('/payments/history/'),
  status: (id) => api.get(`/payments/${id}/status/`),
};

// Report endpoints
export const reportAPI = {
  create: (data) => api.post('/reports/create/', data),
  getAll: () => api.get('/reports/'),
  getById: (id) => api.get(`/reports/${id}/`),
};