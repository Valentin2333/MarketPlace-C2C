import { OAuth2Client } from "google-auth-library";

const GMAIL_USER: string = (() => {
  const value = process.env.GMAIL_USER;
  if (!value) {
    throw new Error("GMAIL_USER is not set");
  }
  return value;
})();

const GMAIL_CLIENT_ID: string = (() => {
  const value = process.env.GMAIL_CLIENT_ID;
  if (!value) {
    throw new Error("GMAIL_CLIENT_ID is not set");
  }
  return value;
})();

const GMAIL_CLIENT_SECRET: string = (() => {
  const value = process.env.GMAIL_CLIENT_SECRET;
  if (!value) {
    throw new Error("GMAIL_CLIENT_SECRET is not set");
  }
  return value;
})();

const GMAIL_REFRESH_TOKEN: string = (() => {
  const value = process.env.GMAIL_REFRESH_TOKEN;
  if (!value) {
    throw new Error("GMAIL_REFRESH_TOKEN is not set");
  }
  return value;
})();

const oauth2Client = new OAuth2Client(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET);
oauth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });

function buildRawMessage(to: string, subject: string, html: string): string {
  const message = [
    `From: ${GMAIL_USER}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset="UTF-8"`,
    ``,
    html,
  ].join("\r\n");

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const { token } = await oauth2Client.getAccessToken();
  if (!token) {
    throw new Error("Could not obtain a Gmail API access token");
  }

  const raw = buildRawMessage(params.to, params.subject, params.html);

  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Gmail API send failed: ${response.status} ${body}`);
  }
}
