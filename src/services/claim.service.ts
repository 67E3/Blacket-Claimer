import { Injectable, Logger } from "@nestjs/common";
import { Client } from "discord.js";
import { UserRecord } from "../types/user-record";
import { BlacketClient, ClaimEndpointResult } from "./blacket-client.service";
import { CredentialVault } from "./credential-vault.service";
import { UserStore } from "./user-store.service";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

@Injectable()
export class ClaimService {
  private readonly logger = new Logger(ClaimService.name);

  public constructor(
    private readonly blacket: BlacketClient,
    private readonly client: Client,
    private readonly users: UserStore,
    private readonly vault: CredentialVault
  ) {}

  public async verifyAndSaveCredentials(
    discordUserId: string,
    username: string,
    password: string
  ): Promise<void> {
    await this.blacket.login(username, password);
    await this.users.saveCredentials(discordUserId, username, this.vault.encrypt(password));
  }

  public async runScheduledClaim(user: UserRecord, scheduledTime: string): Promise<void> {
    await this.sendDm(user.discordUserId, `Starting Blacket daily claim for ${scheduledTime} EST.`);

    try {
      const password = this.vault.decrypt(user.encryptedPassword);
      const cookie = await this.blacket.login(user.blacketUsername, password);
      const results = await this.blacket.claimDaily(cookie);
      const nextClaim = this.getNextClaimLabel(user);

      await this.sendDm(
        user.discordUserId,
        `Claim finished for ${scheduledTime} EST.\n\nResults:\n${formatClaimResults(results)}\n\nNext scheduled claim: ${nextClaim}`
      );
    } catch (error) {
      this.logger.warn(
        `Scheduled claim failed for Discord user ${user.discordUserId}: ${getErrorMessage(error)}`
      );
      await this.sendDm(user.discordUserId, `Scheduled claim failed: ${getErrorMessage(error)}`);
    }

    const est = getEstDate(new Date());
    await this.users.updateUser(user.discordUserId, {
      lastClaimed: {
        ...user.lastClaimed,
        [scheduledTime]: getDateKey(est)
      }
    });
  }

  public isValidClaimTime(time: string): boolean {
    return TIME_PATTERN.test(time);
  }

  public normalizeClaimTimes(times: string[]): string[] {
    return [...new Set(times)].sort();
  }

  public getDueClaimTimes(user: UserRecord, reference = new Date()): string[] {
    const est = getEstDate(reference);
    const currentTime = formatTime(est);
    const todayKey = getDateKey(est);

    return user.times.filter((time) => {
      return time === currentTime && user.lastClaimed[time] !== todayKey;
    });
  }

  public getNextClaimLabel(user: UserRecord, reference = new Date()): string {
    const est = getEstDate(reference);
    const nowMinutes = est.getUTCHours() * 60 + est.getUTCMinutes();
    const orderedTimes = this.normalizeClaimTimes(user.times);

    for (const time of orderedTimes) {
      if (timeToMinutes(time) > nowMinutes) {
        return `${time} EST today`;
      }
    }

    return `${orderedTimes[0]} EST tomorrow`;
  }

  private async sendDm(discordUserId: string, message: string): Promise<void> {
    try {
      const user = await this.client.users.fetch(discordUserId);
      await user.send(message);
    } catch (error) {
      this.logger.warn(`Unable to DM Discord user ${discordUserId}: ${getErrorMessage(error)}`);
    }
  }
}

function formatClaimResults(results: ClaimEndpointResult[]): string {
  return results
    .map(
      (result) => `${result.endpoint} -> ${result.status}\n${result.message || "(empty response)"}`
    )
    .join("\n\n");
}

function getEstDate(reference: Date): Date {
  const utc = reference.getTime() + reference.getTimezoneOffset() * 60_000;
  return new Date(utc - 5 * 60 * 60_000);
}

function formatTime(date: Date): string {
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

function getDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
