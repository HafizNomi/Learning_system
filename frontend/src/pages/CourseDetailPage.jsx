import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Clock,
  GraduationCap,
  ListChecks,
  SearchX,
  AlertCircle,
} from 'lucide-react';
import { CATEGORY_OPTIONS, LEVEL_OPTIONS } from '../components/courses/CourseFilter';
import { fetchCourseById, clearSelectedCourse } from '../redux/slices/courseSlice';

const levelStyles = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-red-100 text-red-700',
};

const labelFor = (options, value) => options.find((o) => o.value === value)?.label || value;

/**
 * The syllabus is stored as plain text, one week per line. Split it so each
 * week can be rendered as its own row instead of one wall of text.
 */
const parseSyllabus = (syllabus) =>
  (syllabus || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

function DetailSkeleton() {
  return (
    <div className="container-custom py-10 animate-pulse">
      <div className="h-4 w-28 bg-gray-200 rounded mb-8" />
      <div className="h-9 w-2/3 bg-gray-200 rounded mb-4" />
      <div className="h-4 w-full bg-gray-200 rounded mb-2" />
      <div className="h-4 w-5/6 bg-gray-200 rounded mb-8" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded" />
          ))}
        </div>
        <div className="h-56 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, body }) {
  return (
    <div className="container-custom flex flex-col items-center justify-center text-center py-24">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{title}</h2>
      <p className="text-gray-500 max-w-sm mb-6">{body}</p>
      <Link to="/courses" className="btn-primary inline-flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back to courses
      </Link>
    </div>
  );
}

function CourseDetailPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { selected: course, selectedLoading, selectedError } = useSelector(
    (state) => state.courses
  );

  useEffect(() => {
    dispatch(fetchCourseById(id));
    // Drop the old course on the way out, so navigating to another one never
    // flashes the previous course's content.
    return () => dispatch(clearSelectedCourse());
  }, [dispatch, id]);

  if (selectedLoading) return <DetailSkeleton />;

  if (selectedError?.notFound) {
    return (
      <EmptyState
        icon={SearchX}
        title="Course not found"
        body="This course may have been removed or is no longer offered."
      />
    );
  }

  if (selectedError) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Couldn't load this course"
        body="Something went wrong while fetching the course. Please try again in a moment."
      />
    );
  }

  if (!course) return null;

  const weeks = parseSyllabus(course.syllabus);

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <section className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-12">
        <div className="container-custom">
          <Link
            to="/courses"
            className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            All courses
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/90 text-primary-700">
                {labelFor(CATEGORY_OPTIONS, course.category)}
              </span>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  levelStyles[course.level] || 'bg-gray-100 text-gray-700'
                }`}
              >
                {labelFor(LEVEL_OPTIONS, course.level)}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-3">{course.title}</h1>
            <p className="text-white/90 max-w-2xl leading-relaxed">{course.description}</p>
          </motion.div>
        </div>
      </section>

      <div className="container-custom py-10">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Syllabus */}
          <div className="lg:col-span-2">
            <div className="card p-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-5">
                <ListChecks className="w-5 h-5 text-primary-600" />
                What your child will learn
              </h2>

              {weeks.length > 0 ? (
                <ol className="space-y-3">
                  {weeks.map((week, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="shrink-0 w-7 h-7 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="text-gray-700 pt-0.5">{week}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-gray-500">
                  A detailed syllabus for this course is being prepared. Contact us
                  and we will walk you through what is covered.
                </p>
              )}
            </div>
          </div>

          {/* Facts + call to action */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="card p-6">
              <div className="flex items-baseline gap-1 mb-5">
                <span className="text-3xl font-bold text-primary-600">
                  ${course.price_per_month}
                </span>
                <span className="text-gray-400 text-sm">/ month</span>
              </div>

              <dl className="space-y-3 text-sm border-t border-gray-100 pt-5">
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-2 text-gray-500">
                    <Clock className="w-4 h-4" />
                    Class length
                  </dt>
                  <dd className="font-medium text-gray-900">{course.duration_minutes} min</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-2 text-gray-500">
                    <CalendarDays className="w-4 h-4" />
                    Frequency
                  </dt>
                  <dd className="font-medium text-gray-900">
                    {course.classes_per_week}× per week
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-2 text-gray-500">
                    <GraduationCap className="w-4 h-4" />
                    Level
                  </dt>
                  <dd className="font-medium text-gray-900">
                    {labelFor(LEVEL_OPTIONS, course.level)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-2 text-gray-500">
                    <BookOpen className="w-4 h-4" />
                    Format
                  </dt>
                  <dd className="font-medium text-gray-900">One-to-one, live</dd>
                </div>
              </dl>

              <Link
                to={`/apply?course=${course.id}`}
                className="btn-primary w-full mt-6 flex items-center justify-center"
              >
                Apply for this course
              </Link>
              <p className="text-xs text-gray-400 text-center mt-3">
                No payment is taken until your application is approved.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default CourseDetailPage;
