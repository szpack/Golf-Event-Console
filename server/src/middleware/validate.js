// ============================================================
// validate.js — Input validation middleware
// ============================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegister(req, res, next) {
  const { email, password, displayName } = req.body || {};
  const errors = [];

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    errors.push('Valid email is required');
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }
  if (password && password.length > 128) {
    errors.push('Password must be at most 128 characters');
  }
  if (!displayName || typeof displayName !== 'string' || displayName.trim().length === 0) {
    errors.push('Display name is required');
  }
  if (displayName && displayName.trim().length > 50) {
    errors.push('Display name must be at most 50 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: errors[0], errors });
  }
  next();
}

function validateLogin(req, res, next) {
  const { email, password } = req.body || {};
  const errors = [];

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    errors.push('Valid email is required');
  }
  if (!password || typeof password !== 'string' || password.length === 0) {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: errors[0], errors });
  }
  next();
}

module.exports = { validateRegister, validateLogin };
