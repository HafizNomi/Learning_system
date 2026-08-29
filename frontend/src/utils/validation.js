import * as yup from 'yup'

// Mirrors the backend's Django password validators closely enough to catch the
// common cases before a round trip. The server stays the authority.
const strongPassword = yup
  .string()
  .min(8, 'Minimum 8 characters')
  .matches(/[A-Za-z]/, 'Must contain at least one letter')
  .matches(/\d/, 'Must contain at least one number')
  .required('Password is required')

const confirmOf = (field) =>
  yup
    .string()
    .oneOf([yup.ref(field)], 'Passwords must match')
    .required('Please confirm your password')

export const loginSchema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().required('Password is required'),
})

export const registerSchema = yup.object({
  username: yup.string().min(3, 'Minimum 3 characters').required('Username is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  phone: yup.string().notRequired(),
  role: yup.string().oneOf(['student', 'teacher'], 'Select a valid role').required('Please select a role'),
  password: strongPassword,
  password2: confirmOf('password'),
})

export const forgotPasswordSchema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
})

export const resetPasswordSchema = yup.object({
  new_password: strongPassword,
  new_password2: confirmOf('new_password'),
})

export const changePasswordSchema = yup.object({
  old_password: yup.string().required('Your current password is required'),
  new_password: strongPassword.notOneOf(
    [yup.ref('old_password')],
    'The new password must differ from the current one'
  ),
  new_password2: confirmOf('new_password'),
})

// --- Applications ----------------------------------------------------------
// Mirrors applications/serializers.py: the 4-18 age bound and the required
// fields are enforced server-side too, this just saves a round trip.

export const applicationSchema = yup.object({
  student_name: yup.string().trim().required('Student name is required'),
  student_age: yup
    .number()
    .typeError('Age is required')
    .integer('Age must be a whole number')
    .min(4, 'Age must be between 4 and 18')
    .max(18, 'Age must be between 4 and 18')
    .required('Age is required'),
  student_gender: yup.string().oneOf(['male', 'female'], 'Select a gender').required('Gender is required'),

  parent_name: yup.string().trim().required('Parent/Guardian name is required'),
  parent_email: yup.string().email('Invalid email').required('Email is required'),
  parent_phone: yup.string().trim().required('Phone number is required'),
  parent_whatsapp: yup.string().trim().notRequired(),
  address: yup.string().trim().notRequired(),

  course: yup.string().required('Please select a course'),

  preferred_days: yup.string().required('Please select preferred days'),
  preferred_time: yup.string().required('Please select preferred time'),
  preferred_timezone: yup.string().required('Please select your timezone'),

  current_quran_level: yup.string().notRequired(),
  knows_arabic: yup.boolean().default(false),
  special_requests: yup.string().notRequired(),
})

export const applicationStatusUpdateSchema = yup.object({
  status: yup.string().required('Select a status'),
  // The backend refuses an approval without a teacher, so ask for one here.
  assigned_teacher: yup.string().when('status', {
    is: 'approved',
    then: (schema) => schema.required('Assign a teacher to approve this application'),
    otherwise: (schema) => schema.notRequired(),
  }),
  assigned_time_slot: yup.string().notRequired(),
  admin_notes: yup.string().notRequired(),
})
