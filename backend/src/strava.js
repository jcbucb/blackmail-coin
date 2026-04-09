const axios = require('axios')
const { updateTokens } = require('./db')

const STRAVA_BASE = 'https://www.strava.com/api/v3'

// Goal type enum values (must match contract)
const GoalType = {
  RunCount: 0,
  RunDistance: 1,
  RideCount: 2,
  RideDistance: 3,
  AnyActivityCount: 4,
}

async function refreshAccessToken(wallet, connection) {
  const response = await axios.post('https://www.strava.com/oauth/token', {
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: connection.refresh_token,
  })

  const { access_token, refresh_token, expires_at } = response.data

  updateTokens(wallet, {
    accessToken: access_token,
    refreshToken: refresh_token,
    expiresAt: expires_at,
  })

  return access_token
}

async function getValidAccessToken(wallet, connection) {
  const nowSeconds = Math.floor(Date.now() / 1000)
  // Refresh if token expires within 5 minutes
  if (connection.expires_at - nowSeconds < 300) {
    return refreshAccessToken(wallet, connection)
  }
  return connection.access_token
}

async function fetchAllActivities(accessToken, afterTimestamp) {
  const activities = []
  let page = 1

  while (true) {
    const response = await axios.get(`${STRAVA_BASE}/athlete/activities`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        after: afterTimestamp,
        per_page: 200,
        page,
      },
    })

    const batch = response.data
    activities.push(...batch)

    if (batch.length < 200) break
    page++
  }

  return activities
}

function calculateActualValue(activities, goalType) {
  switch (goalType) {
    case GoalType.RunCount:
      return activities.filter((a) => a.type === 'Run').length

    case GoalType.RunDistance:
      // Strava returns distance in meters; contract stores meters
      return activities
        .filter((a) => a.type === 'Run')
        .reduce((sum, a) => sum + Math.floor(a.distance), 0)

    case GoalType.RideCount:
      return activities.filter((a) => a.type === 'Ride').length

    case GoalType.RideDistance:
      return activities
        .filter((a) => a.type === 'Ride')
        .reduce((sum, a) => sum + Math.floor(a.distance), 0)

    case GoalType.AnyActivityCount:
      return activities.length

    default:
      throw new Error(`Unknown goal type: ${goalType}`)
  }
}

async function getActivityProgress(wallet, connection, goalType, createdAt) {
  const accessToken = await getValidAccessToken(wallet, connection)
  const activities = await fetchAllActivities(accessToken, createdAt)
  const actual = calculateActualValue(activities, goalType)
  return { actual, activities }
}

module.exports = {
  getValidAccessToken,
  fetchAllActivities,
  calculateActualValue,
  getActivityProgress,
  GoalType,
}
