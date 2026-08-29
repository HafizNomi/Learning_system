import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { motion } from 'framer-motion';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  BookOpen,
  UserPlus,
  User,
  Phone,
  GraduationCap,
  Presentation,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser } from '../redux/slices/authSlice';
import { registerSchema } from '../utils/validation';

const roleOptions = [
  { value: 'student', label: 'Student', icon: GraduationCap },
  { value: 'teacher', label: 'Teacher', icon: Presentation },
];

const roleRedirects = {
  student: '/student-dashboard',
  teacher: '/teacher-dashboard',
  admin: '/admin-panel',
};

function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading } = useSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(registerSchema),
    defaultValues: { role: 'student' },
  });

  const selectedRole = watch('role');

  const onSubmit = (data) => {
    // The API returns a token pair, so a new account is signed in immediately
    // and lands on its own dashboard rather than back at the login form.
    dispatch(registerUser(data))
      .unwrap()
      .then((result) => {
        navigate(roleRedirects[result.user?.role] || '/', { replace: true });
      })
      .catch(() => {});
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="card p-8">
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-primary-600 rounded-xl flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
            <p className="text-gray-500 mt-1 text-sm">Start learning Quran & future tech today</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Role selector */}
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-1.5">I am a</span>
              <div className="grid grid-cols-2 gap-3">
                {roleOptions.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setValue('role', value, { shouldValidate: true })}
                    className={`flex items-center justify-center gap-2 py-3 rounded-lg border-2 font-medium transition-all duration-200 ${
                      selectedRole === value
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                  </button>
                ))}
              </div>
              <input type="hidden" {...register('role')} />
              {errors.role && (
                <p className="mt-1.5 text-sm text-red-600">{errors.role.message}</p>
              )}
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="johndoe"
                  className={`input-field pl-11 ${errors.username ? '!border-red-400 !ring-red-100' : ''}`}
                  {...register('username')}
                />
              </div>
              {errors.username && (
                <p className="mt-1.5 text-sm text-red-600">{errors.username.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={`input-field pl-11 ${errors.email ? '!border-red-400 !ring-red-100' : ''}`}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Phone (optional) */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+1 234 567 890"
                  className="input-field pl-11"
                  {...register('phone')}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={`input-field pl-11 pr-11 ${errors.password ? '!border-red-400 !ring-red-100' : ''}`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="password2" className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="password2"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className={`input-field pl-11 pr-11 ${errors.password2 ? '!border-red-400 !ring-red-100' : ''}`}
                  {...register('password2')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password2 && (
                <p className="mt-1.5 text-sm text-red-600">{errors.password2.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Create account
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-8">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default RegisterPage;
