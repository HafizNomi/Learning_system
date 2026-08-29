import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import ApplicationForm from '../components/applications/ApplicationForm';
import { fetchCourses } from '../redux/slices/courseSlice';
import { clearApplicationError, submitApplication } from '../redux/slices/applicationSlice';

const ApplyPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();

  const { courses, loading: coursesLoading } = useSelector((state) => state.courses);
  const { submitting, fieldErrors } = useSelector((state) => state.applications);
  const { user } = useSelector((state) => state.auth);

  // `/apply?course=<id>` - the "Apply now" button on a course detail page.
  const preselectedCourse = searchParams.get('course') ?? '';

  useEffect(() => {
    dispatch(fetchCourses());
    return () => {
      dispatch(clearApplicationError());
    };
  }, [dispatch]);

  const handleSubmit = async (payload) => {
    // A signed-in applicant should not have to retype their own email.
    const body = { ...payload, parent_email: payload.parent_email || user?.email };
    const result = await dispatch(submitApplication(body));

    if (submitApplication.fulfilled.match(result)) {
      const id = result.payload.application_id ?? result.payload.application?.id;
      navigate(id ? `/application-status/${id}` : '/application-status', { replace: true });
    }
    // On failure the slice holds the DRF errors; the form paints them on the
    // offending fields and the user stays put with their input intact.
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container-custom max-w-3xl">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-2">Apply for a Course</h1>
          <p className="text-gray-600 text-center mb-8">
            Fill out the form below and we&apos;ll get back to you within 24 hours.
          </p>

          <ApplicationForm
            courses={courses}
            coursesLoading={coursesLoading}
            submitting={submitting}
            serverErrors={fieldErrors}
            defaultCourseId={preselectedCourse}
            onSubmit={handleSubmit}
            onCancel={() => navigate(-1)}
          />
        </div>
      </div>
    </div>
  );
};

export default ApplyPage;
