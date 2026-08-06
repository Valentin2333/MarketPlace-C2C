import { createServer } from "node:http";
import { OAuth2Client } from "google-auth-library";
import "dotenv/config";

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3000/oauth2callback";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in backend/.env before running this script.",
  );
  process.exit(1);
}

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/gmail.send"],
});

console.log(
  "\nOpen this URL, sign in with the Gmail account you want to send from,\n" +
    "and approve access:\n",
);
console.log(authUrl);
console.log("\nWaiting for you to finish in the browser...\n");

const server = createServer((req, res) => {
  if (!req.url) return;
  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get("code");

  if (!code) {
    res.writeHead(400);
    res.end("No authorization code received.");
    return;
  }

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end("<h2>Done — you can close this tab and go back to your terminal.</h2>");

  oauth2Client
    .getToken(code)
    .then(({ tokens }) => {
      console.log("\nSave this as GMAIL_REFRESH_TOKEN in your .env and on Render:\n");
      console.log(tokens.refresh_token);
      console.log("");
      server.close();
      process.exit(0);
    })
    .catch((err) => {
      console.error("Failed to exchange code for tokens:", err);
      server.close();
      process.exit(1);
    });
});

server.listen(3000);
