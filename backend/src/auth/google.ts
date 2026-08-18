import { OAuth2Client } from "google-auth-library";

let client: OAuth2Client | null = null;
let cachedClientId: string | null = null;

function getClient(): { client: OAuth2Client; clientId: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not set");
  }
  if (!client || cachedClientId !== clientId) {
    client = new OAuth2Client(clientId);
    cachedClientId = clientId;
  }
  return { client, clientId };
}

export interface GoogleIdentity {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

export async function verifyGoogleIdToken(
  credential: string,
): Promise<GoogleIdentity> {
  const { client, clientId } = getClient();
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: clientId,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new Error("Google token is missing required fields");
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified === true,
    name: payload.name,
    picture: payload.picture,
  };
}
