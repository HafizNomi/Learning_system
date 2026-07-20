import api from './axios';

// Auth endpoints
export const authAPI = {
  login: (data) => api.post('/accounts/token/', data),
  register: (data) => api.post('/accounts/register/', data),
  profile: () => api.get('/accounts/profile/'),
  updateProfile: (data) => api.patch('/accounts/profile/', data),
};

// Course endpoints
export const courseAPI = {
  getAll: (params) => api.get('/courses/', { params }),
  getById: (id) => api.get(`/courses/${id}/`),
  create: (data) => api.post('/courses/create/', data),
};

// Application endpoints
export const applicationAPI = {
  submit: (data) => api.post('/applications/apply/', data),
  getAll: () => api.get('/applications/'),
  getById: (id) => api.get(`/applications/${id}/`),
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