import { Injectable } from "@nestjs/common";

export interface ClaimEndpointResult {
  endpoint: string;
  status: number | "error";
  message: string;
}

const LOGIN_URL = "https://blacket.org/worker/login";
const CLAIM_ENDPOINT = "https://blacket.org/worker/claim";
const CLAIM_REWARDS = [1000, 1100, 1300, 1400, 1600, 1700, 1900, 2000] as const;

interface ClaimResponse {
  error?: boolean;
  reward?: number;
  message?: string;
}

@Injectable()
export class BlacketClient {
  public async login(username: string, password: string): Promise<string> {
    const response = await fetch(LOGIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      throw new Error(`Blacket login failed with HTTP ${response.status}.`);
    }

    const cookies = readSetCookies(response.headers);
    if (cookies.length === 0) {
      throw new Error("Blacket login did not return a session cookie.");
    }

    return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
  }

  public async claimDaily(cookie: string): Promise<ClaimEndpointResult[]> {
    return [await this.claimEndpoint(cookie)];
  }

  private async claimEndpoint(cookie: string): Promise<ClaimEndpointResult> {
    try {
      const response = await fetch(CLAIM_ENDPOINT, {
        method: "GET",
        headers: {
          Accept: "*/*",
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          Cookie: cookie
        },
        referrer: "https://blacket.org/stats/"
      });
      const body = await response.text();

      return {
        endpoint: CLAIM_ENDPOINT,
        status: response.status,
        message: formatClaimResponse(body)
      };
    } catch (error) {
      return {
        endpoint: CLAIM_ENDPOINT,
        status: "error",
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

function formatClaimResponse(body: string): string {
  const parsed = parseClaimResponse(body);
  if (!parsed) {
    return sanitizeResponse(body);
  }

  if (typeof parsed.reward !== "number") {
    return parsed.message ? sanitizeResponse(parsed.message) : sanitizeResponse(body);
  }

  const rewardValue = CLAIM_REWARDS[parsed.reward];
  if (rewardValue === undefined) {
    return `Reward index: ${parsed.reward}`;
  }

  return `Reward index: ${parsed.reward}\nReward: ${rewardValue}`;
}

function parseClaimResponse(body: string): ClaimResponse | null {
  try {
    const parsed: unknown = JSON.parse(body);

    if (!isRecord(parsed)) {
      return null;
    }

    return {
      error: typeof parsed.error === "boolean" ? parsed.error : undefined,
      reward: typeof parsed.reward === "number" ? parsed.reward : undefined,
      message: typeof parsed.message === "string" ? parsed.message : undefined
    };
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeResponse(body: string): string {
  const singleLine = body.replace(/\s+/g, " ").trim();
  return singleLine.length > 250 ? `${singleLine.slice(0, 247)}...` : singleLine;
}

function readSetCookies(headers: Headers): string[] {
  const headersWithSetCookie = headers as Headers & {
    getSetCookie?: () => string[];
  };

  const cookies = headersWithSetCookie.getSetCookie?.();
  if (cookies?.length) {
    return cookies;
  }

  const cookie = headers.get("set-cookie");
  return cookie ? [cookie] : [];
}
