import Link from 'next/link'

const steps = [
  {
    number: '01',
    title: 'Create a Pact',
    description: 'Connect your wallet and Strava account, set your goal, deadline, and USDC stake.',
  },
  {
    number: '02',
    title: 'USDC Goes in Escrow',
    description: 'Your stake is locked in a smart contract on Base. No one can touch it until your deadline passes.',
  },
  {
    number: '03',
    title: 'Do the Work',
    description: 'Train. The oracle tracks your Strava activities automatically.',
  },
  {
    number: '04',
    title: 'Verdict',
    description: 'Hit your goal → USDC returned to you. Miss it → USDC sent to your chosen penalty recipient.',
  },
]

const goalExamples = [
  { goal: 'Run 5 times', stake: '$50', penalty: 'Burn address' },
  { goal: 'Ride 100 km', stake: '$100', penalty: "Rival's wallet" },
  { goal: '20 any activities', stake: '$200', penalty: 'Charity' },
]

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      {/* Hero */}
      <div className="text-center mb-20">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6 leading-tight">
          Do it, or pay up.
          <br />
          <span className="underline decoration-4 underline-offset-4">That&apos;s Blackmail.</span>
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-xl mx-auto">
          Connect Strava. Lock USDC. Hit your target or lose your stake.
          No excuses — the blockchain doesn&apos;t care.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/create"
            className="px-8 py-4 bg-black text-white font-semibold rounded-xl text-lg hover:bg-gray-800 transition-colors"
          >
            Create a Pact
          </Link>
          <Link
            href="/explore"
            className="px-8 py-4 border border-gray-300 text-gray-700 font-semibold rounded-xl text-lg hover:border-gray-500 transition-colors"
          >
            Browse Pacts
          </Link>
        </div>
      </div>

      {/* How it works */}
      <div className="mb-20">
        <h2 className="text-2xl font-bold mb-8">How it works</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {steps.map((step) => (
            <div key={step.number} className="border border-gray-200 rounded-xl p-6">
              <div className="text-4xl font-black text-gray-100 mb-3">{step.number}</div>
              <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Examples */}
      <div className="mb-20">
        <h2 className="text-2xl font-bold mb-8">Example pacts</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {goalExamples.map((ex) => (
            <div key={ex.goal} className="bg-gray-50 rounded-xl p-5">
              <p className="font-semibold text-lg mb-3">{ex.goal}</p>
              <div className="space-y-1 text-sm text-gray-600">
                <p>Stake: <span className="font-medium text-gray-900">{ex.stake} USDC</span></p>
                <p>Penalty to: <span className="font-medium text-gray-900">{ex.penalty}</span></p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust */}
      <div className="border border-gray-200 rounded-xl p-8 text-center">
        <h2 className="text-xl font-bold mb-3">Fully on-chain</h2>
        <p className="text-gray-600 max-w-lg mx-auto text-sm leading-relaxed">
          All pacts live on Base as a Solidity smart contract. Your USDC never touches a custodian.
          If the oracle goes offline, you get a full refund after a 7-day grace period — enforced by code, not promises.
        </p>
      </div>
    </div>
  )
}
