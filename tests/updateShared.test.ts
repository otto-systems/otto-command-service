import { afterEach, describe, expect, it, vi } from "vitest";

import { callOttoUpdate, readNumber } from "../src/handlers/updateShared.mjs";

const originalFetch = globalThis.fetch;
const originalBaseUrl = process.env.OTTO_UPDATE_BASE_URL;
const originalToken = process.env.OTTO_UPDATE_BEARER_TOKEN;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalFetch) {
    globalThis.fetch = originalFetch;
  } else {
    delete globalThis.fetch;
  }
  if (originalBaseUrl === undefined) {
    delete process.env.OTTO_UPDATE_BASE_URL;
  } else {
    process.env.OTTO_UPDATE_BASE_URL = originalBaseUrl;
  }
  if (originalToken === undefined) {
    delete process.env.OTTO_UPDATE_BEARER_TOKEN;
  } else {
    process.env.OTTO_UPDATE_BEARER_TOKEN = originalToken;
  }
});

describe("callOttoUpdate", () => {
  it("builds request with auth header and JSON body", async () => {
    process.env.OTTO_UPDATE_BASE_URL = "http://127.0.0.1:7430/";
    process.env.OTTO_UPDATE_BEARER_TOKEN = "token-123";

    const fetchMock = vi.fn(async () => ({
      status: 200,
      json: async () => ({ ok: true })
    }));
    globalThis.fetch = fetchMock as any;

    const result = await callOttoUpdate("POST", "/v1/check", { device: "pi-1" }, [200]);

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [URL | string, RequestInit];
    expect(String(url)).toBe("http://127.0.0.1:7430/v1/check");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ device: "pi-1" }));

    const headers = init.headers as Record<string, string>;
    expect(headers.Accept).toBe("application/json");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers.Authorization).toBe("Bearer token-123");
  });

  it("adds query values and omits empty query fields", async () => {
    process.env.OTTO_UPDATE_BASE_URL = "http://127.0.0.1:7430";

    const fetchMock = vi.fn(async () => ({
      status: 200,
      json: async () => ({ items: [] })
    }));
    globalThis.fetch = fetchMock as any;

    await callOttoUpdate("GET", "/v1/history", undefined, [200], {
      limit: 10,
      offset: 0,
      empty: "",
      nullable: null,
      skip: undefined
    });

    const [url] = fetchMock.mock.calls[0] as [URL | string, RequestInit];
    const requestUrl = String(url);
    expect(requestUrl).toContain("/v1/history?");
    expect(requestUrl).toContain("limit=10");
    expect(requestUrl).toContain("offset=0");
    expect(requestUrl).not.toContain("empty=");
    expect(requestUrl).not.toContain("nullable=");
    expect(requestUrl).not.toContain("skip=");
  });

  it("returns null for 204 responses", async () => {
    const fetchMock = vi.fn(async () => ({
      status: 204,
      json: async () => {
        throw new Error("no content");
      }
    }));
    globalThis.fetch = fetchMock as any;

    const result = await callOttoUpdate("GET", "/v1/progress", undefined, [200, 204]);
    expect(result).toBeNull();
  });

  it("throws with payload detail on non-accepted status", async () => {
    const fetchMock = vi.fn(async () => ({
      status: 409,
      json: async () => ({ error: "already_checking" })
    }));
    globalThis.fetch = fetchMock as any;

    await expect(callOttoUpdate("POST", "/v1/check", undefined, [200])).rejects.toThrow(
      "otto-update request failed: POST /v1/check status=409 detail={\"error\":\"already_checking\"}"
    );
  });

  it("throws if fetch is unavailable", async () => {
    delete globalThis.fetch;
    await expect(callOttoUpdate("GET", "/health")).rejects.toThrow("fetch is not available in this runtime");
  });
});

describe("readNumber", () => {
  it("returns numeric value when parseable", () => {
    expect(readNumber("42", 10)).toBe(42);
    expect(readNumber("3.14", 0)).toBe(3.14);
  });

  it("returns fallback for non-finite or invalid values", () => {
    expect(readNumber("NaN", 7)).toBe(7);
    expect(readNumber("not-a-number", 9)).toBe(9);
    expect(readNumber(Infinity, 5)).toBe(5);
  });
});
