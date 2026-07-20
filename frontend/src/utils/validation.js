import * as yup from 'yup'

export const loginSchema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(6, 'Minimum 6 characters').required('Password is required'),
})

export const registerSchema = yup.object({
  username: yup.string().min(3, 'Minimum 3 characters').required('Username is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  phone: yup.string().notRequired(),
  role: yup.string().oneOf(['student', 'teacher'], 'Select a valid role').required('Please select a role'),
  password: yup.string().min(6, 'Minimum 6 characters').required('Password is required'),
  password2: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
})
