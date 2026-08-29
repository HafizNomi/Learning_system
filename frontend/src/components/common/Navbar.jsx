import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../../redux/slices/authSlice';
import { Menu, X, User, LogOut, BookOpen, Calendar, CreditCard } from 'lucide-react';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/');
  };

  const getNavLinks = () => {
    const links = [];
    
    // Public links
    links.push({ name: 'Courses', path: '/courses' });
    
    if (!isAuthenticated) {
      // Applying needs no account, so keep the entry point in reach.
      links.push({ name: 'Apply', path: '/apply' });
    }

    if (isAuthenticated) {
      switch (user?.role) {
        case 'student':
          links.push({ name: 'Dashboard', path: '/student-dashboard' });
          links.push({ name: 'My Application', path: '/application-status' });
          links.push({ name: 'My Classes', path: '/my-classes' });
          break;
        case 'teacher':
          links.push({ name: 'Dashboard', path: '/teacher-dashboard' });
          links.push({ name: 'Schedule', path: '/schedule' });
          break;
        case 'admin':
          links.push({ name: 'Admin Panel', path: '/admin-panel' });
          break;
        default:
          break;
      }
    }
    
    return links;
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container-custom">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-primary-700">
              Quran<span className="text-secondary-500">Tutor</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {getNavLinks().map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="text-gray-700 hover:text-primary-600 font-medium transition-colors"
              >
                {link.name}
              </Link>
            ))}

            {isAuthenticated ? (
              <div className="flex items-center space-x-4 ml-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary-700">
                      {user?.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium">{user?.username}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 text-red-600 hover:text-red-700"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="btn-outline text-sm py-2 px-4">
                  Login
                </Link>
                <Link to="/register" className="btn-primary text-sm py-2 px-4">
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            {getNavLinks().map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="block py-2 text-gray-700 hover:text-primary-600"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            {!isAuthenticated && (
              <div className="mt-4 space-y-2">
                <Link
                  to="/login"
                  className="block w-full text-center btn-outline"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="block w-full text-center btn-primary"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;