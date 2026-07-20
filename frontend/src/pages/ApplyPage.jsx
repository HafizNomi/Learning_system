import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { applicationAPI } from '../api/endpoints';
import { fetchCourses } from '../redux/slices/courseSlice';

const schema = yup.object({
  student_name: yup.string().required('Student name is required'),
  student_age: yup.number().min(4, 'Minimum age 4').max(18, 'Maximum age 18').required('Age is required'),
  student_gender: yup.string().required('Gender is required'),
  parent_name: yup.string().required('Parent/Guardian name is required'),
  parent_email: yup.string().email('Invalid email').required('Email is required'),
  parent_phone: yup.string().required('Phone number is required'),
  course: yup.string().required('Please select a course'),
  preferred_days: yup.string().required('Please select preferred days'),
  preferred_time: yup.string().required('Please select preferred time'),
  preferred_timezone: yup.string().required('Please select your timezone'),
});

const ApplyPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { courses, loading } = useSelector((state) => state.courses);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
  });

  useEffect(() => {
    dispatch(fetchCourses());
  }, [dispatch]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      await applicationAPI.submit(data);
      toast.success('Application submitted successfully! We\'ll contact you soon.');
      navigate('/application-status');
    } catch (error) {
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const timezones = [
    { value: 'Asia/Karachi', label: 'Pakistan (PKT)' },
    { value: 'Asia/Dubai', label: 'UAE (GST)' },
    { value: 'Asia/Riyadh', label: 'Saudi Arabia (AST)' },
    { value: 'America/New_York', label: 'USA Eastern (EST)' },
    { value: 'America/Los_Angeles', label: 'USA Pacific (PST)' },
    { value: 'Europe/London', label: 'UK (GMT)' },
    { value: 'Australia/Sydney', label: 'Australia (AEST)' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container-custom max-w-3xl">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-2">
            Apply for a Course
          </h1>
          <p className="text-gray-600 text-center mb-8">
            Fill out the form below and we'll get back to you within 24 hours.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Student Information */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-semibold text-primary-700 mb-4">
                Student Information
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Student Name *
                  </label>
                  <input
                    {...register('student_name')}
                    className="input-field"
                    placeholder="Enter full name"
                  />
                  {errors.student_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.student_name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Age *
                  </label>
                  <input
                    {...register('student_age')}
                    type="number"
                    className="input-field"
                    placeholder="Enter age"
                  />
                  {errors.student_age && (
                    <p className="text-red-500 text-sm mt-1">{errors.student_age.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender *
                  </label>
                  <select {...register('student_gender')} className="input-field">
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                  {errors.student_gender && (
                    <p className="text-red-500 text-sm mt-1">{errors.student_gender.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Parent Information */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-semibold text-primary-700 mb-4">
                Parent/Guardian Information
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent/Guardian Name *
                  </label>
                  <input
                    {...register('parent_name')}
                    className="input-field"
                    placeholder="Enter full name"
                  />
                  {errors.parent_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.parent_name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    {...register('parent_email')}
                    type="email"
                    className="input-field"
                    placeholder="Enter email"
                  />
                  {errors.parent_email && (
                    <p className="text-red-500 text-sm mt-1">{errors.parent_email.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    {...register('parent_phone')}
                    className="input-field"
                    placeholder="+1234567890"
                  />
                  {errors.parent_phone && (
                    <p className="text-red-500 text-sm mt-1">{errors.parent_phone.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Course Selection */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-semibold text-primary-700 mb-4">
                Course Selection
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Course *
                </label>
                <select {...register('course')} className="input-field">
                  <option value="">Choose a course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title} - ${course.price_per_month}/month
                    </option>
                  ))}
                </select>
                {errors.course && (
                  <p className="text-red-500 text-sm mt-1">{errors.course.message}</p>
                )}
              </div>
            </div>

            {/* Schedule Preferences */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-semibold text-primary-700 mb-4">
                Schedule Preferences
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Days *
                  </label>
                  <select {...register('preferred_days')} className="input-field">
                    <option value="">Select days</option>
                    <option value="mon_wed_fri">Monday, Wednesday, Friday</option>
                    <option value="tue_thu_sat">Tuesday, Thursday, Saturday</option>
                    <option value="weekends">Weekends Only</option>
                  </select>
                  {errors.preferred_days && (
                    <p className="text-red-500 text-sm mt-1">{errors.preferred_days.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Time *
                  </label>
                  <select {...register('preferred_time')} className="input-field">
                    <option value="">Select time</option>
                    <option value="morning">Morning (7-11 AM)</option>
                    <option value="afternoon">Afternoon (12-4 PM)</option>
                    <option value="evening">Evening (5-9 PM)</option>
                  </select>
                  {errors.preferred_time && (
                    <p className="text-red-500 text-sm mt-1">{errors.preferred_time.message}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Timezone *
                  </label>
                  <select {...register('preferred_timezone')} className="input-field">
                    <option value="">Select timezone</option>
                    {timezones.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                  {errors.preferred_timezone && (
                    <p className="text-red-500 text-sm mt-1">{errors.preferred_timezone.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ApplyPage;