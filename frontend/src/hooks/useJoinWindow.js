import { useEffect, useState } from 'react'

/**
 * Whether a class can be joined right now.
 *
 * The server sends `is_joinable`, but that is a snapshot from whenever the
 * request was made. A student sitting on the dashboard waiting for class would
 * never see the button enable, so this recomputes locally on a timer using the
 * same window the backend applies: from `join_opens_at` until 15 minutes after
 * the end.
 *
 * Shared by the session card and the dashboard hero so the two can never
 * disagree about whether a class is live.
 */
const CLOSES_MINUTES_AFTER = 15
const TICK_MS = 30_000

const useJoinWindow = (session) => {
  const [now, setNow] = useState(() => Date.now())

  const live = session?.status === 'scheduled' || session?.status === 'ongoing'

  useEffect(() => {
    if (!live) return undefined
    const timer = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(timer)
  }, [live])

  if (!session?.meeting_link || !live) return false

  const opens = new Date(session.join_opens_at).getTime()
  const closes = new Date(session.end_time).getTime() + CLOSES_MINUTES_AFTER * 60_000
  if (Number.isNaN(opens) || Number.isNaN(closes)) return false

  return now >= opens && now <= closes
}

export default useJoinWindow
