'use client'

export const dynamic = 'force-dynamic'

import { useState, useMemo } from 'react'
import { useReadContract, useReadContracts } from 'wagmi'
import { CONTRACT_ADDRESS, PACT_ABI, PactStatus, GoalType } from '@/lib/contract'
import PactCard, { PactData } from '@/components/PactCard'

type FilterStatus = 'all' | 'active' | 'resolved' | 'expired'

export default function ExplorePage() {
  const [filter, setFilter] = useState<FilterStatus>('all')

  const { data: pactCount, isLoading: loadingCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: PACT_ABI,
    functionName: 'pactCount',
  })

  const count = Number(pactCount ?? 0n)

  const { data: allPacts, isLoading: loadingPacts } = useReadContracts({
    contracts: Array.from({ length: count }, (_, i) => ({
      address: CONTRACT_ADDRESS,
      abi: PACT_ABI,
      functionName: 'getPact' as const,
      args: [BigInt(i)] as const,
    })),
    query: { enabled: count > 0 },
  })

  const pacts = useMemo<PactData[]>(() => {
    if (!allPacts) return []
    return allPacts
      .map((result, i) => {
        if (result.status !== 'success' || !result.result) return null
        const p = result.result
        if (p.creator === '0x0000000000000000000000000000000000000000') return null
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
  }, [allPacts])

  const filtered = useMemo(() => {
    if (filter === 'all') return pacts
    if (filter === 'active') return pacts.filter((p) => p.status === PactStatus.Active)
    if (filter === 'resolved') return pacts.filter((p) => p.status === PactStatus.Resolved)
    if (filter === 'expired') return pacts.filter((p) => p.status === PactStatus.Expired)
    return pacts
  }, [pacts, filter])

  const isLoading = loadingCount || loadingPacts

  const filters: { value: FilterStatus; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'expired', label: 'Expired' },
  ]

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Explore Pacts</h1>
          {!isLoading && (
            <p className="text-sm text-gray-500 mt-1">{pacts.length} pact{pacts.length !== 1 ? 's' : ''} total</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse h-44 bg-gray-100 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          {pacts.length === 0 ? 'No pacts yet. Be the first!' : `No ${filter} pacts.`}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((p) => (
            <PactCard key={p.id} pact={p} />
          ))}
        </div>
      )}
    </div>
  )
}
