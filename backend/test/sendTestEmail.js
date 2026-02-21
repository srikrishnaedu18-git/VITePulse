import { sendDigestEmail } from "../lib/email.js";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  try {
    const info = await sendDigestEmail({
      to: process.env.ADMIN_EMAIL, // must be verified in sandbox
      subject: "Test Email from SES Sandbox",
      html: "<p>This is a test email sent via AWS SES sandbox.</p>",
      text: "This is a test email sent via AWS SES sandbox.",
    });

    console.log("✅ Message sent:", info.messageId);
  } catch (err) {
    console.error("❌ Error sending email:", err);
  }
}

main();
