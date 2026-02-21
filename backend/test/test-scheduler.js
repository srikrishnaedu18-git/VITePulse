import cron from "node-cron";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

// ==================== AWS SES TRANSPORT ====================
function makeTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,       // e.g. email-smtp.ap-south-1.amazonaws.com
    port: Number(process.env.SMTP_PORT), // usually 587
    secure: false,
    auth: {
      user: process.env.MAIL_USER,     // AWS SES SMTP user
      pass: process.env.MAIL_PASS,     // AWS SES SMTP password
    },
    pool: true,
  });
}

// ==================== SEND SAMPLE EMAIL ====================
async function sendSampleEmail() {
  const transport = makeTransport();

  const info = await transport.sendMail({
    from: process.env.ADMIN_EMAIL,          // verified SES sender
    to: process.env.TEST_EMAIL || process.env.ADMIN_EMAIL, // recipient
    subject: "⏰ Cron Test Email",
    text: "Hello! This is a test email sent every 2 minutes via AWS SES.",
    html: "<p>Hello! 👋<br>This is a <strong>test email</strong> sent every 2 minutes via AWS SES.</p>",
  });

  console.log("📧 Test email sent:", info.messageId);
}

// ==================== CRON SCHEDULER ====================
cron.schedule("*/2 * * * *", async () => {
  console.log("⏳ Running cron job at", new Date().toLocaleString());
  try {
    await sendSampleEmail();
  } catch (err) {
    console.error("❌ Failed to send email:", err.message);
  }
}, {
  scheduled: true,
  timezone: "Asia/Kolkata",
});

console.log("✅ Scheduler started. Will send an email every 2 minutes...");
