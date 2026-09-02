/**
 * OAuth Token Exchange Handler
 * Exchanges authorization code for access token
 * Does NOT store secrets - those come from display-system
 */

import {
  exchangeMicrosoftToken,
  exchangeGoogleToken,
  getMicrosoftUserInfo,
  getGoogleUserInfo,
  type OAuthTokenRequest
} from "../../../otto-auth-extension/src/oauth-token-exchanger.js";

export async function handle(payload: Record<string, unknown> = {}) {
  const providerId = String(payload.providerId ?? "").trim().toLowerCase();
  const clientId = String(payload.clientId ?? "").trim();
  const clientSecret = String(payload.clientSecret ?? "").trim();
  const authorizationCode = String(payload.authorizationCode ?? "").trim();
  const redirectUri = String(payload.redirectUri ?? "").trim();

  // Validate inputs without logging them
  if (!providerId || !clientId || !clientSecret || !authorizationCode || !redirectUri) {
    throw new Error("Missing required OAuth parameters");
  }

  const request: OAuthTokenRequest = {
    clientId,
    clientSecret,
    redirectUri,
    authorizationCode
  };

  let token = null;
  let userInfo = null;

  if (providerId === "microsoft") {
    token = await exchangeMicrosoftToken(request);
    if (token?.value) {
      userInfo = await getMicrosoftUserInfo(token.value);
    }
  } else if (providerId === "google") {
    token = await exchangeGoogleToken(request);
    if (token?.value) {
      userInfo = await getGoogleUserInfo(token.value);
    }
  } else {
    throw new Error("Unsupported provider");
  }

  if (!token) {
    throw new Error("Failed to exchange authorization code for token");
  }

  return {
    providerId,
    token: {
      value: token.value,
      expiresAt: token.expiresAt,
      issuedAt: token.issuedAt
    },
    user: userInfo ? {
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name
    } : null
  };
}
