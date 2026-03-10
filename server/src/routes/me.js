// ============================================================
// routes/me.js — Current user info
// ============================================================

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const userService = require('../services/userService');

// ── GET /api/v1/me ──
router.get('/', requireAuth, async (req, res) => {
  try {
    const data = await userService.getMe(req.userId);
    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(data);
  } catch (err) {
    console.error('[me/get]', err);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// ── PATCH /api/v1/me ──
router.patch('/', requireAuth, async (req, res) => {
  try {
    const { displayName } = req.body || {};
    if (displayName !== undefined && (typeof displayName !== 'string' || displayName.trim().length === 0)) {
      return res.status(400).json({ error: 'Display name cannot be empty' });
    }
    if (displayName && displayName.trim().length > 50) {
      return res.status(400).json({ error: 'Display name must be at most 50 characters' });
    }

    const user = await userService.updateMe(req.userId, { displayName });
    if (!user) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    res.json({ user });
  } catch (err) {
    console.error('[me/patch]', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

module.exports = router;
