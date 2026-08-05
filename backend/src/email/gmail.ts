import nodemailer from "nodemailer";

const GMAIL_USER: string = (() => {
  const value = process.env.GMAIL_USER;
  if (!value) {
    throw new Error("GMAIL_USER is not set");
  }
  return value;
})();

const GMAIL_APP_PASSWORD: string = (() => {
  const value = process.env.GMAIL_APP_PASSWORD;
  if (!value) {
    throw new Error("GMAIL_APP_PASSWORD is not set");
  }
  return value;
})();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
  // Nodemailer's defaults (up to 10 minutes for socketTimeout) are far too
  // generous for a request/response cycle. These bound worst-case latency
  // so a stalled connection fails fast and logs clearly, instead of hanging.
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 15_000,
});

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  await transporter.sendMail({
    from: GMAIL_USER,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}
