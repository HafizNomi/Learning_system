import { useMemo } from 'react'

const useTimeZone = () => {
  return useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])
}

export default useTimeZone
