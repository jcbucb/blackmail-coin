const cron = require('node-cron')
const { getAllActivePactsPassedDeadline, submitResolve } = require('./oracle')
const { getConnection } = require('./db')
const { getActivityProgress } = require('./strava')

async function verifyPact(pactId, pact) {
  const connection = getConnection(pact.creator)

  if (!connection) {
    console.log(
      `[cron] Pact ${pactId}: no Strava connection for creator ${pact.creator}, skipping (oracle silent → grace period refund applies)`
    )
    return
  }

  try {
    const { actual } = await getActivityProgress(
      pact.creator,
      connection,
      pact.goalType,
      pact.createdAt
    )

    console.log(
      `[cron] Pact ${pactId}: actual=${actual}, target=${pact.targetValue}, goalMet=${actual >= pact.targetValue}`
    )

    await submitResolve(pactId, actual)
  } catch (err) {
    console.error(`[cron] Pact ${pactId} verification failed:`, err.message)
    // Will retry on next cron run; 7-day grace period provides buffer
  }
}

async function runVerification() {
  console.log('[cron] Starting verification run...')

  let pacts
  try {
    pacts = await getAllActivePactsPassedDeadline()
  } catch (err) {
    console.error('[cron] Failed to fetch pacts:', err.message)
    return
  }

  if (pacts.length === 0) {
    console.log('[cron] No pacts to verify')
    return
  }

  console.log(`[cron] Found ${pacts.length} pact(s) to verify`)

  // Verify sequentially to avoid nonce conflicts on oracle wallet
  for (const pact of pacts) {
    await verifyPact(pact.id, pact)
  }

  console.log('[cron] Verification run complete')
}

function startCron() {
  // Run every hour
  cron.schedule('0 * * * *', runVerification)
  console.log('[cron] Scheduled: verification runs every hour')
}

module.exports = { startCron, runVerification }
