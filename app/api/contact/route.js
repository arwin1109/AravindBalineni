import axios from 'axios';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { isValidEmail } from '@/lib/validators/email';

const MAX_NAME_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 500;

// Nodemailer transporter is created lazily per-request so a missing/invalid
// EMAIL_ADDRESS / GMAIL_PASSKEY surfaces as a clean 500 instead of a crash
// at module load time.
function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_ADDRESS,
      pass: process.env.GMAIL_PASSKEY,
    },
  });
}

// Helper function to send a message via Telegram. Telegram is a
// best-effort notification channel, not a hard dependency: a missing
// token/chat id or a failed send should never block the contact form.
async function sendTelegramMessage(token, chat_id, message) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const res = await axios.post(url, {
      text: message,
      chat_id,
    });
    return Boolean(res.data.ok);
  } catch (error) {
    console.error('Error sending Telegram message:', error.response?.data || error.message);
    return false;
  }
}

// HTML email template
const generateEmailTemplate = (name, email, userMessage) => `
  <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; background-color: #f4f4f4;">
    <div style="max-width: 600px; margin: auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);">
      <h2 style="color: #007BFF;">New Message Received</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong></p>
      <blockquote style="border-left: 4px solid #007BFF; padding-left: 10px; margin-left: 0;">
        ${userMessage}
      </blockquote>
      <p style="font-size: 12px; color: #888;">Click reply to respond to the sender.</p>
    </div>
  </div>
`;

// Helper function to send an email via Nodemailer
async function sendEmail(payload, message) {
  const { name, email, message: userMessage } = payload;

  const mailOptions = {
    from: "Portfolio",
    to: process.env.EMAIL_ADDRESS,
    subject: `New Message From ${name}`,
    text: message,
    html: generateEmailTemplate(name, email, userMessage),
    replyTo: email,
  };

  try {
    const transporter = getTransporter();
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error while sending email:', error.message);
    return false;
  }
}

function validatePayload(payload) {
  const name = typeof payload?.name === 'string' ? payload.name.trim() : '';
  const email = typeof payload?.email === 'string' ? payload.email.trim() : '';
  const userMessage = typeof payload?.message === 'string' ? payload.message.trim() : '';

  if (!name || !email || !userMessage) {
    return 'Name, email, and message are all required.';
  }
  if (name.length > MAX_NAME_LENGTH) {
    return `Name must be ${MAX_NAME_LENGTH} characters or fewer.`;
  }
  if (userMessage.length > MAX_MESSAGE_LENGTH) {
    return `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`;
  }
  if (!isValidEmail(email)) {
    return 'Please provide a valid email address.';
  }
  return null;
}

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid request body.' }, { status: 400 });
  }

  // Honeypot: a hidden field real users never fill in. Bots that
  // auto-fill every input trip it. Report success without sending
  // anything, so the bot doesn't learn to look elsewhere.
  if (payload?.website) {
    return NextResponse.json({ success: true, message: 'Message sent successfully!' }, { status: 200 });
  }

  const validationError = validatePayload(payload);
  if (validationError) {
    return NextResponse.json({ success: false, message: validationError }, { status: 400 });
  }

  const { name, email, message: userMessage } = payload;
  const cleanPayload = { name: name.trim(), email: email.trim(), message: userMessage.trim() };

  if (!process.env.EMAIL_ADDRESS || !process.env.GMAIL_PASSKEY) {
    console.error('Contact API misconfigured: EMAIL_ADDRESS or GMAIL_PASSKEY is not set.');
    return NextResponse.json(
      { success: false, message: 'The contact form is temporarily unavailable. Please email me directly.' },
      { status: 500 },
    );
  }

  const message = `New message from ${cleanPayload.name}\n\nEmail: ${cleanPayload.email}\n\nMessage:\n\n${cleanPayload.message}\n\n`;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat_id = process.env.TELEGRAM_CHAT_ID;

  const [emailSuccess] = await Promise.all([
    sendEmail(cleanPayload, message),
    token && chat_id ? sendTelegramMessage(token, chat_id, message) : Promise.resolve(false),
  ]);

  if (emailSuccess) {
    return NextResponse.json({ success: true, message: 'Message sent successfully!' }, { status: 200 });
  }

  return NextResponse.json(
    { success: false, message: 'Failed to send your message. Please try again or email me directly.' },
    { status: 500 },
  );
}
