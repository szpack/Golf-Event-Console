// ============================================================
// userService.js — User + Player read/update
// ============================================================

const { PrismaClient } = require('@prisma/client');
const { _sanitizeUser, _sanitizePlayer } = require('./authService');

const prisma = new PrismaClient();

// ── Get /me data ──
async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      authIdentities: { select: { provider: true, isPrimary: true, verifiedAt: true } },
      players: { where: { isDefault: true, status: 'active' }, take: 1 }
    }
  });

  if (!user) return null;

  return {
    user: _sanitizeUser(user),
    defaultPlayer: user.players[0] ? _sanitizePlayer(user.players[0]) : null,
    authProviders: user.authIdentities.map(a => ({
      provider: a.provider,
      isPrimary: a.isPrimary,
      verified: !!a.verifiedAt
    }))
  };
}

// ── Update user display name ──
async function updateMe(userId, { displayName }) {
  const data = {};
  if (displayName !== undefined) data.displayName = displayName.trim();
  if (Object.keys(data).length === 0) return null;

  const user = await prisma.user.update({
    where: { id: userId },
    data
  });
  return _sanitizeUser(user);
}

// ── Get default player ──
async function getDefaultPlayer(userId) {
  const player = await prisma.player.findFirst({
    where: { ownerUserId: userId, isDefault: true, status: 'active' }
  });
  return player ? _sanitizePlayer(player) : null;
}

// ── Update default player ──
async function updateDefaultPlayer(userId, { displayName, handicap }) {
  const player = await prisma.player.findFirst({
    where: { ownerUserId: userId, isDefault: true, status: 'active' }
  });
  if (!player) return null;

  const data = {};
  if (displayName !== undefined) data.displayName = displayName.trim();
  if (handicap !== undefined) data.handicap = handicap;

  if (Object.keys(data).length === 0) return _sanitizePlayer(player);

  const updated = await prisma.player.update({
    where: { id: player.id },
    data
  });
  return _sanitizePlayer(updated);
}

module.exports = { getMe, updateMe, getDefaultPlayer, updateDefaultPlayer };
