// ============================================================
// routes/auth.js — Register / Login / Logout / Refresh
// ============================================================

const express = require('express');
const router = express.Router();
const { validateRegister, validateLogin } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const authService = require('../services/authService');
const tokenService = require('../services/tokenService');

// ── POST /api/v1/auth/register ──
router.post('/register', validateRegister, async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    const meta = {
      userAgent: req.headers['user-agent'],
      ip: req.ip
    };

    const result = await authService.register({ email, password, displayName }, meta);

    if (result.error) {
      return res.status(409).json({ error: result.error });
    }

    res.status(201).json(result);
  } catch (err) {
    console.error('[auth/register]', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ── POST /api/v1/auth/login ──
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    const meta = {
      userAgent: req.headers['user-agent'],
      ip: req.ip
    };

    const result = await authService.login({ email, password }, meta);

    if (result.error) {
      return res.status(401).json({ error: result.error });
    }

    res.json(result);
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── POST /api/v1/auth/logout ──
router.post('/logout', requireAuth, async (req, res) => {
  try {
    await tokenService.revokeSession(req.sessionId);
    res.json({ success: true });
  } catch (err) {
    console.error('[auth/logout]', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ── POST /api/v1/auth/refresh ──
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const result = await tokenService.refreshSession(refreshToken);
    if (!result) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    res.json({ accessToken: result.accessToken });
  } catch (err) {
    console.error('[auth/refresh]', err);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

module.exports = router;
