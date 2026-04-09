'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { ConnectWallet } from '@coinbase/onchainkit/wallet'
import {
  Transaction,
  TransactionButton,
  TransactionStatus,
  TransactionStatusLabel,
  TransactionStatusAction,
} from '@coinbase/onchainkit/transaction'
import { useRouter, useSearchParams } from 'next/navigation'
import { parseEventLogs } from 'viem'
import { baseSepolia } from 'viem/chains'
import {
  CONTRACT_ADDRESS,
  USDC_ADDRESS,
  PACT_ABI,
  ERC20_ABI,
  GOAL_TYPES,
  GoalType,
  PRESET_PENALTY_RECIPIENTS,
  parseUsdc,
  milesToMeters,
} from '@/lib/contract'

type Step = 'setup' | 'goal' | 'financial' | 'confirm'

interface FormState {
  goalType: GoalType
  targetInput: string
  deadlineDate: string
  stakeInput: string
  penaltyRecipient: string
}

const STEPS: Step[] = ['setup', 'goal', 'financial', 'confirm']
const STEP_LABELS = ['Setup', 'Goal', 'Financial', 'Confirm']

function CreatePageInner() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState<Step>('setup')
  const [stravaConnected, setStravaConnected] = useState(false)
  const [checkingStrava, setCheckingStrava] = useState(false)
  const [createdPactId, setCreatedPactId] = useState<number | null>(null)
  const [txError, setTxError] = useState<string | null>(null)
  const [approved, setApproved] = useState(false)

  // Check on-chain allowance so Step 2 shows even after page refresh
  const { data: allowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACT_ADDRESS] : undefined,
    query: { enabled: !!address },
  })
  const [form, setForm] = useState<FormState>({
    goalType: GoalType.RunCount,
    targetInput: '',
    deadlineDate: '',
    stakeInput: '',
    penaltyRecipient: '',
  })

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  useEffect(() => {
    if (!address) return
    setCheckingStrava(true)
    fetch(`${apiUrl}/api/strava/status/${address}`)
      .then((r) => r.json())
      .then((data) => setStravaConnected(data.connected))
      .catch(() => {})
      .finally(() => setCheckingStrava(false))
  }, [address, apiUrl])

  useEffect(() => {
    if (searchParams.get('strava') === 'connected') setStravaConnected(true)
  }, [searchParams])

  const goalOption = GOAL_TYPES.find((g) => g.value === form.goalType)!
  const isDistanceGoal = goalOption.isDistance

  const targetValue = isDistanceGoal
    ? milesToMeters(parseFloat(form.targetInput) || 0)
    : BigInt(parseInt(form.targetInput) || 0)
  const stakeAmount = parseUsdc(form.stakeInput || '0')
  const deadlineTimestamp = form.deadlineDate
    ? BigInt(Math.floor(new Date(form.deadlineDate).getTime() / 1000))
    : 0n

  const approveCalls = useMemo(() => [
    {
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve' as const,
      args: [CONTRACT_ADDRESS, stakeAmount] as const,
    },
  ], [stakeAmount])

  const createCalls = useMemo(() => [
    {
      address: CONTRACT_ADDRESS,
      abi: PACT_ABI,
      functionName: 'createPact' as const,
      args: [
        form.goalType,
        targetValue,
        deadlineTimestamp,
        stakeAmount,
        form.penaltyRecipient as `0x${string}`,
      ] as const,
    },
  ], [form.goalType, targetValue, deadlineTimestamp, stakeAmount, form.penaltyRecipient])

  function handleConnectStrava() {
    if (!address) return
    window.location.href = `${apiUrl}/api/strava/connect?wallet=${address}`
  }

  function canProceedFromSetup() {
    return isConnected && stravaConnected
  }

  function canProceedFromGoal() {
    return (
      form.targetInput &&
      parseFloat(form.targetInput) > 0 &&
      form.deadlineDate &&
      new Date(form.deadlineDate).getTime() > Date.now() + 24 * 60 * 60 * 1000
    )
  }

  function canProceedFromFinancial() {
    return (
      form.stakeInput &&
      parseFloat(form.stakeInput) > 0 &&
      form.penaltyRecipient &&
      /^0x[0-9a-fA-F]{40}$/.test(form.penaltyRecipient) &&
      form.penaltyRecipient.toLowerCase() !== address?.toLowerCase()
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleSuccess(response: any) {
    let pactId: number | null = null
    for (const receipt of response.transactionReceipts ?? []) {
      try {
        const logs = parseEventLogs({ abi: PACT_ABI, logs: receipt.logs, eventName: 'PactCreated' })
        if (logs.length > 0) { pactId = Number(logs[0].args.pactId); break }
      } catch {}
    }
    setCreatedPactId(pactId)
  }

  const stepIndex = STEPS.indexOf(step)

  if (createdPactId !== null) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center">
        <div className="text-5xl mb-4">🎯</div>
        <h1 className="text-2xl font-bold mb-2">Pact Created!</h1>
        <p className="text-gray-600 mb-8">Pact #{createdPactId} is live on Base.</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push(`/pact/${createdPactId}`)}
            className="px-6 py-3 bg-black text-white font-medium rounded-xl hover:bg-gray-800 transition-colors"
          >
            View Pact
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:border-gray-500 transition-colors"
          >
            Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold mb-8">Create a Pact</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-10">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                i <= stepIndex ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'
              }`}
            >
              {i < stepIndex ? '✓' : i + 1}
            </div>
            <span className={`text-sm ${i === stepIndex ? 'font-medium' : 'text-gray-400'}`}>
              {STEP_LABELS[i]}
            </span>
            {i < STEPS.length - 1 && <div className="w-6 h-px bg-gray-200 mx-1" />}
          </div>
        ))}
      </div>

      {/* Step: Setup */}
      {step === 'setup' && (
        <div className="space-y-6">
          <div className="border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Wallet</p>
                <p className="text-sm text-gray-500">Required to hold your stake</p>
              </div>
              {isConnected ? (
                <span className="text-green-600 text-sm font-medium">Connected</span>
              ) : (
                <ConnectWallet />
              )}
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Strava</p>
                <p className="text-sm text-gray-500">Required to verify your activities</p>
              </div>
              {checkingStrava ? (
                <span className="text-gray-400 text-sm">Checking...</span>
              ) : stravaConnected ? (
                <span className="text-green-600 text-sm font-medium">Connected</span>
              ) : (
                <button
                  onClick={handleConnectStrava}
                  disabled={!isConnected}
                  className="px-4 py-2 bg-[#FC4C02] text-white text-sm font-medium rounded-lg hover:bg-[#e04402] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Connect Strava
                </button>
              )}
            </div>
          </div>

          <button
            onClick={() => setStep('goal')}
            disabled={!canProceedFromSetup()}
            className="w-full py-3 bg-black text-white font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      )}

      {/* Step: Goal */}
      {step === 'goal' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Goal Type</label>
            <div className="grid grid-cols-1 gap-2">
              {GOAL_TYPES.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setForm((f) => ({ ...f, goalType: g.value, targetInput: '' }))}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors ${
                    form.goalType === g.value
                      ? 'border-black bg-black text-white'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <span className="font-medium">{g.label}</span>
                  <span className={`text-sm ${form.goalType === g.value ? 'text-gray-300' : 'text-gray-400'}`}>
                    in {g.unit}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Target ({goalOption.unit})</label>
            <input
              type="number"
              min="0"
              step={isDistanceGoal ? '0.1' : '1'}
              value={form.targetInput}
              onChange={(e) => setForm((f) => ({ ...f, targetInput: e.target.value }))}
              placeholder={isDistanceGoal ? 'e.g. 100' : 'e.g. 5'}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black"
            />
            <p className="text-xs text-gray-400 mt-1">
              {isDistanceGoal ? `Enter distance in miles` : `Number of ${goalOption.unit}`}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Deadline</label>
            <input
              type="date"
              value={form.deadlineDate}
              min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              onChange={(e) => setForm((f) => ({ ...f, deadlineDate: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('setup')}
              className="flex-1 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:border-gray-400 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep('financial')}
              disabled={!canProceedFromGoal()}
              className="flex-1 py-3 bg-black text-white font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step: Financial */}
      {step === 'financial' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Stake Amount (USDC)</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="1"
                value={form.stakeInput}
                onChange={(e) => setForm((f) => ({ ...f, stakeInput: e.target.value }))}
                placeholder="e.g. 100"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black pr-16"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">USDC</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Penalty Recipient</label>
            <div className="grid grid-cols-1 gap-2 mb-3">
              {PRESET_PENALTY_RECIPIENTS.map((preset) => (
                <button
                  key={preset.address}
                  onClick={() => setForm((f) => ({ ...f, penaltyRecipient: preset.address }))}
                  className={`px-4 py-2.5 rounded-xl border text-left text-sm transition-colors ${
                    form.penaltyRecipient.toLowerCase() === preset.address.toLowerCase()
                      ? 'border-black bg-black text-white'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={form.penaltyRecipient}
              onChange={(e) => setForm((f) => ({ ...f, penaltyRecipient: e.target.value }))}
              placeholder="0x... custom address"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black font-mono text-sm"
            />
            {form.penaltyRecipient && form.penaltyRecipient.toLowerCase() === address?.toLowerCase() && (
              <p className="text-red-500 text-xs mt-1">You cannot be your own penalty recipient.</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('goal')}
              className="flex-1 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:border-gray-400 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep('confirm')}
              disabled={!canProceedFromFinancial()}
              className="flex-1 py-3 bg-black text-white font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Review
            </button>
          </div>
        </div>
      )}

      {/* Step: Confirm */}
      {step === 'confirm' && (
        <div className="space-y-6">
          <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
            {[
              { label: 'Goal', value: `${goalOption.label}: ${form.targetInput} ${goalOption.unit}` },
              { label: 'Deadline', value: new Date(form.deadlineDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
              { label: 'Stake', value: `${form.stakeInput} USDC` },
              { label: 'Penalty recipient', value: `${form.penaltyRecipient.slice(0, 6)}…${form.penaltyRecipient.slice(-4)}` },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center px-5 py-3">
                <span className="text-sm text-gray-500">{label}</span>
                <span className="text-sm font-medium">{value}</span>
              </div>
            ))}
          </div>

          {txError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              {txError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep('financial')}
              className="flex-1 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:border-gray-400 transition-colors"
            >
              Back
            </button>
            <div className="flex-1">
              {!approved && !(allowance && allowance >= stakeAmount) ? (
                <Transaction
                  chainId={baseSepolia.id}
                  calls={approveCalls}
                  onSuccess={() => setApproved(true)}
                  onError={(e) => setTxError(e.message)}
                >
                  <TransactionButton
                    text="Step 1: Approve USDC"
                    className="w-full py-3 bg-black text-white font-medium rounded-xl hover:bg-gray-800 transition-colors"
                  />
                  <TransactionStatus>
                    <TransactionStatusLabel />
                    <TransactionStatusAction />
                  </TransactionStatus>
                </Transaction>
              ) : (
                <Transaction
                  chainId={baseSepolia.id}
                  calls={createCalls}
                  onSuccess={handleSuccess}
                  onError={(e) => setTxError(e.message)}
                >
                  <TransactionButton
                    text="Step 2: Create Pact"
                    className="w-full py-3 bg-black text-white font-medium rounded-xl hover:bg-gray-800 transition-colors"
                  />
                  <TransactionStatus>
                    <TransactionStatusLabel />
                    <TransactionStatusAction />
                  </TransactionStatus>
                </Transaction>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CreatePage() {
  return (
    <Suspense>
      <CreatePageInner />
    </Suspense>
  )
}
