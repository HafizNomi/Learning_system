import { useDispatch, useSelector } from 'react-redux';

export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;

// Custom hook for timezone
export const useUserTimezone = () => {
  const user = useAppSelector((state) => state.auth.user);
  return user?.timezone || 'UTC';
};