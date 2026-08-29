import { useAppSelector } from '../redux/hooks'

/** Read-only view of the auth slice, with the derived flags pages care about. */
const useAuth = () => {
  const auth = useAppSelector((state) => state.auth)

  return {
    ...auth,
    // `tokens.access` is the source of truth - the slice keeps it in sync with
    // localStorage on login, refresh and logout.
    isAuthenticated: Boolean(auth?.tokens?.access),
    isVerified: Boolean(auth?.user?.is_verified),
    role: auth?.user?.role ?? null,
    isStudent: auth?.user?.role === 'student',
    isTeacher: auth?.user?.role === 'teacher',
    isAdmin: auth?.user?.role === 'admin',
  }
}

export default useAuth
