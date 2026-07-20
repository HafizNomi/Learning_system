import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { SearchX, AlertCircle } from 'lucide-react';
import CourseFilter from '../components/courses/CourseFilter';
import CourseCard from '../components/courses/CourseCard';
import { fetchCourses } from '../redux/slices/courseSlice';

function CourseCardSkeleton() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="h-40 bg-gray-200" />
      <div className="p-5 space-y-3">
        <div className="flex justify-between">
          <div className="h-5 w-20 bg-gray-200 rounded-full" />
          <div className="h-5 w-12 bg-gray-200 rounded" />
        </div>
        <div className="h-5 w-3/4 bg-gray-200 rounded" />
        <div className="h-4 w-full bg-gray-200 rounded" />
        <div className="h-4 w-2/3 bg-gray-200 rounded" />
        <div className="h-10 w-full bg-gray-200 rounded-lg mt-2" />
      </div>
    </div>
  );
}

function CoursesPage() {
  const dispatch = useDispatch();
  const { courses, loading, error } = useSelector((state) => state.courses);
  const [filters, setFilters] = useState({ search: '', category: '', level: '' });

  useEffect(() => {
    const timeout = setTimeout(() => {
      dispatch(fetchCourses(filters));
    }, 300);
    return () => clearTimeout(timeout);
  }, [dispatch, filters]);

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <section className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-14">
        <div className="container-custom text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Explore Our Courses</h1>
            <p className="text-white/90 max-w-xl mx-auto">
              Quran recitation, memorization, and future-tech courses taught by expert instructors.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container-custom py-10">
        <CourseFilter filters={filters} onChange={setFilters} />

        {loading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Couldn't load courses</h3>
            <p className="text-gray-500 max-w-sm">
              Something went wrong while fetching courses. Please try again in a moment.
            </p>
          </div>
        )}

        {!loading && !error && courses.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <SearchX className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No courses found</h3>
            <p className="text-gray-500 max-w-sm">
              Try adjusting your search or filters to find what you're looking for.
            </p>
          </div>
        )}

        {!loading && !error && courses.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course, index) => (
              <CourseCard key={course.id} course={course} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CoursesPage;
