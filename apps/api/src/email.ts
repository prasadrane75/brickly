import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST || "smtp.office365.com";
const smtpPort = Number(process.env.SMTP_PORT || "587");
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";
const smtpFrom = process.env.SMTP_FROM || smtpUser;

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: false,
  auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
});

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  if (!smtpUser || !smtpPass || !smtpFrom) {
    throw new Error("SMTP_NOT_CONFIGURED");
  }
  await transporter.sendMail({
    from: smtpFrom,
    to,
    subject: "Verify your Brickly account",
    text: `Verify your email by clicking: ${verifyUrl}`,
    html: `<p>Verify your email by clicking:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
  });
}
