import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BookOpen, Users, Video, Award, 
} from 'lucide-react';

const LandingPage = () => {
  const features = [
    {
      icon: <BookOpen className="h-6 w-6 text-primary-600" />,
      title: 'Expert Quran Teachers',
      description: 'Learn from certified scholars with years of teaching experience.',
    },
    {
      icon: <Video className="h-6 w-6 text-primary-600" />,
      title: 'Live Video Sessions',
      description: 'One-on-one interactive classes with real-time feedback.',
    },
    {
      icon: <Users className="h-6 w-6 text-primary-600" />,
      title: 'Personalized Learning',
      description: 'Customized curriculum based on each student\'s level and goals.',
    },
    {
      icon: <Award className="h-6 w-6 text-primary-600" />,
      title: 'Progress Tracking',
      description: 'Detailed reports and certificates upon completion.',
    },
  ];

  const courses = [
    {
      title: 'Quran Recitation',
      description: 'Learn proper Tajweed rules and beautiful recitation.',
      level: 'All Levels',
      price: '$50/mo',
    },
    {
      title: 'Quran Memorization',
      description: 'Systematic Hifz program with revision techniques.',
      level: 'Intermediate',
      price: '$60/mo',
    },
    {
      title: 'AI for Kids',
      description: 'Introduction to AI concepts through fun projects.',
      level: 'Beginner',
      price: '$55/mo',
    },
    {
      title: 'Blockchain Basics',
      description: 'Understand blockchain technology with simple examples.',
      level: 'Beginner',
      price: '$55/mo',
    },
  ];

  return (
    <div>
      {/* Hero - a light green wash rather than a saturated banner, so the
          page opens calm and the green reads as brand rather than noise. */}
      <section className="relative overflow-hidden bg-primary-50 py-16 md:py-24">
        {/* A single soft bloom for depth. Decorative only. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 right-[-10%] h-96 w-96 rounded-full bg-primary-200/40 blur-3xl"
        />

        <div className="container-custom relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-4xl text-center"
          >
            <span className="inline-flex items-center rounded-full border border-primary-200 bg-white px-4 py-1.5 text-sm font-medium text-primary-700">
              Live one-to-one classes, taught online
            </span>

            <h1 className="mt-6 text-balance text-4xl font-bold leading-tight text-gray-900 md:text-5xl lg:text-6xl">
              Learn Quran &amp; Future Tech
              <span className="mt-1 block text-primary-700">From Anywhere</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 md:text-xl">
              Online Quran tutoring combined with AI, Blockchain and programming
              courses, for children and adults.
            </p>

            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link to="/courses" className="btn-primary">
                Explore Courses
              </Link>
              <Link to="/apply" className="btn-outline bg-white">
                Start Learning
              </Link>
            </div>
          </motion.div>

          {/* Stats sit on a white card, which separates them from the wash
              without needing another colour. */}
          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-primary-100 bg-primary-100 md:grid-cols-4">
            {[
              { value: '500+', label: 'Students' },
              { value: '50+', label: 'Teachers' },
              { value: '98%', label: 'Satisfaction rate' },
              { value: '4.9', label: 'Average rating' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white px-4 py-6 text-center">
                <div className="text-3xl font-bold text-primary-700">{stat.value}</div>
                <div className="mt-1 text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Why Choose <span className="text-primary-600">QuranTutor</span>?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="card p-6 text-center"
              >
                {/* A tinted disc gives the four icons one shared shape. */}
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
                  {feature.icon}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Courses */}
      <section className="py-20 bg-gray-50">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Popular <span className="text-primary-600">Courses</span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {courses.map((course, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="card p-6"
              >
                <h3 className="text-xl font-semibold mb-2">{course.title}</h3>
                <p className="text-gray-600 text-sm mb-4">{course.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full">
                    {course.level}
                  </span>
                  <span className="text-lg font-bold text-primary-600">{course.price}</span>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/courses" className="btn-primary">
              View All Courses
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container-custom">
          <h2 className="text-3xl font-bold text-center mb-12">
            What Our <span className="text-primary-600">Students Say</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Sarah Ahmed',
                text: 'My daughter\'s Quran recitation improved dramatically in just 3 months!',
                rating: 5,
              },
              {
                name: 'Mohammed Ali',
                text: 'The AI course is amazing. My son is now building his own projects!',
                rating: 5,
              },
              {
                name: 'Aisha Khan',
                text: 'Flexible scheduling and excellent teachers. Highly recommended!',
                rating: 5,
              },
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.2 }}
                className="card p-6"
              >
                <div className="mb-2 flex text-secondary-500">
                  {'⭐'.repeat(testimonial.rating)}
                </div>
                <p className="text-gray-600 italic mb-4">"{testimonial.text}"</p>
                <p className="font-semibold">{testimonial.name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing call to action - the one band that stays solid green, so it
          reads as the end of the page rather than another section. */}
      <section className="bg-primary-700 py-16 text-white">
        <div className="container-custom text-center">
          <h2 className="text-3xl font-bold md:text-4xl">
            Ready to start your journey?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-lg text-white/80">
            Join students learning Quran and future technologies with teachers
            who know them by name.
          </p>
          <Link
            to="/register"
            className="on-brand mt-8 inline-block rounded-lg px-8 py-4 font-semibold transition hover:shadow-lg"
          >
            Get started today
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;