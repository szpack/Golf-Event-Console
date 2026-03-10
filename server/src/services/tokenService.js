// ============================================================
// tokenService.js — JWT + Session management
// ============================================================

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');
const config = require('../config');

const prisma = new PrismaClient();

// ── Hash a refresh token for storage (never store plaintext) ──
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ── Sign an access token ──
function signAccessToken(userId, sessionId) {
  return jwt.sign(
    { userId, sessionId },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpires }
  );
}

// ── Verify an access token ──
function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret);
}

// ── Create a session + token pair ──
async function createSession(userId, { userAgent, ip } = {}) {
  const refreshToken = uuidv4();
  const refreshTokenHash = hashToken(refreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + config.jwt.refreshExpiresDays);

  const session = await prisma.session.create({
    data: {
      userId,
      refreshTokenHash,
      userAgent: userAgent || null,
      ip: ip || null,
      expiresAt
    }
  });

  const accessToken = signAccessToken(userId, session.id);

  return {
    accessToken,
    refreshToken,
    expiresAt
  };
}

// ── Refresh: validate refresh token → issue new access token ──
async function refreshSession(refreshToken) {
  const hash = hashToken(refreshToken);

  const session = await prisma.session.findFirst({
    where: {
      refreshTokenHash: hash,
      revokedAt: null,
      expiresAt: { gt: new Date() }
    }
  });

  if (!session) return null;

  // Issue new access token (same session)
  const accessToken = signAccessToken(session.userId, session.id);

  return {
    accessToken,
    userId: session.userId,
    sessionId: session.id
  };
}

// ── Revoke a session (logout) ──
async function revokeSession(sessionId) {
  await prisma.session.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() }
  });
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  createSession,
  refreshSession,
  revokeSession
};
