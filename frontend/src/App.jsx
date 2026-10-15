import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import { loadCurrentUser } from './redux/slices/authSlice';
import { getAccessToken } from './api/authStorage';
import useTheme from './hooks/useTheme';

// Components
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import ProtectedRoute from './components/common/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import CoursesPage from './pages/CoursesPage';
import CourseDetailPage from './pages/CourseDetailPage';
import ApplyPage from './pages/ApplyPage';
import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminPanel from './pages/AdminPanel';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ApplicationStatusPage from './pages/ApplicationStatusPage';

/**
 * Re-hydrate the signed-in user on boot. The tokens survive a page reload in
 * localStorage, but the user object does not - without this, a hard refresh
 * leaves the app authenticated yet unable to see who is logged in.
 */
function SessionLoader({ children }) {
  const dispatch = useDispatch();

  useEffect(() => {
    if (getAccessToken()) {
      dispatch(loadCurrentUser());
    }
  }, [dispatch]);

  return children;
}

/** Toasts have their own light/dark skins; keep them with the page. */
function ThemedToasts() {
  const { resolvedTheme } = useTheme();

  return (
    <ToastContainer
      position="top-right"
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme={resolvedTheme}
    />
  );
}

function App() {
  return (
    <Provider store={store}>
      <Router>
        <SessionLoader>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/courses/:id" element={<CourseDetailPage />} />
              <Route path="/apply" element={<ApplyPage />} />
              {/* Applications are submitted anonymously, so tracking one stays
                  public - the page falls back to the local receipt when the
                  visitor has no session to read the live record with. */}
              <Route path="/application-status" element={<ApplicationStatusPage />} />
              <Route path="/application-status/:id" element={<ApplicationStatusPage />} />
              <Route path="/login" element={<LoginPage />} />
              {/* Public sign-up is closed - see Navbar. The route is kept as a
                  redirect so old links and bookmarks still land somewhere useful.
                  RegisterPage itself is left in the codebase, unrouted, in case
                  self-sign-up is ever wanted again. */}
              <Route path="/register" element={<Navigate to="/apply" replace />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route
                path="/student-dashboard"
                element={
                  <ProtectedRoute roles={['student']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher-dashboard"
                element={
                  <ProtectedRoute roles={['teacher']}>
                    <TeacherDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-panel"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <AdminPanel />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
          <Footer />
        </div>
        </SessionLoader>
        <ThemedToasts />
      </Router>
    </Provider>
  );
}

export default App;