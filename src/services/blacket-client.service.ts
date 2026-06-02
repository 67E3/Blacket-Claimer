import { Injectable } from "@nestjs/common";

export interface ClaimEndpointResult {
  endpoint: string;
  status: number | "error";
  message: string;
}

const LOGIN_URL = "https://blacket.org/worker/login";
const CLAIM_ENDPOINTS = [
  "https://blacket.org/worker/user/daily",
  "https://blacket.org/worker2/user/daily",
  "https://blacket.org/worker/daily",
  "https://blacket.org/worker2/daily"
];

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
    const results: ClaimEndpointResult[] = [];

    for (const endpoint of CLAIM_ENDPOINTS) {
      results.push(await this.claimEndpoint(endpoint, cookie));
    }

    return results;
  }

  private async claimEndpoint(endpoint: string, cookie: string): Promise<ClaimEndpointResult> {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie
        }
      });

      return {
        endpoint,
        status: response.status,
        message: sanitizeResponse(await response.text())
      };
    } catch (error) {
      return {
        endpoint,
        status: "error",
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }
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
