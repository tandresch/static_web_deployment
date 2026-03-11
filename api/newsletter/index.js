const nodemailer = require('nodemailer');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getMissingConfig = () => {
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
  return required.filter((key) => !process.env[key]);
};

module.exports = async function (context, req) {
  const { subscriberEmail, submittedAt, pageUrl } = req.body || {};

  if (!subscriberEmail || !emailRegex.test(subscriberEmail)) {
    context.res = {
      status: 400,
      body: { error: 'Invalid subscriber email address.' }
    };
    return;
  }

  const missingConfig = getMissingConfig();
  if (missingConfig.length > 0) {
    context.res = {
      status: 500,
      body: {
        error: `SMTP server is not configured. Missing: ${missingConfig.join(', ')}`
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
      subject: `Newsletter signup: ${subscriberEmail}`,
      text: [
        'New newsletter registration',
        `Subscriber: ${subscriberEmail}`,
        `Submitted at: ${submittedAt || new Date().toISOString()}`,
        `Page URL: ${pageUrl || 'N/A'}`
      ].join('\n')
    });

    context.res = {
      status: 200,
      body: { ok: true }
    };
  } catch (error) {
    context.log.error('SMTP send failed:', error);
    context.res = {
      status: 500,
      body: {
        error: 'Failed to send newsletter registration email.',
        details: error && (error.response || error.message) ? (error.response || error.message) : 'Unknown SMTP error'
      }
    };
  }
};
