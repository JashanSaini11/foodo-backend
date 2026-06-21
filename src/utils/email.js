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
              <!-- Foodo SVG Logo -->
            <svg width="290" height="183" viewBox="0 0 290 183" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M131.199 4.39116C128.148 7.22061 126.713 10.5806 126.713 14.8248C126.713 20.3068 125.995 21.191 120.253 22.9594C115.408 24.551 114.152 25.7889 115.229 28.0878C115.946 29.6794 116.844 34.9846 117.382 39.9362C118.1 49.3087 113.973 60.2729 108.051 65.2244C105.539 67.3465 105.719 68.2307 109.666 73.1822C115.588 80.9632 119.535 90.6895 119.535 97.5863C119.535 105.544 112.358 119.868 104.642 127.119C99.2588 132.247 97.4645 132.778 93.158 131.717C90.4664 130.832 82.7506 130.125 76.1115 130.125C65.7042 130.125 63.3715 130.656 59.4239 134.369C49.0166 143.919 46.8633 155.767 53.1436 168.146C57.9884 177.341 66.063 182.116 77.1881 182.116C91.3636 182.116 100.515 174.689 104.104 160.365L105.18 155.59H148.963H192.745L193.822 161.072C196.334 173.982 206.921 182.116 221.455 182.116C233.836 182.116 241.373 176.811 246.038 164.786L249.627 155.59H267.032H284.437L287.308 150.285C288.744 147.455 290 144.272 290 143.388C290 140.382 282.823 134.9 277.798 133.839C273.312 132.954 272.774 131.717 270.621 120.752C262.726 78.3106 223.608 40.2899 170.675 23.6668C158.652 19.9532 158.114 19.5995 156.858 12.8795C155.961 9.16586 153.628 4.74484 151.654 2.97644C146.092 -1.44458 136.402 -0.914062 131.199 4.39116ZM82.5712 148.693C87.9543 152.761 88.4926 156.651 84.3656 162.31C79.1619 169.737 65.7042 165.493 65.7042 156.121C65.7042 151.7 71.4461 144.98 75.3937 144.98C76.6498 144.98 79.8797 146.571 82.5712 148.693ZM227.915 148.693C233.298 152.761 233.836 158.243 229.53 163.017C223.788 169.384 211.048 164.963 211.048 156.651C211.048 152.053 212.663 149.754 217.328 147.102C222.173 144.449 222.352 144.449 227.915 148.693Z" fill="#333333"/>
<path d="M95.3113 19.4226C95.3113 28.4415 94.5935 30.5636 90.1076 35.1615C83.289 42.2351 78.6236 43.473 49.9138 46.8329C15.4619 50.7234 5.23405 57.0897 1.10701 77.0727C-2.12285 91.9274 1.82475 104.837 11.5143 112.795C15.8208 116.155 16.718 115.447 18.1535 108.374C22.2805 86.4453 36.6355 76.1885 67.4986 73.3591C89.9281 71.237 101.233 65.2244 107.154 52.315C113.614 38.1677 109.666 18.1847 98.9 11.2879C95.4907 8.98901 95.3113 9.34269 95.3113 19.4226Z" fill="#333333"/>
<path d="M101.95 80.079C98.0028 91.0431 92.9786 93.8726 74.3172 95.641C35.9177 99.3546 27.4842 102.715 20.6656 117.392C10.6171 139.321 22.8188 165.67 44.8896 169.207L51.5287 170.268L47.5811 162.841C40.5831 149.577 44.8896 133.662 57.2707 127.119C59.065 126.058 68.2163 124.643 77.547 123.936C95.4907 122.344 100.515 120.222 107.334 111.203C113.793 102.715 113.793 86.4453 107.334 78.1337L104.104 74.0664L101.95 80.079Z" fill="#333333"/>
</svg>
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
      <a href="${process.env.CLIENT_URL}/home"
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