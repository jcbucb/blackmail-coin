'use client'

export const dynamic = 'force-dynamic'

import { useAccount, useReadContract, useReadContracts } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { CONTRACT_ADDRESS, PACT_ABI, PactStatus, GoalType } from '@/lib/contract'
import PactCard, { PactData } from '@/components/PactCard'
import Link from 'next/link'
import { useMemo } from 'react'

export default function DashboardPage() {
  const { address, isConnected } = useAccount()

  const { data: pactCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: PACT_ABI,
    functionName: 'pactCount',
    query: { enabled: !!address },
  })

  const count = Number(pactCount ?? 0n)

  const { data: allPacts, isLoading } = useReadContracts({
    contracts: Array.from({ length: count }, (_, i) => ({
      address: CONTRACT_ADDRESS,
      abi: PACT_ABI,
      functionName: 'getPact' as const,
      args: [BigInt(i)] as const,
    })),
    query: { enabled: count > 0 && !!address },
  })

  const myPacts = useMemo<PactData[]>(() => {
    if (!allPacts || !address) return []
    return allPacts
      .map((result, i) => {
        if (result.status !== 'success' || !result.result) return null
        const p = result.result
        if (p.creator.toLowerCase() !== address.toLowerCase()) return null
        return {
          id: i,
          creator: p.creator,
          goalType: p.goalType as GoalType,
          targetValue: p.targetValue,
          deadline: Number(p.deadline),
          stakeAmount: p.stakeAmount,
          penaltyRecipient: p.penaltyRecipient,
          status: p.status as PactStatus,
          createdAt: Number(p.createdAt),
        } satisfies PactData
      })
      .filter((p): p is PactData => p !== null)
      .sort((a, b) => b.createdAt - a.createdAt)
  }, [allPacts, address])

  const activePacts = myPacts.filter((p) => p.status === PactStatus.Active)
  const pastPacts = myPacts.filter((p) => p.status !== PactStatus.Active)

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <p className="text-gray-500 mb-8">Connect your wallet to see your pacts.</p>
        <ConnectButton />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">My Pacts</h1>
        <Link
          href="/create"
          className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          + New Pact
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse h-36 bg-gray-100 rounded-xl" />
          ))}
        </div>
      ) : myPacts.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="mb-4">No pacts yet.</p>
          <Link href="/create" className="text-black font-medium underline underline-offset-2">
            Create your first pact
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {activePacts.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                Active ({activePacts.length})
              </h2>
              <div className="space-y-3">
                {activePacts.map((p) => (
                  <PactCard key={p.id} pact={p} />
                ))}
              </div>
            </div>
          )}
          {pastPacts.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                Past ({pastPacts.length})
              </h2>
              <div className="space-y-3">
                {pastPacts.map((p) => (
                  <PactCard key={p.id} pact={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
