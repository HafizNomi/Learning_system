import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BookOpen, Users, Video, Award, 
} from 'lucide-react';

const LandingPage = () => {
  const features = [
    {
      icon: <BookOpen className="w-8 h-8 text-primary-600" />,
      title: 'Expert Quran Teachers',
      description: 'Learn from certified scholars with years of teaching experience.',
    },
    {
      icon: <Video className="w-8 h-8 text-secondary-600" />,
      title: 'Live Video Sessions',
      description: 'One-on-one interactive classes with real-time feedback.',
    },
    {
      icon: <Users className="w-8 h-8 text-primary-600" />,
      title: 'Personalized Learning',
      description: 'Customized curriculum based on each student\'s level and goals.',
    },
    {
      icon: <Award className="w-8 h-8 text-secondary-600" />,
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
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-20">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Learn Quran & Future Tech
              <span className="block text-yellow-300">From Anywhere</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90">
              Online Quran tutoring combined with AI, Blockchain, and programming courses for children and adults.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/courses" className="bg-white text-primary-700 px-8 py-4 rounded-lg font-semibold hover:shadow-lg transition">
                Explore Courses
              </Link>
              <Link to="/apply" className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/10 transition">
                Start Learning
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 text-center">
            <div>
              <div className="text-3xl font-bold">500+</div>
              <div className="text-white/80">Students</div>
            </div>
            <div>
              <div className="text-3xl font-bold">50+</div>
              <div className="text-white/80">Teachers</div>
            </div>
            <div>
              <div className="text-3xl font-bold">98%</div>
              <div className="text-white/80">Satisfaction Rate</div>
            </div>
            <div>
              <div className="text-3xl font-bold">4.9⭐</div>
              <div className="text-white/80">Average Rating</div>
            </div>
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
                <div className="flex justify-center mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Courses */}
      <section className="py-20 bg-gray-50">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Popular <span className="text-secondary-600">Courses</span>
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
                <div className="flex text-yellow-400 mb-2">
                  {'⭐'.repeat(testimonial.rating)}
                </div>
                <p className="text-gray-600 italic mb-4">"{testimonial.text}"</p>
                <p className="font-semibold">{testimonial.name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-16">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Your Journey?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of students learning Quran and future technologies.
          </p>
          <Link to="/register" className="bg-white text-primary-700 px-8 py-4 rounded-lg font-semibold hover:shadow-lg transition inline-block">
            Get Started Today
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;