// ============================================================
// authService.js — Register / Login business logic
// ============================================================

const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const config = require('../config');
const tokenService = require('./tokenService');

const prisma = new PrismaClient();

// ── Register ──
async function register({ email, password, displayName }, meta = {}) {
  const normalizedEmail = email.trim().toLowerCase();

  // Check if email already exists
  const existing = await prisma.authIdentity.findUnique({
    where: { provider_email: { provider: 'password', email: normalizedEmail } }
  });
  if (existing) {
    return { error: 'Email already registered' };
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);

  // Transaction: create user + auth_identity + default player
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        displayName: displayName.trim()
      }
    });

    await tx.authIdentity.create({
      data: {
        userId: user.id,
        provider: 'password',
        email: normalizedEmail,
        passwordHash,
        isPrimary: true
      }
    });

    const player = await tx.player.create({
      data: {
        ownerUserId: user.id,
        displayName: displayName.trim(),
        isDefault: true
      }
    });

    return { user, player };
  });

  // Create session
  const tokens = await tokenService.createSession(result.user.id, meta);

  return {
    user: _sanitizeUser(result.user),
    defaultPlayer: _sanitizePlayer(result.player),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken
  };
}

// ── Login ──
async function login({ email, password }, meta = {}) {
  const normalizedEmail = email.trim().toLowerCase();

  // Find auth identity
  const auth = await prisma.authIdentity.findUnique({
    where: { provider_email: { provider: 'password', email: normalizedEmail } },
    include: { user: true }
  });

  if (!auth || !auth.passwordHash) {
    return { error: 'Invalid email or password' };
  }

  // Check user status
  if (auth.user.status !== 'active') {
    return { error: 'Account is not active' };
  }

  // Verify password
  const valid = await bcrypt.compare(password, auth.passwordHash);
  if (!valid) {
    return { error: 'Invalid email or password' };
  }

  // Get default player
  const player = await prisma.player.findFirst({
    where: { ownerUserId: auth.user.id, isDefault: true, status: 'active' }
  });

  // Create session
  const tokens = await tokenService.createSession(auth.user.id, meta);

  return {
    user: _sanitizeUser(auth.user),
    defaultPlayer: player ? _sanitizePlayer(player) : null,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken
  };
}

// ── Strip sensitive fields ──
function _sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    status: user.status,
    createdAt: user.createdAt
  };
}

function _sanitizePlayer(player) {
  return {
    id: player.id,
    displayName: player.displayName,
    avatarUrl: player.avatarUrl,
    handicap: player.handicap ? Number(player.handicap) : null,
    isDefault: player.isDefault,
    status: player.status
  };
}

module.exports = { register, login, _sanitizeUser, _sanitizePlayer };
