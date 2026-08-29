import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MailCheck, MailX, Loader2, Send } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { resendVerification, verifyEmail } from '../redux/slices/authSlice';

function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const uid = searchParams.get('uid');
  const token = searchParams.get('token');

  const [state, setState] = useState(uid && token ? 'verifying' : 'missing');
  const [message, setMessage] = useState('');
  // StrictMode mounts effects twice in development; the verify token is
  // single-use, so guard against firing it twice.
  const attempted = useRef(false);

  useEffect(() => {
    if (!uid || !token || attempted.current) return;
    attempted.current = true;

    dispatch(verifyEmail({ uid, token }))
      .unwrap()
      .then((data) => {
        setState('verified');
        setMessage(data.message);
      })
      .catch((error) => {
        setState('failed');
        setMessage(error?.message || 'This verification link is invalid or has expired.');
      });
  }, [dispatch, uid, token]);

  const onResend = () => {
    const email = user?.email || window.prompt('Which email address should we send the link to?');
    if (email) dispatch(resendVerification(email));
  };

  const views = {
    verifying: {
      icon: <Loader2 className="w-12 h-12 text-primary-600 mx-auto mb-4 animate-spin" />,
      title: 'Verifying your email…',
      body: 'This only takes a moment.',
    },
    verified: {
      icon: <MailCheck className="w-12 h-12 text-green-600 mx-auto mb-4" />,
      title: 'Email verified',
      body: message || 'Your email address is confirmed. You are all set.',
    },
    failed: {
      icon: <MailX className="w-12 h-12 text-red-500 mx-auto mb-4" />,
      title: 'We could not verify that link',
      body: message,
    },
    missing: {
      icon: <MailX className="w-12 h-12 text-amber-500 mx-auto mb-4" />,
      title: 'This link is incomplete',
      body: 'Open the verification link from your email, or send yourself a new one.',
    },
  };

  const view = views[state];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="card p-8 text-center">
          {view.icon}
          <h1 className="text-xl font-bold text-gray-900">{view.title}</h1>
          <p className="text-gray-500 mt-2 text-sm">{view.body}</p>

          {state === 'verified' && (
            <Link to="/login" className="btn-primary inline-block mt-6">
              Continue to sign in
            </Link>
          )}

          {(state === 'failed' || state === 'missing') && (
            <button
              type="button"
              onClick={onResend}
              className="btn-primary inline-flex items-center gap-2 mt-6"
            >
              <Send className="w-4 h-4" />
              Send a new link
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default VerifyEmailPage;
