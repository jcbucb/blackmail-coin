'use client'

import Link from 'next/link'
import { PactStatus, GoalType, GOAL_TYPES, formatUsdc } from '@/lib/contract'
import { formatGoalValue, formatDeadline, getPactStatusLabel, getPactStatusColor, shortenAddress } from '@/lib/utils'

export interface PactData {
  id: number
  creator: `0x${string}`
  goalType: GoalType
  targetValue: bigint
  deadline: number
  stakeAmount: bigint
  penaltyRecipient: `0x${string}`
  status: PactStatus
  createdAt: number
}

interface PactCardProps {
  pact: PactData
}

export default function PactCard({ pact }: PactCardProps) {
  const goalOption = GOAL_TYPES.find((g) => g.value === pact.goalType)
  const isActive = pact.status === PactStatus.Active
  const deadlinePassed = Math.floor(Date.now() / 1000) > pact.deadline

  return (
    <Link href={`/pact/${pact.id}`}>
      <div className="border border-gray-200 rounded-xl p-5 hover:border-gray-400 hover:shadow-sm transition-all cursor-pointer bg-white">
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="text-xs text-gray-500">Pact #{pact.id}</span>
            <h3 className="font-semibold text-gray-900 mt-0.5">
              {goalOption?.label}: {formatGoalValue(pact.targetValue, pact.goalType)}
            </h3>
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${getPactStatusColor(pact.status)}`}>
            {getPactStatusLabel(pact.status)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500 text-xs">Stake</span>
            <p className="font-medium">{formatUsdc(pact.stakeAmount)} USDC</p>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Deadline</span>
            <p className={`font-medium ${isActive && deadlinePassed ? 'text-red-600' : ''}`}>
              {formatDeadline(pact.deadline)}
            </p>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Creator</span>
            <p className="font-mono text-xs text-gray-700">{shortenAddress(pact.creator)}</p>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Penalty to</span>
            <p className="font-mono text-xs text-gray-700">{shortenAddress(pact.penaltyRecipient)}</p>
          </div>
        </div>
      </div>
    </Link>
  )
}
