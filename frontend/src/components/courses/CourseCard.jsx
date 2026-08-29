import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, CalendarDays, BookOpen, ArrowRight } from 'lucide-react';
import { CATEGORY_OPTIONS, LEVEL_OPTIONS } from './CourseFilter';

const levelStyles = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-red-100 text-red-700',
};

const labelFor = (options, value) => options.find((o) => o.value === value)?.label || value;

function CourseCard({ course, index = 0 }) {
  if (!course) return null;

  const {
    id,
    title,
    description,
    category,
    level,
    price_per_month,
    duration_minutes,
    classes_per_week,
    thumbnail,
  } = course;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.06, 0.4), duration: 0.4 }}
      className="card flex flex-col overflow-hidden group"
    >
      {/* Thumbnail */}
      <div className="relative h-40 bg-gradient-to-br from-primary-500 to-secondary-500 overflow-hidden">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-white/70" />
          </div>
        )}
        <span className="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/90 text-primary-700">
          {labelFor(CATEGORY_OPTIONS, category)}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-5">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${levelStyles[level] || 'bg-gray-100 text-gray-700'}`}>
            {labelFor(LEVEL_OPTIONS, level)}
          </span>
          <span className="text-lg font-bold text-primary-600">
            ${price_per_month}
            <span className="text-xs font-normal text-gray-400">/mo</span>
          </span>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-1.5 line-clamp-1">{title}</h3>
        <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-1">{description}</p>

        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {duration_minutes} min
          </span>
          <span className="flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5" />
            {classes_per_week}x / week
          </span>
        </div>

        <Link
          to={`/courses/${id}`}
          className="btn-primary w-full flex items-center justify-center gap-1.5 text-sm py-2.5"
        >
          View Details
          <ArrowRight className="w-4 h-4" />
        </Link>

        {/* The apply form reads `?course=` and preselects this course. */}
        <Link
          to={`/apply?course=${id}`}
          className="mt-2 w-full text-center text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          Apply for this course
        </Link>
      </div>
    </motion.div>
  );
}

export default CourseCard;
