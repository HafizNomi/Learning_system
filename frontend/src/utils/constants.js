export const USER_ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  ADMIN: 'admin',
}

export const APP_NAME = 'Quran Learning Platform'

// --- Applications ----------------------------------------------------------
// These mirror the choices on backend/quran_platform/applications/models.py.
// The backend returns `status_display` alongside `status`, so labels here are
// only needed for the values we render before a round trip (filters, forms).

export const APPLICATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  WAITING_PAYMENT: 'waiting_payment',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  WITHDRAWN: 'withdrawn',
}

export const APPLICATION_STATUS_LABELS = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  waiting_payment: 'Waiting for Payment',
  active: 'Active Student',
  completed: 'Course Completed',
  withdrawn: 'Withdrawn',
}

/** Tailwind classes per status, so every badge in the app reads the same. */
export const APPLICATION_STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  waiting_payment: 'bg-orange-100 text-orange-800',
  active: 'bg-blue-100 text-blue-800',
  completed: 'bg-purple-100 text-purple-800',
  withdrawn: 'bg-gray-100 text-gray-700',
}

export const PREFERRED_DAYS_OPTIONS = [
  { value: 'mon_wed_fri', label: 'Monday, Wednesday, Friday' },
  { value: 'tue_thu_sat', label: 'Tuesday, Thursday, Saturday' },
  { value: 'weekends', label: 'Weekends Only' },
  { value: 'custom', label: 'Custom Schedule' },
]

export const PREFERRED_TIME_OPTIONS = [
  { value: 'morning', label: 'Morning (7-11 AM)' },
  { value: 'afternoon', label: 'Afternoon (12-4 PM)' },
  { value: 'evening', label: 'Evening (5-9 PM)' },
]

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
]

export const QURAN_LEVEL_OPTIONS = [
  { value: 'complete_beginner', label: 'Complete beginner' },
  { value: 'knows_alphabet', label: 'Knows the Arabic alphabet' },
  { value: 'reads_slowly', label: 'Can read slowly' },
  { value: 'reads_fluently', label: 'Reads fluently' },
  { value: 'reads_with_tajweed', label: 'Reads with Tajweed' },
  { value: 'memorising', label: 'Memorising (Hifz)' },
]

export const TIMEZONE_OPTIONS = [
  { value: 'Asia/Karachi', label: 'Pakistan (PKT)' },
  { value: 'Asia/Dubai', label: 'UAE (GST)' },
  { value: 'Asia/Riyadh', label: 'Saudi Arabia (AST)' },
  { value: 'Asia/Kuala_Lumpur', label: 'Malaysia (MYT)' },
  { value: 'America/New_York', label: 'USA Eastern (EST)' },
  { value: 'America/Chicago', label: 'USA Central (CST)' },
  { value: 'America/Los_Angeles', label: 'USA Pacific (PST)' },
  { value: 'Europe/London', label: 'UK (GMT)' },
  { value: 'Europe/Berlin', label: 'Central Europe (CET)' },
  { value: 'Australia/Sydney', label: 'Australia (AEST)' },
  { value: 'UTC', label: 'UTC' },
]

/** Best-effort default so the timezone select starts on something sensible. */
export const guessTimezone = () => {
  try {
    const guess = Intl.DateTimeFormat().resolvedOptions().timeZone
    return TIMEZONE_OPTIONS.some((tz) => tz.value === guess) ? guess : ''
  } catch {
    return ''
  }
}
