const nodemailer = require('nodemailer');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const rateLimitByIp = new Map();

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const getMissingConfig = () => {
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
  return required.filter((key) => !process.env[key]);
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const getClientIp = (req) => {
  const forwarded = req.headers && req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }

  return 'unknown';
};

const isRateLimited = (ipAddress) => {
  const now = Date.now();
  const existing = rateLimitByIp.get(ipAddress);

  if (!existing || now - existing.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitByIp.set(ipAddress, { count: 1, windowStart: now });
    return false;
  }

  if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  existing.count += 1;
  rateLimitByIp.set(ipAddress, existing);
  return false;
};

const isValidPageUrl = (value) => {
  if (!value) {
    return true;
  }

  if (typeof value !== 'string' || value.length > 2048) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const buildResponseHeaders = (origin) => {
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers.Vary = 'Origin';
  }

  return headers;
};

module.exports = async function (context, req) {
  const method = String(req.method || 'POST').toUpperCase();
  const origin = req.headers && req.headers.origin;
  const responseHeaders = buildResponseHeaders(origin);

  if (origin && allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
    context.res = {
      status: 403,
      headers: responseHeaders,
      body: { error: 'Origin is not allowed.' }
    };
    return;
  }

  if (method === 'OPTIONS') {
    context.res = {
      status: 204,
      headers: responseHeaders
    };
    return;
  }

  if (method !== 'POST') {
    context.res = {
      status: 405,
      headers: responseHeaders,
      body: { error: 'Method not allowed.' }
    };
    return;
  }

  const contentType = req.headers && req.headers['content-type'];
  if (!String(contentType || '').toLowerCase().includes('application/json')) {
    context.res = {
      status: 415,
      headers: responseHeaders,
      body: { error: 'Content-Type must be application/json.' }
    };
    return;
  }

  const ipAddress = getClientIp(req);
  if (isRateLimited(ipAddress)) {
    context.res = {
      status: 429,
      headers: responseHeaders,
      body: { error: 'Too many requests. Try again later.' }
    };
    return;
  }

  const { subscriberEmail, submittedAt, pageUrl, company } = req.body || {};
  const normalizedEmail = normalizeEmail(subscriberEmail);

  if (company) {
    context.res = {
      status: 200,
      headers: responseHeaders,
      body: { ok: true }
    };
    return;
  }

  if (!normalizedEmail || normalizedEmail.length > 254 || !emailRegex.test(normalizedEmail)) {
    context.res = {
      status: 400,
      headers: responseHeaders,
      body: { error: 'Invalid subscriber email address.' }
    };
    return;
  }

  if (!isValidPageUrl(pageUrl)) {
    context.res = {
      status: 400,
      headers: responseHeaders,
      body: { error: 'Invalid page URL.' }
    };
    return;
  }

  const missingConfig = getMissingConfig();
  if (missingConfig.length > 0) {
    context.res = {
      status: 500,
      headers: responseHeaders,
      body: {
        error: 'Newsletter service is not configured.'
      }
    };
    return;
  }

  const smtpPort = Number(process.env.SMTP_PORT);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const recipient = process.env.NEWSLETTER_TO || 'newsletter@andres.ch';

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: recipient,
      subject: `Newsletter signup: ${normalizedEmail}`,
      text: [
        'New newsletter registration',
        `Subscriber: ${normalizedEmail}`,
        `Submitted at: ${submittedAt || new Date().toISOString()}`,
        `Page URL: ${pageUrl || 'N/A'}`
      ].join('\n')
    });

    context.res = {
      status: 200,
      headers: responseHeaders,
      body: { ok: true }
    };
  } catch (error) {
    context.log.error('SMTP send failed:', error);
    context.res = {
      status: 500,
      headers: responseHeaders,
      body: {
        error: 'Failed to process newsletter registration.'
      }
    };
  }
};
