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
