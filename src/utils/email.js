// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Handles all email sending using Nodemailer
// Three email types: OTP verification, Welcome, Password Reset

import nodemailer from "nodemailer";

// ─── TRANSPORTER ─────────────────────────────────────────────
// Reusable SMTP connection — reads credentials from .env
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false, // true for port 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS, // use Gmail App Password, not your real password
  },
});

// ─── BASE SEND FUNCTION ───────────────────────────────────────
const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"Foodo" <${process.env.EMAIL_FROM}>`,
    to,
    subject,
    html,
  });
};

// ─── EMAIL 1: OTP VERIFICATION ────────────────────────────────
// Sent after signup → user must enter this OTP to verify their email
export const sendOTPEmail = async (email, otp) => {
  await sendEmail({
    to: email,
    subject: "Verify your Foodo account",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #eee;border-radius:8px;">
        <h2 style="color:#e65c00;">Foodo 🍔</h2>
        <p>Your email verification OTP is:</p>
        <h1 style="letter-spacing:10px;color:#333;font-size:36px;">${otp}</h1>
        <p>This OTP expires in <strong>5 minutes</strong>.</p>
        <p style="color:#999;font-size:12px;">If you didn't create a Foodo account, ignore this email.</p>
      </div>
    `,
  });
};

// ─── EMAIL 2: WELCOME ─────────────────────────────────────────
// Sent after email is successfully verified
export const sendWelcomeEmail = async (email, name) => {
  await sendEmail({
    to: email,
    subject: "Welcome to Foodo! 🎉",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;">
        <h2 style="color:#e65c00;">Welcome, ${name}! 🎉</h2>
        <p>Your account is verified and ready to go.</p>
        <p>Start exploring restaurants near you and enjoy your food!</p>
      </div>
    `,
  });
};

// ─── EMAIL 3: PASSWORD RESET ──────────────────────────────────
// Sent when user clicks "Forgot Password"
// Contains a unique link that expires in 15 minutes
export const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
  await sendEmail({
    to: email,
    subject: "Reset your Foodo password",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;">
        <h2 style="color:#e65c00;">Reset Your Password</h2>
        <p>Click the button below. This link expires in <strong>15 minutes</strong>.</p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#e65c00;color:white;text-decoration:none;border-radius:6px;margin-top:12px;">
          Reset Password
        </a>
        <p style="color:#999;font-size:12px;margin-top:16px;">Didn't request this? You can safely ignore this email.</p>
      </div>
    `,
  });
};
