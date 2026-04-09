require('dotenv').config()

const express = require('express')
const cors = require('cors')
const axios = require('axios')
const { getConnection, upsertConnection } = require('./db')
const { getActivityProgress } = require('./strava')
const { getPact, getPactCount, submitResolve } = require('./oracle')
const { startCron, runVerification } = require('./cron')

const app = express()
app.use(express.json())
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }))

// ─────────────────────────────────────────────
// Strava OAuth
// ─────────────────────────────────────────────

// Step 1: redirect user to Strava OAuth
// GET /api/strava/connect?wallet=0x...
app.get('/api/strava/connect', (req, res) => {
  const { wallet } = req.query
  if (!wallet || !/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
    return res.status(400).json({ error: 'Invalid wallet address' })
  }

  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    redirect_uri: process.env.STRAVA_REDIRECT_URI,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
    state: wallet,
  })

  res.redirect(`https://www.strava.com/oauth/authorize?${params}`)
})

// Step 2: Strava redirects back with code
// GET /api/strava/callback?code=...&state={wallet}
app.get('/api/strava/callback', async (req, res) => {
  const { code, state: wallet, error } = req.query

  if (error) {
    return res.redirect(`${process.env.FRONTEND_URL}/create?strava=denied`)
  }

  if (!wallet || !code) {
    return res.status(400).send('Missing wallet or code')
  }

  try {
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    })

    const { access_token, refresh_token, expires_at, athlete } = response.data

    upsertConnection({
      wallet,
      stravaId: athlete.id,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: expires_at,
    })

    res.redirect(`${process.env.FRONTEND_URL}/create?strava=connected`)
  } catch (err) {
    console.error('Strava OAuth error:', err.message)
    res.redirect(`${process.env.FRONTEND_URL}/create?strava=error`)
  }
})

// GET /api/strava/status/:wallet
app.get('/api/strava/status/:wallet', (req, res) => {
  const { wallet } = req.params
  if (!/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
    return res.status(400).json({ error: 'Invalid wallet address' })
  }

  const connection = getConnection(wallet)
  res.json({ connected: !!connection, stravaId: connection?.strava_id ?? null })
})

// ─────────────────────────────────────────────
// Pact endpoints
// ─────────────────────────────────────────────

// GET /api/pacts/:pactId/progress
// Returns live progress toward the goal for a pact
app.get('/api/pacts/:pactId/progress', async (req, res) => {
  const pactId = parseInt(req.params.pactId, 10)
  if (isNaN(pactId) || pactId < 0) {
    return res.status(400).json({ error: 'Invalid pact ID' })
  }

  try {
    const pact = await getPact(pactId)

    if (!pact.creator || pact.creator === '0x0000000000000000000000000000000000000000') {
      return res.status(404).json({ error: 'Pact not found' })
    }

    const connection = getConnection(pact.creator)
    if (!connection) {
      return res.status(404).json({ error: 'Strava not connected for this pact creator' })
    }

    const { actual } = await getActivityProgress(
      pact.creator,
      connection,
      pact.goalType,
      pact.createdAt
    )

    res.json({
      pactId,
      goalType: pact.goalType,
      actual,
      target: pact.targetValue.toString(),
      goalMet: actual >= Number(pact.targetValue),
      status: pact.status,
      deadline: pact.deadline,
    })
  } catch (err) {
    console.error(`Progress fetch error for pact ${pactId}:`, err.message)
    res.status(500).json({ error: 'Failed to fetch progress' })
  }
})

// POST /api/pacts/:pactId/verify
// Manually trigger oracle verification (admin/debug use)
app.post('/api/pacts/:pactId/verify', async (req, res) => {
  const pactId = parseInt(req.params.pactId, 10)
  if (isNaN(pactId) || pactId < 0) {
    return res.status(400).json({ error: 'Invalid pact ID' })
  }

  try {
    const pact = await getPact(pactId)

    if (!pact.creator || pact.creator === '0x0000000000000000000000000000000000000000') {
      return res.status(404).json({ error: 'Pact not found' })
    }

    if (pact.status !== 0) {
      return res.status(400).json({ error: 'Pact is not active' })
    }

    const now = Math.floor(Date.now() / 1000)
    if (pact.deadline > now) {
      return res.status(400).json({ error: 'Deadline has not passed yet' })
    }

    const connection = getConnection(pact.creator)
    if (!connection) {
      return res.status(400).json({ error: 'No Strava connection for pact creator' })
    }

    const { actual } = await getActivityProgress(
      pact.creator,
      connection,
      pact.goalType,
      pact.createdAt
    )

    const receipt = await submitResolve(pactId, actual)

    res.json({
      success: true,
      pactId,
      actualValue: actual,
      goalMet: actual >= Number(pact.targetValue),
      txHash: receipt.hash,
    })
  } catch (err) {
    console.error(`Manual verify error for pact ${pactId}:`, err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// Start
// ─────────────────────────────────────────────

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`)
  startCron()
})
