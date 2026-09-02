const DEFAULT_BASE_URL = process.env.OTTO_UPDATE_BASE_URL || "http://127.0.0.1:7430";

function normalizedBaseUrl() {
  return DEFAULT_BASE_URL.replace(/\/$/, "");
}

function authHeader() {
  const token = process.env.OTTO_UPDATE_BEARER_TOKEN;
  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`
  };
}

function withQuery(path, query = {}) {
  const url = new URL(`${normalizedBaseUrl()}${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    url.searchParams.set(key, String(value));
  }
  return url;
}

export async function callOttoUpdate(method, path, body, acceptedStatuses = [200], query = {}) {
  if (typeof fetch !== "function") {
    throw new Error("fetch is not available in this runtime");
  }

  const headers = {
    Accept: "application/json",
    ...authHeader()
  };

  let requestBody;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body);
  }

  const url = withQuery(path, query);
  const response = await fetch(url, {
    method,
    headers,
    body: requestBody
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!acceptedStatuses.includes(response.status)) {
    const detail = payload && typeof payload === "object" ? JSON.stringify(payload) : String(payload ?? "");
    throw new Error(`otto-update request failed: ${method} ${path} status=${response.status}${detail ? ` detail=${detail}` : ""}`);
  }

  if (response.status === 204) {
    return null;
  }

  return payload;
}

export function readNumber(value, fallback) {
  const candidate = Number(value);
  return Number.isFinite(candidate) ? candidate : fallback;
}
