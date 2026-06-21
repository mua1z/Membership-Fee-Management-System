/**
 * emailService.js
 *
 * Production (Render): Uses Brevo HTTP API (HTTPS on port 443 — never blocked).
 * Local development:   Falls back to nodemailer SMTP if BREVO_API_KEY is absent.
 *
 * Why not SMTP on Render?
 *   Render's firewall blocks ALL outbound SMTP connections on ports 25, 465, and 587.
 *   No workaround exists — only HTTPS-based email APIs work.
 */

const https    = require('https');
const nodemailer = require('nodemailer');

// ─── Brevo HTTP API ───────────────────────────────────────────────────────────
function sendViaBrevo({ to, subject, text, html }) {
  return new Promise((resolve) => {
    // Strip spaces and quotes just in case they were added in Render dashboard
    let apiKey = (process.env.BREVO_API_KEY3 || '').trim().replace(/^["']|["']$/g, '');
    
    if (!apiKey) {
      return resolve({ success: false, error: 'BREVO_API_KEY3 not set.' });
    }

    // Mask key for debugging (show first 12 and last 4 chars)
    const maskedKey = apiKey.length > 16 
      ? `${apiKey.substring(0, 12)}...${apiKey.substring(apiKey.length - 4)}`
      : 'INVALID_LENGTH_KEY';
    console.log(`[EmailService] Using Brevo HTTP API. Key preview: ${maskedKey}`);

    const senderEmail = (process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '').trim();
    const senderName  = (process.env.SMTP_FROM_NAME  || 'Prosperity Party Dire Dawa').trim();

    const payload = JSON.stringify({
      sender:      { name: senderName, email: senderEmail },
      to:          [{ email: to }],
      subject,
      textContent: text  || '',
      htmlContent: html  || text || ''
    });

    const options = {
      hostname: 'api.brevo.com',
      path:     '/v3/smtp/email',
      method:   'POST',
      headers: {
        'api-key':        apiKey,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 201) {
            console.log(`[EmailService] ✅ Sent via Brevo to ${to} | messageId=${parsed.messageId}`);
            resolve({ success: true, messageId: parsed.messageId });
          } else {
            console.error(`[EmailService] ❌ Brevo API ${res.statusCode}:`, data);
            resolve({ success: false, error: `Brevo ${res.statusCode}: ${parsed.message || data}` });
          }
        } catch (e) {
          console.error('[EmailService] ❌ Brevo response parse error:', e.message);
          resolve({ success: false, error: e.message });
        }
      });
    });

    req.on('error', (err) => {
      console.error('[EmailService] ❌ Brevo request error:', err.message);
      resolve({ success: false, error: err.message });
    });

    req.setTimeout(15000, () => {
      req.destroy();
      resolve({ success: false, error: 'Brevo request timed out after 15s.' });
    });

    req.write(payload);
    req.end();
  });
}

// ─── Nodemailer SMTP fallback (local dev only) ────────────────────────────────
async function sendViaSMTP({ to, subject, text, html }) {
  const smtpUser = (process.env.SMTP_USER || '').trim();
  const smtpPass = (process.env.SMTP_PASS || '').replace(/\s/g, '');

  if (!smtpUser || !smtpPass) {
    console.warn('[EmailService] SMTP credentials not configured. Email not sent.');
    return { success: false, message: 'SMTP credentials not configured.' };
  }

  const smtpPort = parseInt(process.env.SMTP_PORT) || 587;
  const isSecure = smtpPort === 465;

  console.log(`[EmailService] SMTP connecting: port=${smtpPort} secure=${isSecure} user=${smtpUser}`);

  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   smtpPort,
    secure: isSecure,
    auth:   { user: smtpUser, pass: smtpPass },
    tls:    { rejectUnauthorized: false }
  });

  try {
    await transporter.verify();
    console.log('[EmailService] SMTP connection verified.');
  } catch (verifyErr) {
    console.warn('[EmailService] SMTP verify warning:', verifyErr.message);
  }

  const info = await transporter.sendMail({
    from:    `"${process.env.SMTP_FROM_NAME || 'PP Dire Dawa'}" <${process.env.SMTP_FROM_EMAIL || smtpUser}>`,
    to, subject, text, html
  });

  console.log(`[EmailService] ✅ SMTP sent to ${to}: ${info.messageId}`);
  return { success: true, messageId: info.messageId };
}

// ─── Public API ───────────────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, text, html }) => {
  try {
    // If BREVO_API_KEY3 is set → always use Brevo (required on Render)
    if ((process.env.BREVO_API_KEY3 || '').trim()) {
      console.log(`[EmailService] Routing to Brevo HTTP API → ${to}`);
      return await sendViaBrevo({ to, subject, text, html });
    }

    // Local dev fallback → SMTP
    console.log(`[EmailService] Using SMTP fallback → ${to}`);
    return await sendViaSMTP({ to, subject, text, html });

  } catch (error) {
    console.error('[EmailService] Unexpected error:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmail };
