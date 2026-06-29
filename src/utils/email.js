// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Handles all email sending using Resend
// Three email types: OTP verification, Welcome, Password Reset
// Branded with Foodo design system colors (#FCDD0C, #111111)

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// ─── BRAND COLORS ─────────────────────────────────────────────
const COLORS = {
  primary: "#FCDD0C",
  primaryDark: "#412402",
  bg: "#FFF9E5",
  black: "#111111",
  body: "#555555",
  muted: "#888888",
  border: "#E8DFA8",
};

// ─── BRAND ────────────────────────────────────────────────────
const LOGO_URL = "https://res.cloudinary.com/dqyeisd8q/image/upload/v1782717508/Logo_id6tnv.png";

// ─── BASE EMAIL WRAPPER ───────────────────────────────────────
// Shared outer layout for all emails — keeps them consistent
const emailWrapper = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Foodo</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${COLORS.border};">

          <!-- Header -->
          <tr>
            <td style="background:${COLORS.primary};padding:28px 40px;text-align:center;">
              <!-- Foodo Logo — img tag required, inline SVG is stripped by Gmail/Outlook -->
               <img 
      src="${LOGO_URL}"
      width="250"
      height="70"
      alt="Foodo"
      style="display:block;margin:0 auto;border:0;outline:0;"
    />
              <p style="margin:8px 0 0;font-size:13px;color:${COLORS.primaryDark};font-weight:600;letter-spacing:1px;text-transform:uppercase;">
                Delivering happiness
              </p>
            </td>
          </tr>

             <!-- Body -->
          <tr>
            <td style="padding:40px;background:${COLORS.bg};">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background:#ffffff;text-align:center;border-top:1px solid ${COLORS.border};">
              <p style="margin:0;font-size:12px;color:${COLORS.muted};">
                © ${new Date().getFullYear()} Foodo. All rights reserved.
              </p>
              <p style="margin:6px 0 0;font-size:12px;color:${COLORS.muted};">
                If you didn't request this email, you can safely ignore it.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ─── BASE SEND FUNCTION ───────────────────────────────────────
const sendEmail = async ({ to, subject, html }) => {
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || "Foodo <onboarding@resend.dev>",
    to,
    subject,
    html,
  });

  if (error) {
    console.error("❌ Email sending failed:", error);
    throw { statusCode: 500, message: "Failed to send email." };
  }

  console.log(`✅ Email sent to ${to} — ID: ${data.id}`);
  return data;
};

// ─── EMAIL 1: OTP VERIFICATION ────────────────────────────────
// Sent after signup → user must enter this OTP to verify email
export const sendOTPEmail = async (email, otp) => {
  const content = `
    <h2 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${COLORS.black};">
      Verify your email
    </h2>
    <p style="margin:0 0 32px;font-size:15px;color:${COLORS.body};line-height:1.6;">
      Use the code below to verify your Foodo account. 
      This code expires in <strong>5 minutes</strong>.
    </p>

    <!-- OTP Box -->
    <div style="background:#ffffff;border:2px solid ${COLORS.primary};border-radius:12px;
                padding:28px;text-align:center;margin-bottom:32px;">
      <p style="margin:0 0 8px;font-size:13px;color:${COLORS.muted};text-transform:uppercase;
                letter-spacing:2px;font-weight:600;">
        Your OTP Code
      </p>
      <p style="margin:0;font-size:48px;font-weight:800;color:${COLORS.black};
                letter-spacing:16px;font-family:monospace;">
        ${otp}
      </p>
    </div>

    <p style="margin:0;font-size:13px;color:${COLORS.muted};text-align:center;">
      Never share this code with anyone. Foodo will never ask for your OTP.
    </p>
  `;

  await sendEmail({
    to: email,
    subject: `${otp} is your Foodo verification code`,
    html: emailWrapper(content),
  });
};

// ─── EMAIL 2: WELCOME ─────────────────────────────────────────
// Sent after email is successfully verified
export const sendWelcomeEmail = async (email, name) => {
  const content = `
    <h2 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${COLORS.black};">
      Welcome to Foodo, ${name}! 🎉
    </h2>
    <p style="margin:0 0 24px;font-size:15px;color:${COLORS.body};line-height:1.6;">
      Your account is verified and ready to go. 
      Start exploring the best restaurants near you!
    </p>

    <!-- Feature list -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid ${COLORS.border};">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:24px;padding-right:16px;vertical-align:middle;">🍔</td>
              <td>
                <p style="margin:0;font-size:14px;font-weight:700;color:${COLORS.black};">Browse Restaurants</p>
                <p style="margin:2px 0 0;font-size:13px;color:${COLORS.body};">Explore hundreds of restaurants near you</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid ${COLORS.border};">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:24px;padding-right:16px;vertical-align:middle;">⚡</td>
              <td>
                <p style="margin:0;font-size:14px;font-weight:700;color:${COLORS.black};">Fast Delivery</p>
                <p style="margin:2px 0 0;font-size:13px;color:${COLORS.body};">Get food delivered hot and fresh to your door</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:24px;padding-right:16px;vertical-align:middle;">📍</td>
              <td>
                <p style="margin:0;font-size:14px;font-weight:700;color:${COLORS.black};">Live Tracking</p>
                <p style="margin:2px 0 0;font-size:13px;color:${COLORS.body};">Track your order in real-time on the map</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- CTA Button -->
    <div style="text-align:center;">
      <a href="${process.env.CLIENT_URL}/"
        style="display:inline-block;padding:14px 40px;background:${COLORS.black};
               color:${COLORS.primary};text-decoration:none;border-radius:10px;
               font-size:15px;font-weight:700;">
        Start Ordering →
      </a>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: `Welcome to Foodo, ${name}! 🎉`,
    html: emailWrapper(content),
  });
};

// ─── EMAIL 3: PASSWORD RESET ──────────────────────────────────
// Sent when user clicks "Forgot Password"
// Link expires in 15 minutes
export const sendPasswordResetEmail = async (email, resetToken) => {
  // Points to /forgot-password (the token-reset page)
  const resetUrl = `${process.env.CLIENT_URL}/forgot-password?token=${resetToken}`;

  const content = `
    <h2 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${COLORS.black};">
      Reset your password
    </h2>
    <p style="margin:0 0 32px;font-size:15px;color:${COLORS.body};line-height:1.6;">
      We received a request to reset your Foodo password. 
      Click the button below — this link expires in <strong>15 minutes</strong>.
    </p>

    <!-- Reset Button -->
    <div style="text-align:center;margin-bottom:32px;">
      <a href="${resetUrl}"
        style="display:inline-block;padding:14px 40px;background:${COLORS.black};
               color:${COLORS.primary};text-decoration:none;border-radius:10px;
               font-size:15px;font-weight:700;">
        Reset Password →
      </a>
    </div>

    <!-- Fallback link -->
    <p style="margin:0 0 8px;font-size:13px;color:${COLORS.muted};text-align:center;">
      Button not working? Copy and paste this link:
    </p>
    <p style="margin:0;font-size:12px;color:${COLORS.muted};text-align:center;word-break:break-all;">
      ${resetUrl}
    </p>
  `;

  await sendEmail({
    to: email,
    subject: "Reset your Foodo password",
    html: emailWrapper(content),
  });
};