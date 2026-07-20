import { useAppSelector } from '../redux/hooks'

const useAuth = () => {
  const auth = useAppSelector((state) => state.auth)
  return {
    ...auth,
    isAuthenticated: Boolean(auth?.token),
  }
}

export default useAuth
