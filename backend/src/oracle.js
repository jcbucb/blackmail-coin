const { ethers } = require('ethers')
const { BLACKMAIL_ABI } = require('./abi')

let provider
let wallet
let contract

function getContract() {
  if (!contract) {
    provider = new ethers.JsonRpcProvider(process.env.RPC_URL)
    wallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY, provider)
    contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, BLACKMAIL_ABI, wallet)
  }
  return contract
}

async function getPactCount() {
  const c = getContract()
  const count = await c.pactCount()
  return Number(count)
}

async function getPact(pactId) {
  const c = getContract()
  const p = await c.getPact(pactId)
  return {
    creator: p.creator,
    goalType: Number(p.goalType),
    targetValue: BigInt(p.targetValue),
    deadline: Number(p.deadline),
    stakeAmount: BigInt(p.stakeAmount),
    penaltyRecipient: p.penaltyRecipient,
    // 0 = Active, 1 = Resolved, 2 = Expired
    status: Number(p.status),
    createdAt: Number(p.createdAt),
  }
}

async function submitResolve(pactId, actualValue) {
  const c = getContract()
  console.log(`[oracle] Resolving pact ${pactId} with actualValue=${actualValue}`)
  const tx = await c.resolve(pactId, actualValue)
  const receipt = await tx.wait()
  console.log(`[oracle] Pact ${pactId} resolved in tx ${receipt.hash}`)
  return receipt
}

async function getAllActivePactsPassedDeadline() {
  const count = await getPactCount()
  if (count === 0) return []

  const now = Math.floor(Date.now() / 1000)
  const results = []

  // Fetch all pacts in parallel batches of 20
  const BATCH = 20
  for (let i = 0; i < count; i += BATCH) {
    const ids = []
    for (let j = i; j < Math.min(i + BATCH, count); j++) {
      ids.push(j)
    }
    const pacts = await Promise.all(ids.map((id) => getPact(id).then((p) => ({ id, ...p }))))
    for (const pact of pacts) {
      if (pact.status === 0 && pact.deadline <= now) {
        results.push(pact)
      }
    }
  }

  return results
}

module.exports = { getPactCount, getPact, submitResolve, getAllActivePactsPassedDeadline }
