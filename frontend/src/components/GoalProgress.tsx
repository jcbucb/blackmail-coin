'use client'

import { useEffect, useState } from 'react'
import { GoalType } from '@/lib/contract'
import { formatGoalValue } from '@/lib/utils'

interface ProgressData {
  actual: number
  target: string
  goalMet: boolean
  status: number
}

interface GoalProgressProps {
  pactId: number
  goalType: GoalType
  targetValue: bigint
  status: number
}

export default function GoalProgress({ pactId, goalType, targetValue, status }: GoalProgressProps) {
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/pacts/${pactId}/progress`)
        if (!res.ok) {
          const data = await res.json()
          setError(data.error || 'Failed to load progress')
          return
        }
        const data = await res.json()
        setProgress(data)
      } catch {
        setError('Failed to connect to backend')
      } finally {
        setLoading(false)
      }
    }

    fetchProgress()
    // Refresh every 5 minutes for active pacts
    if (status === 0) {
      const interval = setInterval(fetchProgress, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [pactId, status, apiUrl])

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-100 rounded-full w-full mb-2" />
        <div className="h-3 bg-gray-100 rounded w-1/3" />
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-gray-400 italic">{error}</p>
  }

  if (!progress) return null

  const actualBigInt = BigInt(progress.actual)
  const percentage = Math.min(100, Number((actualBigInt * 100n) / targetValue))

  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-600">
          {formatGoalValue(actualBigInt, goalType)} of {formatGoalValue(targetValue, goalType)}
        </span>
        <span className={`font-medium ${progress.goalMet ? 'text-green-600' : 'text-gray-900'}`}>
          {percentage}%
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all duration-500 ${progress.goalMet ? 'bg-green-500' : 'bg-black'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {progress.goalMet && (
        <p className="text-green-600 text-sm font-medium mt-2">Goal achieved!</p>
      )}
    </div>
  )
}
