const BLACKMAIL_ABI = [
  {
    type: 'constructor',
    inputs: [
      { name: '_usdc', type: 'address' },
      { name: '_oracle', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
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
    name: 'resolve',
    inputs: [
      { name: 'pactId', type: 'uint256' },
      { name: 'actualValue', type: 'uint256' },
    ],
    outputs: [],
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
]

module.exports = { BLACKMAIL_ABI }
