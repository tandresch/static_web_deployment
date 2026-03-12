const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config();

const app = express();
const port = Number(process.env.PORT || 5500);

app.use(express.json());
app.use(express.static(__dirname));

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getMissingConfig = () => {
    const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
    return required.filter(key => !process.env[key]);
};

app.post('/api/newsletter', async (req, res) => {
    const { subscriberEmail, submittedAt, pageUrl } = req.body || {};

    if (!subscriberEmail || !emailRegex.test(subscriberEmail)) {
        return res.status(400).json({ error: 'Invalid subscriber email address.' });
    }

    const missingConfig = getMissingConfig();
    if (missingConfig.length > 0) {
        return res.status(500).json({
            error: `SMTP server is not configured. Missing: ${missingConfig.join(', ')}`
        });
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

    const recipient = process.env.NEWSLETTER_TO || 'newletter@andres.ch';

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

        return res.status(200).json({ ok: true });
    } catch (error) {
        console.error('SMTP send failed:', error);
        return res.status(500).json({
            error: 'Failed to send newsletter registration email.',
            details: error?.response || error?.message || 'Unknown SMTP error'
        });
    }
});

app.get('/api/health', (_req, res) => {
    res.status(200).json({ ok: true });
});

app.listen(port, () => {
    console.log(`SMTP server running at http://localhost:${port}`);
});
