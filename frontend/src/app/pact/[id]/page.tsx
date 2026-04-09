'use client'

export const dynamic = 'force-dynamic'

import { use } from 'react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACT_ADDRESS, PACT_ABI, GoalType, PactStatus, GOAL_TYPES, formatUsdc } from '@/lib/contract'
import {
  formatGoalValue,
  formatDeadline,
  getPactStatusLabel,
  getPactStatusColor,
  shortenAddress,
  isGracePeriodOver,
} from '@/lib/utils'
import CountdownTimer from '@/components/CountdownTimer'
import GoalProgress from '@/components/GoalProgress'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function PactDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const pactId = parseInt(id, 10)
  const { data: pact, isLoading, error, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: PACT_ABI,
    functionName: 'getPact',
    args: [BigInt(pactId)],
  })

  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: txHash })

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded w-1/3" />
          <div className="h-40 bg-gray-100 rounded-xl" />
          <div className="h-24 bg-gray-100 rounded-xl" />
        </div>
      </div>
    )
  }

  if (error || !pact || pact.creator === '0x0000000000000000000000000000000000000000') {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12 text-center">
        <p className="text-gray-500">Pact not found.</p>
        <Link href="/explore" className="text-sm text-blue-600 hover:underline mt-2 block">
          Browse all pacts
        </Link>
      </div>
    )
  }

  const status = pact.status as PactStatus
  const goalType = pact.goalType as GoalType
  const goalOption = GOAL_TYPES.find((g) => g.value === goalType)!
  const deadlineNum = Number(pact.deadline)
  const isActive = status === PactStatus.Active
  const deadlinePassed = Math.floor(Date.now() / 1000) > deadlineNum
  const canClaimExpired = isActive && isGracePeriodOver(deadlineNum)
  function handleClaimExpired() {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: PACT_ABI,
      functionName: 'claimExpired',
      args: [BigInt(pactId)],
    })
  }

  if (confirmed) refetch()

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-sm text-gray-400 mb-1">Pact #{pactId}</p>
          <h1 className="text-2xl font-bold">
            {goalOption.label}: {formatGoalValue(pact.targetValue, goalType)}
          </h1>
          <p className="text-gray-500 text-sm mt-1">by {shortenAddress(pact.creator)}</p>
        </div>
        <span className={`text-sm font-medium px-3 py-1.5 rounded-full ${getPactStatusColor(status)}`}>
          {getPactStatusLabel(status)}
        </span>
      </div>

      {/* Countdown / Status */}
      {isActive && !deadlinePassed && (
        <div className="border border-gray-200 rounded-xl p-6 mb-6">
          <p className="text-sm text-gray-500 mb-3">Time remaining</p>
          <CountdownTimer deadline={deadlineNum} />
        </div>
      )}

      {isActive && deadlinePassed && (
        <div className="border border-amber-200 bg-amber-50 rounded-xl p-5 mb-6 text-sm text-amber-800">
          Deadline passed. The oracle will resolve this pact soon.
          {canClaimExpired && (
            <span> Grace period has ended — a refund is available.</span>
          )}
        </div>
      )}

      {status === PactStatus.Resolved && (
        <div className="border border-green-200 bg-green-50 rounded-xl p-5 mb-6 text-sm text-green-800 font-medium">
          This pact has been resolved.
        </div>
      )}

      {/* Details grid */}
      <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 mb-6">
        {[
          { label: 'Goal', value: `${formatGoalValue(pact.targetValue, goalType)}` },
          { label: 'Deadline', value: formatDeadline(deadlineNum) },
          { label: 'Stake', value: `${formatUsdc(pact.stakeAmount)} USDC` },
          { label: 'Penalty recipient', value: shortenAddress(pact.penaltyRecipient) },
          { label: 'Created', value: formatDeadline(Number(pact.createdAt)) },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center px-5 py-3">
            <span className="text-sm text-gray-500">{label}</span>
            <span className="text-sm font-medium">{value}</span>
          </div>
        ))}
      </div>

      {/* Live progress */}
      {(isActive || status === PactStatus.Resolved) && (
        <div className="border border-gray-200 rounded-xl p-6 mb-6">
          <p className="text-sm font-medium mb-4">
            {status === PactStatus.Resolved ? 'Final Progress' : 'Live Progress (via Strava)'}
          </p>
          <GoalProgress
            pactId={pactId}
            goalType={goalType}
            targetValue={pact.targetValue}
            status={Number(status)}
          />
        </div>
      )}

      {/* Claim expired button */}
      {canClaimExpired && (
        <div className="space-y-3">
          {writeError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              {writeError.message.split('\n')[0]}
            </div>
          )}
          <button
            onClick={handleClaimExpired}
            disabled={isPending || isConfirming}
            className="w-full py-3 bg-black text-white font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40"
          >
            {isPending || isConfirming ? 'Processing…' : 'Claim Refund (Oracle Expired)'}
          </button>
          <p className="text-xs text-center text-gray-400">
            The oracle didn&apos;t respond in time. Anyone can trigger a refund to the creator.
          </p>
        </div>
      )}
    </div>
  )
}
