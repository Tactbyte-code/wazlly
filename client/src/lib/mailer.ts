// lib/mailer.ts
import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true, // true for port 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify SMTP connection/credentials once at startup (optional but useful)
transporter.verify((error, success) => {
  if (error) {
    console.error("[Mailer] SMTP connection failed:", error);
  } else {
    console.log("[Mailer] SMTP server is ready to send emails");
  }
});

export async function sendRegistrationEmail(to: string, name: string) {
  console.log("[sendRegistrationEmail] Called with:", { to, name });

  try {
    const info = await transporter.sendMail({
      from: `"Wazlly" <${process.env.SMTP_USER}>`,
      to,
      subject: "Registration Confirmed",
      html: `<p>Hi ${name},</p><p>Your registration has been confirmed. Welcome aboard!</p>`,
    });

    console.log("[sendRegistrationEmail] Email sent successfully:", {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    });

    return info;
  } catch (error) {
    console.error("[sendRegistrationEmail] Failed to send email:", error);
    throw error;
  }
}

export async function sendOTPEmailVerify(
  to: string,
  otpCode: string,
  firstName?: string,
) {
  console.log("[sendOTPEmailVerify] Called with:", { to, otpCode, firstName });
  console.log("[sendOTPEmailVerify] Using SMTP user:", process.env.SMTP_USER);

  try {
    const info = await transporter.sendMail({
      from: `"Wazlly" <${process.env.SMTP_USER}>`,
      to,
      subject: "Verify your email — OTP inside",
      html: `
        <p>Hi ${firstName || "there"},</p>
        <p>Your One-Time Password (OTP) for email verification is:</p>
        <h2 style="letter-spacing: 4px;">${otpCode}</h2>
        <p>This code will expire in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
      `,
    });

    console.log("[sendOTPEmailVerify] OTP email sent successfully:", {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    });

    return info;
  } catch (error) {
    console.error("[sendOTPEmailVerify] Failed to send OTP email:", error);
    throw error;
  }
}