import { useMemo } from 'react'
import { useSelector } from 'react-redux'

/**
 * Everything on the server is stored in UTC, and each user carries their own
 * `timezone`. A teacher in Karachi and a parent in London must each see their
 * own local time for the same class - so all class-time formatting goes
 * through here rather than through the browser's default locale.
 *
 * The signed-in user's saved timezone wins; the browser's guess is the
 * fallback for visitors who have no account yet.
 */
const browserTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

const useTimeZone = () => {
  const userTimeZone = useSelector((state) => state.auth.user?.timezone)

  return useMemo(() => {
    const zone = userTimeZone || browserTimeZone()

    /** Is this timestamp on the same calendar day as `reference`, locally? */
    const isSameDay = (value, reference = new Date()) => {
      const a = new Date(value)
      const b = new Date(reference)
      return a.toLocaleDateString('en-CA', { timeZone: zone }) ===
             b.toLocaleDateString('en-CA', { timeZone: zone })
    }

    const format = (value, options) => {
      if (!value) return ''
      try {
        return new Date(value).toLocaleString('en-GB', { timeZone: zone, ...options })
      } catch {
        return ''
      }
    }

    return {
      zone,
      /** "17:00" */
      time: (value) => format(value, { hour: '2-digit', minute: '2-digit', hour12: false }),
      /** "Mon 6 Oct" */
      date: (value) => format(value, { weekday: 'short', day: 'numeric', month: 'short' }),
      /** "Mon 6 Oct, 17:00" */
      dateTime: (value) =>
        format(value, {
          weekday: 'short', day: 'numeric', month: 'short',
          hour: '2-digit', minute: '2-digit', hour12: false,
        }),
      /** "Today", "Tomorrow", or the date. */
      dayLabel: (value) => {
        if (!value) return ''
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        if (isSameDay(value)) return 'Today'
        if (isSameDay(value, tomorrow)) return 'Tomorrow'
        return format(value, { weekday: 'short', day: 'numeric', month: 'short' })
      },
      isSameDay,
      /** "in 2h 15m" / "started 10m ago" - for the next-class countdown. */
      countdown: (value) => {
        if (!value) return ''
        const diff = new Date(value).getTime() - Date.now()
        const past = diff < 0
        const minutes = Math.floor(Math.abs(diff) / 60000)

        if (minutes < 1) return past ? 'starting now' : 'starting now'
        if (minutes < 60) return past ? `started ${minutes}m ago` : `in ${minutes}m`

        const hours = Math.floor(minutes / 60)
        const rest = minutes % 60
        if (hours < 24) {
          const label = rest ? `${hours}h ${rest}m` : `${hours}h`
          return past ? `started ${label} ago` : `in ${label}`
        }

        const days = Math.floor(hours / 24)
        return past ? `${days}d ago` : `in ${days}d`
      },
    }
  }, [userTimeZone])
}

export default useTimeZone
