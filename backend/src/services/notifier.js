const nodemailer = require('nodemailer');
const axios = require('axios');

// ── Email transporter ────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ── Status display labels ────────────────────────────────────────
const STATUS_LABELS = {
  CREATED: 'Order Created',
  AGENT_ASSIGNED: 'Agent Assigned',
  PICKED_UP: 'Package Picked Up',
  IN_TRANSIT: 'In Transit',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered 🎉',
  FAILED: 'Delivery Failed',
  RESCHEDULED: 'Rescheduled'
};

// ── Email Templates ──────────────────────────────────────────────
function buildEmailTemplate(customerName, orderId, status, note) {
  const statusLabel = STATUS_LABELS[status] || status;
  const trackingUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/track/${orderId}`;

  return `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 20px;">
        <h1 style="color: white; margin: 0; font-size: 24px;">LastMile Delivery</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0;">Order Status Update</p>
      </div>
      
      <div style="background: white; border-radius: 12px; padding: 30px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <h2 style="color: #1e293b; margin-top: 0;">Hi ${customerName},</h2>
        <p style="color: #475569; font-size: 16px;">Your order <strong>#${orderId.slice(-8).toUpperCase()}</strong> status has been updated:</p>
        
        <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea;">
          <h3 style="margin: 0; color: #1e293b; font-size: 20px;">${statusLabel}</h3>
          ${note ? `<p style="color: #64748b; margin: 8px 0 0 0;">${note}</p>` : ''}
        </div>
        
        ${status === 'FAILED' ? `
          <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #ef4444;">
            <p style="color: #991b1b; margin: 0; font-weight: 600;">Delivery attempt failed.</p>
            <p style="color: #dc2626; margin: 8px 0 0 0;">Please visit your order page to reschedule a new delivery date.</p>
          </div>
        ` : ''}
        
        <a href="${trackingUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; margin-top: 10px;">
          Track Your Order →
        </a>
      </div>
      
      <p style="color: #94a3b8; text-align: center; font-size: 12px; margin: 0;">
        This is an automated notification from LastMile Delivery Tracker.
      </p>
    </div>
  `;
}

// ── Send Email ───────────────────────────────────────────────────
async function sendEmail(to, customerName, orderId, status, note = '') {
  if (!process.env.EMAIL_USER) {
    console.log(`[EMAIL SKIP] Email not configured. Would send: ${status} to ${to}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"LastMile Delivery" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Order Update: ${STATUS_LABELS[status] || status} — #${orderId.slice(-8).toUpperCase()}`,
      html: buildEmailTemplate(customerName, orderId, status, note)
    });
    console.log(`[EMAIL] Sent status=${status} to ${to}`);
  } catch (err) {
    console.error(`[EMAIL ERROR] Failed to send to ${to}:`, err.message);
    // Non-fatal: don't throw — notification failure should not break order flow
  }
}

// ── Send SMS via Fast2SMS ────────────────────────────────────────
async function sendSMS(phone, message) {
  if (!process.env.FAST2SMS_API_KEY || !phone) {
    console.log(`[SMS SKIP] Fast2SMS not configured or no phone. Would send: ${message}`);
    return;
  }

  try {
    const response = await axios.post(
      'https://www.fast2sms.com/dev/bulkV2',
      {
        route: 'q',
        message,
        language: 'english',
        flash: 0,
        numbers: phone
      },
      {
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`[SMS] Sent to ${phone}: ${JSON.stringify(response.data)}`);
  } catch (err) {
    console.error(`[SMS ERROR] Failed to send to ${phone}:`, err.message);
    // Non-fatal
  }
}

// ── Main notifier function ───────────────────────────────────────
/**
 * Notify customer on order status change.
 * Sends both email and SMS (non-blocking, non-fatal).
 * 
 * @param {Object} order - Prisma order with customer relation
 * @param {string} status - New OrderStatus
 * @param {string} note - Optional note
 */
async function notifyCustomer(order, status, note = '') {
  const { customer } = order;
  if (!customer) return;

  const smsMessage = `LastMile Delivery: Order #${order.id.slice(-8).toUpperCase()} - ${STATUS_LABELS[status] || status}. ${note}`;

  // Fire and forget (don't await — non-blocking)
  sendEmail(customer.email, customer.name, order.id, status, note).catch(() => {});
  if (customer.phone) {
    sendSMS(customer.phone, smsMessage).catch(() => {});
  }
}

module.exports = { notifyCustomer, sendEmail, sendSMS };
