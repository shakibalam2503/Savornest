const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");

const env = require("../config/env");
const { redis } = require("../config/redis");

const googleClient = new OAuth2Client(
  env.google.clientId,
  env.google.clientSecret,
  env.google.redirectUri
);

function base64UrlEncode(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function generateCodeVerifier() {
  return base64UrlEncode(crypto.randomBytes(32));
}

function generateCodeChallenge(verifier) {
  return base64UrlEncode(
    crypto
      .createHash("sha256")
      .update(verifier)
      .digest()
  );
}

function generateState() {
  return base64UrlEncode(crypto.randomBytes(32));
}

async function createGoogleAuthorizationUrl() {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const transactionKey = `auth:google:oauth:${state}`;

  await redis.set(
    transactionKey,
    JSON.stringify({
      state,
      codeVerifier,
      createdAt: Date.now(),
    }),
    { ex: 600 }
  );

  const authorizationUrl = googleClient.generateAuthUrl({
    response_type: "code",
    scope: ["openid", "email", "profile"],
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    access_type: "online",
  });

  return authorizationUrl;
}

async function exchangeGoogleAuthorizationCode(code, state) {
  if (!code || !state) {
    throw new Error("Missing Google authorization code or state");
  }

  const transactionKey = `auth:google:oauth:${state}`;

  const transactionData = await redis.get(transactionKey);

  if (!transactionData) {
    throw new Error(
      "Google OAuth transaction expired or invalid"
    );
  }

  const transaction =
    typeof transactionData === "string"
      ? JSON.parse(transactionData)
      : transactionData;

  if (transaction.state !== state) {
    throw new Error("Invalid OAuth state");
  }

  const { tokens } = await googleClient.getToken({
    code,
    codeVerifier: transaction.codeVerifier,
    redirect_uri: env.google.redirectUri,
  });

  await redis.del(transactionKey);

  return tokens;
}

  async function verifyGoogleIdToken(idToken) {
  if (!idToken) {
    throw new Error("Google ID token is missing");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.google.clientId,
  });

  const payload = ticket.getPayload();

  if (!payload || !payload.sub) {
    throw new Error("Invalid Google user identity");
  }

  if (!payload.email || payload.email_verified !== true) {
    throw new Error("Google email is missing or not verified");
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: true,
    name: payload.name || null,
    picture: payload.picture || null,
  };
}
  


module.exports = {
  createGoogleAuthorizationUrl,
  exchangeGoogleAuthorizationCode,
  verifyGoogleIdToken
};