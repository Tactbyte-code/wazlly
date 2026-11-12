/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */

import nodemailer from "nodemailer";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import { getSMTPConfig } from "server/controllers/smtp.controller";
import { getFirstPanelConfig, getPanelConfigs } from "./panel.config";
import { cacheGet, cacheInvalidate, CACHE_KEYS, CACHE_TTL } from "./cache";
import { resolvePublicOrigin } from "./public-origin";

let transporter: any = null;
let transporterConfigKey: string | null = null;

async function resolveLogoUrl(
  smtpLogo?: string | null,
  panelLogo?: string | null,
): Promise<string | undefined> {
  const logo = smtpLogo || panelLogo;
  if (!logo) return undefined;
  if (logo.startsWith("http://") || logo.startsWith("https://")) return logo;
  const baseUrl = await resolvePublicOrigin();
  if (!baseUrl) return undefined;
  const path = logo.startsWith("/") ? logo : `/uploads/${logo}`;
  return `${baseUrl}${path}`;
}

async function getTransporter() {
  const config = await getSMTPConfig();

  // Never silently use JSON transport: it does not deliver emails.
  if (!config) {
    throw new Error("SMTP configuration not found.");
  }

  const port = Number(config.port);

  if (
    !config.host ||
    !Number.isInteger(port) ||
    port <= 0 ||
    !config.user ||
    !config.password
  ) {
    throw new Error("SMTP configuration is incomplete or invalid.");
  }

  const configKey = JSON.stringify({
    host: config.host,
    port,
    user: config.user,
    password: config.password,
    secure: port === 465,
  });

  // Reuse transporter only if the SMTP configuration is unchanged.
  if (transporter && transporterConfigKey === configKey) {
    return transporter;
  }

  if (transporter) {
    transporter.close();
  }

  const secure = port === 465;

  transporter = nodemailer.createTransport({
    host: config.host,
    port,
    secure,
    ...(port === 587 ? { requireTLS: true } : {}),
    auth: {
      user: config.user,
      pass: config.password,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });

  transporterConfigKey = configKey;

  return transporter;
}

async function getConfig() {
  return getSMTPConfig();
}

async function getPanelConfig() {
  const configs = await getPanelConfigs();
  return Array.isArray(configs) ? configs[0] : configs;
}

export function resetEmailCache() {
  if (transporter) {
    transporter.close();
  }

  transporter = null;
  transporterConfigKey = null;

  cacheInvalidate(CACHE_KEYS.smtpConfig()).catch(() => {});
  cacheInvalidate(CACHE_KEYS.panelConfig()).catch(() => {});
}

function generateOTPEmailHTML(
  companyName?: string,
  logo?: string,
  otpCode?: string,
  name?: string,
): string {
  const displayName = companyName || "Your Company";
  const headerContent = logo
    ? `<img src="${logo}" alt="${displayName} Logo" style="max-height: 60px; margin-bottom: 10px;">`
    : `<div class="logo">${displayName}</div>`;

  const messageText = `Please use the verification code below to verify your identity.`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .container { background: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 28px; font-weight: bold; color: #1f2937; margin-bottom: 10px; }
        .otp-box { background: #f3f4f6; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
        .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1f2937; font-family: 'Courier New', monospace; }
        .message { font-size: 16px; color: #4b5563; margin: 20px 0; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; font-size: 14px; color: #92400e; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${headerContent}
          <p style="color: #6b7280; margin: 0;">Our Platform</p>
        </div>
        
        <div class="message">
          ${name ? `<p>Hello <strong>${name}</strong>,</p>` : "<p>Hello,</p>"}
          <p>${messageText}</p>
        </div>
        
        <div class="otp-box">
          <div style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">Your Verification Code</div>
          <div class="otp-code">${otpCode}</div>
          <div style="font-size: 12px; color: #9ca3af; margin-top: 10px;">Valid for 5 minutes</div>
        </div>
        
        <div class="warning">
          <strong>Security Notice:</strong> Never share this code with anyone. ${displayName} will never ask for your verification code.
        </div>
        
        <div class="message">
          <p>If you didn't request this code, please ignore this email or contact our support team.</p>
        </div>
        
        <div class="footer">
          <p>This is an automated message from ${displayName}.</p>
          <p>&copy; ${new Date().getFullYear()} ${displayName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateOTPEmailText(
  companyName: string,
  otpCode: string,
  name?: string,
): string {
  return `
Hello${name ? " " + name : ""},

Thank you for signing up for ${companyName}!

Your verification code is: ${otpCode}

This code will expire in 5 minutes.

If you didn't request this code, please ignore this email.

---
${companyName}
Our Platform
  `.trim();
}

function generateForgotPasswordEmailHTML(
  companyName?: string,
  logo?: string,
  otpCode?: string,
  name?: string,
): string {
  const displayName = companyName || "Your Company";
  const headerContent = logo
    ? `<img src="${logo}" alt="${displayName} Logo" style="max-height: 60px; margin-bottom: 10px;">`
    : `<div class="logo">${displayName}</div>`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .container { background: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 28px; font-weight: bold; color: #1f2937; margin-bottom: 10px; }
        .otp-box { background: #f3f4f6; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
        .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1f2937; font-family: 'Courier New', monospace; }
        .message { font-size: 16px; color: #4b5563; margin: 20px 0; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; font-size: 14px; color: #92400e; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${headerContent}
          <p style="color: #6b7280; margin: 0;">Our Platform</p>
        </div>

        <div class="message">
          ${name ? `<p>Hello <strong>${name}</strong>,</p>` : "<p>Hello,</p>"}
          <p>You requested to reset your password. Use the verification code below to reset your password.</p>
        </div>

        <div class="otp-box">
          <div style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">Your Verification Code</div>
          <div class="otp-code">${otpCode}</div>
          <div style="font-size: 12px; color: #9ca3af; margin-top: 10px;">Valid for 5 minutes</div>
        </div>

        <div class="warning">
          <strong>Security Notice:</strong> Never share this code with anyone. ${displayName} will never ask for your verification code.
        </div>

        <div class="message">
          <p>If you didn't request this password reset, please ignore this email or contact our support team.</p>
        </div>

        <div class="footer">
          <p>This is an automated message from ${displayName}.</p>
          <p>&copy; ${new Date().getFullYear()} ${displayName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateForgotPasswordEmailText(
  companyName: string,
  otpCode: string,
  name?: string,
): string {
  return `
Hello${name ? " " + name : ""},

You requested to reset your password for ${companyName}.

Your verification code is: ${otpCode}

This code will expire in 5 minutes.

If you didn't request a password reset, please ignore this email.

---
${companyName}
Our Platform
  `.trim();
}

export const sendOTPEmail = async (email, otp) => {
  console.log("\n========== SMTP DEBUG START ==========");

  try {
    const config = await getSMTPConfig();

    if (!config) {
      throw new Error("No SMTP configuration found in database");
    };

    // STEP 2: Extract database configuration
    const host = config.host;
    const port = Number(config.port);
    const user = config.user;
    const pass = config.password;

    // STEP 1: Read environment variables
    // const host = process.env.SMTP_HOST;
    // const port = Number(process.env.SMTP_PORT);
    // const user = process.env.SMTP_USER;
    // const pass = process.env.SMTP_PASS;

    console.log("[SMTP 1] Reading environment variables");

    console.log({
      host,
      port,
      user,
      passwordExists: Boolean(pass),
      passwordLength: pass?.length || 0,
      recipient: email,
    });

    if (!host || !port || !user || !pass) {
      throw new Error("Missing SMTP environment variables");
    }

    // STEP 2: Create transporter
    console.log("[SMTP 2] Creating Nodemailer transporter");

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
      logger: false,
      debug: false,
    });

    console.log("[SMTP 2] Transporter created successfully");

    // STEP 3: Verify SMTP connection
    console.log("[SMTP 3] Verifying SMTP connection...");

    await transporter.verify();

    console.log("[SMTP 3] SMTP connection verified successfully");

    // STEP 4: Prepare email
    console.log("[SMTP 4] Preparing OTP email");

    const mailOptions = {
      from: `"Wazlly" <${user}>`,
      to: email,
      subject: "Your Wazlly Verification Code",
      text: `Your OTP is ${otp}. It is valid for 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Wazlly Verification</h2>
          <p>Your verification code is:</p>
          <h1 style="letter-spacing: 5px;">${otp}</h1>
          <p>This OTP is valid for 10 minutes.</p>
          <p>If you did not request this code, please ignore this email.</p>
        </div>
      `,
    };

    // STEP 5: Send email
    console.log("[SMTP 5] Sending OTP email...");

    const info = await transporter.sendMail(mailOptions);

    console.log("[SMTP 5] Email sent successfully");

    console.log({
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    });

    console.log("========== SMTP DEBUG SUCCESS ==========\n");

    return {
      success: true,
      message: "OTP email sent successfully",
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("\n========== SMTP DEBUG FAILED ==========");

    console.error("[SMTP ERROR] Message:", error.message);
    console.error("[SMTP ERROR] Code:", error.code);
    console.error("[SMTP ERROR] Command:", error.command);
    console.error("[SMTP ERROR] Response Code:", error.responseCode);
    console.error("[SMTP ERROR] Response:", error.response);

    console.error("[SMTP ERROR] Full error:", error);

    console.error("========== SMTP DEBUG END ==========\n");

    throw error;
  }
};

// export const sendOTPEmail = async (email, otp) => {
//   try {
//     const config = await getSMTPConfig();

//     if (!config) {
//       throw new Error("No SMTP configuration found in database");
//     }

//     // STEP 2: Extract database configuration
//     const host = config.host;
//     const port = Number(config.port);
//     const user = config.user;
//     const pass = config.password;

//     console.log("host: ", host);
//     console.log("port: ", port);
//     console.log("user: ", user);
//     console.log("password: ", pass);

//     if (!host || !port || !user || !pass) {
//       throw new Error("Incomplete SMTP configuration in database");
//     }

//     // STEP 3: Create transporter
//     const transporter = nodemailer.createTransport({
//       host,
//       port,
//       secure: port === 465,
//       auth: {
//         user,
//         pass,
//       },
//       connectionTimeout: 15000,
//       greetingTimeout: 15000,
//       socketTimeout: 20000,
//     });

//     // STEP 4: Verify SMTP connection
//     await transporter.verify();

//     // STEP 5: Prepare email
//     const mailOptions = {
//       from: `"Wazlly" <${user}>`,
//       to: email,
//       subject: "Your Wazlly Verification Code",
//       text: `Your OTP is ${otp}. It is valid for 10 minutes.`,
//       html: `
//         <div style="font-family: Arial, sans-serif; padding: 20px;">
//           <h2>Wazlly Verification</h2>
//           <p>Your verification code is:</p>
//           <h1 style="letter-spacing: 5px;">${otp}</h1>
//           <p>This OTP is valid for 10 minutes.</p>
//           <p>If you did not request this code, please ignore this email.</p>
//         </div>
//       `,
//     };

//     // STEP 6: Send email
//     const info = await transporter.sendMail(mailOptions);

//     console.log({
//       messageId: info.messageId,
//       accepted: info.accepted,
//       rejected: info.rejected,
//       response: info.response,
//     });

//     return {
//       success: true,
//       message: "OTP email sent successfully",
//       messageId: info.messageId,
//     };
//   } catch (error) {
//     console.error("[SMTP ERROR] Message:", error.message);
//     console.error("[SMTP ERROR] Code:", error.code);
//     console.error("[SMTP ERROR] Command:", error.command);
//     console.error("[SMTP ERROR] Response Code:", error.responseCode);
//     console.error("[SMTP ERROR] Response:", error.response);

//     console.error("[SMTP ERROR] Full error:", error);

//     throw error;
//   }
// };

// export async function sendOTPEmail(
//   email: string,
//   otpCode: string,
//   name?: string,
// ) {
//   try {
//     console.log('function entered');

//     const config = await getConfig();
//     console.log('config: ', config);
//     const configs = await getPanelConfig();
//     console.log('panel config: ', configs);

//     if (!config?.fromEmail) {
//       throw new Error("SMTP sender email address is not configured.");
//     }

//     const mailer = await getTransporter();

//     const companyName = configs?.name || "Your Company";
//     const fromName = config.fromName || companyName;
//     const fromEmail = config.fromEmail;

//     const mailOptions = {
//       from: `"${fromName}" <${fromEmail}>`,
//       to: email,
//       subject: `Your ${companyName} Password Reset Code`,
//       html: generateForgotPasswordEmailHTML(
//         companyName,
//         await resolveLogoUrl(config.logo, configs?.logo),
//         otpCode,
//         name,
//       ),
//       text: generateForgotPasswordEmailText(companyName, otpCode, name),
//     };

//     const info = await mailer.sendMail(mailOptions);

//     // Check whether the SMTP server accepted the recipient.
//     if (
//       !info.accepted ||
//       info.accepted.length === 0 ||
//       (info.rejected && info.rejected.length > 0)
//     ) {
//       throw new Error(`SMTP rejected recipient: ${email}`);
//     }

//     diployLogger?.info?.(
//       `[Email] Password reset OTP accepted by SMTP for ${email}`,
//     );

//     return {
//       success: true,
//       messageId: info.messageId,
//     };
//   } catch (error: any) {
//     console.error("[Email] Failed to send password reset OTP:", {
//       message: error?.message,
//       code: error?.code,
//       response: error?.response,
//       command: error?.command,
//     });

//     throw error;
//   }
// }

export async function sendContactEmail(data: {
  name: string;
  email: string;
  company?: string;
  subject: string;
  message: string;
}) {
  const { name, email, company, subject, message } = data;

  const config = await getConfig();
  const configs = await getPanelConfig();
  const mailer = await getTransporter();

  const companyName = configs?.name || "Your Company";
  const fromName = config?.fromName || companyName;
  const fromEmail = config?.fromEmail;

  const html = `
  <div style="background:#f4f5f7; padding:40px; font-family:Arial, sans-serif;">
    <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
      <div style="background:#4f46e5; padding:24px; color:#ffffff; text-align:center;">
        <h2 style="margin:0; font-size:24px; font-weight:600;">New Contact Form Message</h2>
        <p style="margin:6px 0 0; opacity:0.85;">${companyName}</p>
      </div>
      <div style="padding:30px;">
        <p style="font-size:16px; color:#111827;">You have received a new message from your website contact form.</p>
        <table style="width:100%; margin-top:20px;">
          <tr>
            <td style="padding:10px 0; font-size:16px; font-weight:600; width:150px; color:#374151;">Name:</td>
            <td style="padding:10px 0; font-size:16px; color:#111827;">${name}</td>
          </tr>
          <tr>
            <td style="padding:10px 0; font-size:16px; font-weight:600; color:#374151;">Email:</td>
            <td style="padding:10px 0; font-size:16px; color:#111827;">${email}</td>
          </tr>
          <tr>
            <td style="padding:10px 0; font-size:16px; font-weight:600; color:#374151;">Company:</td>
            <td style="padding:10px 0; font-size:16px; color:#111827;">${company || "-"}</td>
          </tr>
          <tr>
            <td style="padding:10px 0; font-size:16px; font-weight:600; color:#374151;">Subject:</td>
            <td style="padding:10px 0; font-size:16px; color:#111827;">${subject}</td>
          </tr>
        </table>
        <div style="margin-top:30px;">
          <p style="font-size:16px; font-weight:600; color:#374151; margin-bottom:8px;">Message:</p>
          <div style="background:#f9fafb; padding:20px; border-radius:10px; font-size:15px; line-height:1.6; color:#111827;">
            ${message.replace(/\n/g, "<br>")}
          </div>
        </div>
      </div>
      <div style="background:#f3f4f6; padding:18px; text-align:center; font-size:13px; color:#6b7280;">
        This email was sent from the contact form on <strong>${companyName}</strong>.
      </div>
    </div>
  </div>
`;

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: fromEmail,
    subject: `Contact Form: ${subject}`,
    html,
    text: `${name} (${email}) says: ${message}`,
  };

  try {
    const info = await mailer.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[Contact] Failed:", error);
    throw new Error("Failed to send contact message");
  }
}

export async function sendOTPEmailVerify(
  email: string,
  otpCode: string,
  name?: string,
) {
  const config = await getConfig();
  const configs = await getPanelConfig();
  const mailer = await getTransporter();

  const companyName = configs?.name || "Your Company";
  const fromName = config?.fromName || companyName;
  const fromEmail = config?.fromEmail;

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: `Your ${companyName} Verification Code`,
    html: generateOTPEmailHTML(
      companyName,
      await resolveLogoUrl(config?.logo, configs?.logo),
      otpCode,
      name,
    ),
    text: generateOTPEmailText(companyName, otpCode, name),
  };

  try {
    const info = await mailer.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[Email] Failed to send OTP:", error);
    throw new Error("Failed to send verification email");
  }
}

export async function verifyEmailConfiguration(): Promise<boolean> {
  try {
    const mailer = await getTransporter();
    await mailer.verify();
    return true;
  } catch (error) {
    console.error("[Email] SMTP configuration error:", error);
    return false;
  }
}
