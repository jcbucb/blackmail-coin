const Database = require('better-sqlite3')
const path = require('path')

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'pact.db')
const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS strava_connections (
    wallet TEXT PRIMARY KEY COLLATE NOCASE,
    strava_id INTEGER,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`)

function getConnection(wallet) {
  return db.prepare('SELECT * FROM strava_connections WHERE wallet = ?').get(wallet.toLowerCase())
}

function upsertConnection({ wallet, stravaId, accessToken, refreshToken, expiresAt }) {
  db.prepare(`
    INSERT INTO strava_connections (wallet, strava_id, access_token, refresh_token, expires_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(wallet) DO UPDATE SET
      strava_id = excluded.strava_id,
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      expires_at = excluded.expires_at
  `).run(wallet.toLowerCase(), stravaId, accessToken, refreshToken, expiresAt)
}

function updateTokens(wallet, { accessToken, refreshToken, expiresAt }) {
  db.prepare(`
    UPDATE strava_connections
    SET access_token = ?, refresh_token = ?, expires_at = ?
    WHERE wallet = ?
  `).run(accessToken, refreshToken, expiresAt, wallet.toLowerCase())
}

function getAllConnections() {
  return db.prepare('SELECT * FROM strava_connections').all()
}

module.exports = { getConnection, upsertConnection, updateTokens, getAllConnections }
