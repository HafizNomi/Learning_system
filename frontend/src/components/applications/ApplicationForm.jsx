import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { applicationSchema } from '../../utils/validation';
import {
  GENDER_OPTIONS,
  PREFERRED_DAYS_OPTIONS,
  PREFERRED_TIME_OPTIONS,
  QURAN_LEVEL_OPTIONS,
  TIMEZONE_OPTIONS,
  guessTimezone,
} from '../../utils/constants';

const Field = ({ label, required, error, children, className = '' }) => (
  <div className={className}>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
  </div>
);

const Section = ({ title, children }) => (
  <div className="border-b border-gray-200 pb-6">
    <h2 className="text-xl font-semibold text-primary-700 mb-4">{title}</h2>
    {children}
  </div>
);

/**
 * The public course application form.
 *
 * Field names match applications/serializers.py exactly, so the submitted
 * object can go straight to POST /api/applications/apply/ and any DRF
 * validation error can be mapped back onto the field that caused it.
 */
const ApplicationForm = ({
  courses = [],
  coursesLoading = false,
  submitting = false,
  serverErrors = null,
  defaultCourseId = '',
  onSubmit,
  onCancel,
}) => {
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(applicationSchema),
    defaultValues: {
      course: defaultCourseId,
      preferred_timezone: guessTimezone(),
      knows_arabic: false,
    },
  });

  // A course picked on the detail page arrives after the courses load, so set
  // it once the option it refers to actually exists.
  useEffect(() => {
    if (defaultCourseId && courses.some((course) => course.id === defaultCourseId)) {
      setValue('course', defaultCourseId);
    }
  }, [defaultCourseId, courses, setValue]);

  // Surface DRF's field-keyed errors next to the inputs rather than as a toast.
  useEffect(() => {
    if (!serverErrors || typeof serverErrors !== 'object') return;
    Object.entries(serverErrors).forEach(([field, message]) => {
      if (field === 'detail' || field === 'non_field_errors') return;
      setError(field, {
        type: 'server',
        message: Array.isArray(message) ? message[0] : String(message),
      });
    });
  }, [serverErrors, setError]);

  const submit = (values) => {
    // Blank optional selects must not be sent as '' - the backend would reject
    // them against its choice list.
    const payload = { ...values, student_age: Number(values.student_age) };
    ['parent_whatsapp', 'address', 'special_requests', 'current_quran_level'].forEach((key) => {
      if (!payload[key]) delete payload[key];
    });
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6" noValidate>
      <Section title="Student Information">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Student Name" required error={errors.student_name?.message}>
            <input {...register('student_name')} className="input-field" placeholder="Enter full name" />
          </Field>
          <Field label="Age" required error={errors.student_age?.message}>
            <input {...register('student_age')} type="number" min="4" max="18" className="input-field" placeholder="Between 4 and 18" />
          </Field>
          <Field label="Gender" required error={errors.student_gender?.message}>
            <select {...register('student_gender')} className="input-field">
              <option value="">Select gender</option>
              {GENDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Current Quran Level" error={errors.current_quran_level?.message}>
            <select {...register('current_quran_level')} className="input-field">
              <option value="">Select level (optional)</option>
              {QURAN_LEVEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>
          <div className="md:col-span-2 flex items-center gap-2">
            <input {...register('knows_arabic')} type="checkbox" id="knows_arabic" className="h-4 w-4 rounded border-gray-300" />
            <label htmlFor="knows_arabic" className="text-sm text-gray-700">
              The student already understands Arabic
            </label>
          </div>
        </div>
      </Section>

      <Section title="Parent/Guardian Information">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Parent/Guardian Name" required error={errors.parent_name?.message}>
            <input {...register('parent_name')} className="input-field" placeholder="Enter full name" />
          </Field>
          <Field label="Email Address" required error={errors.parent_email?.message}>
            <input {...register('parent_email')} type="email" className="input-field" placeholder="Enter email" />
          </Field>
          <Field label="Phone Number" required error={errors.parent_phone?.message}>
            <input {...register('parent_phone')} className="input-field" placeholder="+1234567890" />
          </Field>
          <Field label="WhatsApp Number" error={errors.parent_whatsapp?.message}>
            <input {...register('parent_whatsapp')} className="input-field" placeholder="Same as phone if left blank" />
          </Field>
          <Field label="Address" error={errors.address?.message} className="md:col-span-2">
            <textarea {...register('address')} rows={2} className="input-field" placeholder="Street, city, country (optional)" />
          </Field>
        </div>
      </Section>

      <Section title="Course Selection">
        <Field label="Select Course" required error={errors.course?.message}>
          <select {...register('course')} className="input-field" disabled={coursesLoading}>
            <option value="">{coursesLoading ? 'Loading courses...' : 'Choose a course'}</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title} - ${course.price_per_month}/month
              </option>
            ))}
          </select>
        </Field>
        {!coursesLoading && courses.length === 0 && (
          <p className="text-sm text-gray-500 mt-2">
            No courses are open for applications right now. Please check back shortly.
          </p>
        )}
      </Section>

      <Section title="Schedule Preferences">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Preferred Days" required error={errors.preferred_days?.message}>
            <select {...register('preferred_days')} className="input-field">
              <option value="">Select days</option>
              {PREFERRED_DAYS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Preferred Time" required error={errors.preferred_time?.message}>
            <select {...register('preferred_time')} className="input-field">
              <option value="">Select time</option>
              {PREFERRED_TIME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Your Timezone" required error={errors.preferred_timezone?.message} className="md:col-span-2">
            <select {...register('preferred_timezone')} className="input-field">
              <option value="">Select timezone</option>
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Anything else we should know?" error={errors.special_requests?.message} className="md:col-span-2">
            <textarea
              {...register('special_requests')}
              rows={3}
              className="input-field"
              placeholder="Preferred teacher gender, exact times, learning needs..."
            />
          </Field>
        </div>
      </Section>

      <div className="flex justify-end space-x-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting...' : 'Submit Application'}
        </button>
      </div>
    </form>
  );
};

export default ApplicationForm;
