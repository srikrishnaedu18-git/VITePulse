import nodemailer from "nodemailer";

// Transport factory
export function makeTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
    pool: true,
  });
}

// ==================== DIGEST EMAIL ====================
export async function sendDigestEmail({ to, subject, html, text, user }) {
  const footer = `<p style="font-size:12px;color:#666">
    If you prefer not to receive these emails, 
    <a href="${process.env.APP_URL}/unsubscribe?email=${encodeURIComponent(
      user?.email || to
    )}">
      unsubscribe here
    </a>.
  </p>`;

  const finalHtml = `${html}${footer}`;
  const transport = makeTransport();

  return transport.sendMail({
    from: process.env.ADMIN_EMAIL,
    to,
    subject,
    html: finalHtml,
    text,
  });
}

// ==================== VERIFICATION EMAIL ====================
export async function sendVerificationEmail({ to, token }) {
  const transport = makeTransport();

  const verifyUrl = `${process.env.APP_URL}/api/user/confirm-email-change?token=${token}`;

  const html = `<p>Hi,</p>
    <p>You requested to change your email. Please verify by clicking the link below:</p>
    <p><a href="${verifyUrl}">${verifyUrl}</a></p>
    <p style="font-size:12px;color:#666">If you did not request this change, ignore this email.</p>`;

  return transport.sendMail({
    from: process.env.ADMIN_EMAIL,
    to,
    subject: "Verify your new email address",
    html,
    text: `Verify your new email by visiting: ${verifyUrl}`,
  });
}
