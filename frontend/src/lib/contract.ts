export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`

// USDC on Base mainnet
export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`

export const PACT_ABI = [
  {
    type: 'function',
    name: 'createPact',
    inputs: [
      { name: 'goalType', type: 'uint8' },
      { name: 'targetValue', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'stakeAmount', type: 'uint256' },
      { name: 'penaltyRecipient', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'claimExpired',
    inputs: [{ name: 'pactId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getPact',
    inputs: [{ name: 'pactId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'creator', type: 'address' },
          { name: 'goalType', type: 'uint8' },
          { name: 'targetValue', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'stakeAmount', type: 'uint256' },
          { name: 'penaltyRecipient', type: 'address' },
          { name: 'status', type: 'uint8' },
          { name: 'createdAt', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'pactCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'GRACE_PERIOD',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'PactCreated',
    inputs: [
      { name: 'pactId', type: 'uint256', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'goalType', type: 'uint8', indexed: false },
      { name: 'targetValue', type: 'uint256', indexed: false },
      { name: 'deadline', type: 'uint256', indexed: false },
      { name: 'stakeAmount', type: 'uint256', indexed: false },
      { name: 'penaltyRecipient', type: 'address', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PactResolved',
    inputs: [
      { name: 'pactId', type: 'uint256', indexed: true },
      { name: 'goalMet', type: 'bool', indexed: false },
      { name: 'actualValue', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PactExpired',
    inputs: [{ name: 'pactId', type: 'uint256', indexed: true }],
  },
] as const

export const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
] as const

export enum GoalType {
  RunCount = 0,
  RunDistance = 1,
  RideCount = 2,
  RideDistance = 3,
  AnyActivityCount = 4,
}

export enum PactStatus {
  Active = 0,
  Resolved = 1,
  Expired = 2,
}

export interface GoalTypeOption {
  value: GoalType
  label: string
  unit: string
  isDistance: boolean
}

export const GOAL_TYPES: GoalTypeOption[] = [
  { value: GoalType.RunCount, label: 'Run Count', unit: 'runs', isDistance: false },
  { value: GoalType.RunDistance, label: 'Run Distance', unit: 'km', isDistance: true },
  { value: GoalType.RideCount, label: 'Ride Count', unit: 'rides', isDistance: false },
  { value: GoalType.RideDistance, label: 'Ride Distance', unit: 'km', isDistance: true },
  { value: GoalType.AnyActivityCount, label: 'Any Activity', unit: 'activities', isDistance: false },
]

export const PRESET_PENALTY_RECIPIENTS: { label: string; address: `0x${string}` }[] = [
  { label: 'Burn (0x000...dead)', address: '0x000000000000000000000000000000000000dEaD' },
  { label: 'GiveDirectly', address: '0x750EF1D7a0b4Ab1c97B7A623D7917CcEb5ea779C' },
]

// USDC has 6 decimals
export const USDC_DECIMALS = 6

// km to meters for distance goals
export function kmToMeters(km: number): bigint {
  return BigInt(Math.round(km * 1000))
}

export function metersToKm(meters: bigint): number {
  return Number(meters) / 1000
}

export function formatUsdc(amount: bigint): string {
  return (Number(amount) / 10 ** USDC_DECIMALS).toFixed(2)
}

export function parseUsdc(amount: string): bigint {
  return BigInt(Math.round(parseFloat(amount) * 10 ** USDC_DECIMALS))
}
