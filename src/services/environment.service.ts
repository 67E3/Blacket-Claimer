import { Injectable } from "@nestjs/common";
import { config } from "dotenv";

config();

@Injectable()
export class EnvironmentService {
  public static readDiscordToken(): string {
    return readRequiredEnv("DISCORD_TOKEN");
  }

  public getCredentialKey(): Buffer {
    const encodedKey = readRequiredEnv("BLACKET_CREDENTIAL_KEY");
    const key = Buffer.from(encodedKey, "base64");

    if (key.length !== 32) {
      throw new Error("BLACKET_CREDENTIAL_KEY must be a base64-encoded 32-byte key.");
    }

    return key;
  }

  public getDataDir(): string {
    return process.env.DATA_DIR?.trim() || "Data";
  }
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
