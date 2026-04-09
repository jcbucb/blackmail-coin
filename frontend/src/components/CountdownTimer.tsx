'use client'

import { useEffect, useState } from 'react'

interface CountdownTimerProps {
  deadline: number
}

export default function CountdownTimer({ deadline }: CountdownTimerProps) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const diff = deadline - now

  if (diff <= 0) {
    return <span className="text-red-600 font-medium">Deadline passed</span>
  }

  const days = Math.floor(diff / 86400)
  const hours = Math.floor((diff % 86400) / 3600)
  const minutes = Math.floor((diff % 3600) / 60)
  const seconds = diff % 60

  return (
    <div className="flex items-center gap-3">
      {days > 0 && (
        <div className="text-center">
          <div className="text-2xl font-bold tabular-nums">{days}</div>
          <div className="text-xs text-gray-500">days</div>
        </div>
      )}
      <div className="text-center">
        <div className="text-2xl font-bold tabular-nums">{String(hours).padStart(2, '0')}</div>
        <div className="text-xs text-gray-500">hrs</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold tabular-nums">{String(minutes).padStart(2, '0')}</div>
        <div className="text-xs text-gray-500">min</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold tabular-nums">{String(seconds).padStart(2, '0')}</div>
        <div className="text-xs text-gray-500">sec</div>
      </div>
    </div>
  )
}
