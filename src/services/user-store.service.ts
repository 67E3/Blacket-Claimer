import { Injectable } from "@nestjs/common";
import { User as PrismaUser } from "@prisma/client";
import { EncryptedSecret, UserRecord } from "../types/user-record";
import { PrismaService } from "./prisma.service";

const DEFAULT_CLAIM_TIMES = ["12:00", "18:00"];

@Injectable()
export class UserStore {
  public constructor(private readonly prisma: PrismaService) {}

  public async getUser(discordUserId: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { discordUserId }
    });

    return user ? toUserRecord(user) : null;
  }

  public async getEnabledUsers(): Promise<UserRecord[]> {
    const users = await this.prisma.user.findMany({
      where: { claimEnabled: true },
      orderBy: { createdAt: "asc" }
    });

    return users.map(toUserRecord);
  }

  public async saveCredentials(
    discordUserId: string,
    blacketUsername: string,
    encryptedPassword: EncryptedSecret
  ): Promise<UserRecord> {
    const user = await this.prisma.user.upsert({
      where: { discordUserId },
      create: {
        discordUserId,
        blacketUsername,
        encryptedPassword: serializeJson(encryptedPassword),
        claimEnabled: false,
        times: serializeJson(DEFAULT_CLAIM_TIMES),
        lastClaimed: serializeJson({})
      },
      update: {
        blacketUsername,
        encryptedPassword: serializeJson(encryptedPassword)
      }
    });

    return toUserRecord(user);
  }

  public async updateUser(discordUserId: string, patch: Partial<UserRecord>): Promise<UserRecord> {
    await this.ensureUserExists(discordUserId);

    const user = await this.prisma.user.update({
      where: { discordUserId },
      data: {
        blacketUsername: patch.blacketUsername,
        encryptedPassword: patch.encryptedPassword
          ? serializeJson(patch.encryptedPassword)
          : undefined,
        claimEnabled: patch.claimEnabled,
        times: patch.times ? serializeJson(patch.times) : undefined,
        lastClaimed: patch.lastClaimed ? serializeJson(patch.lastClaimed) : undefined
      }
    });

    return toUserRecord(user);
  }

  public async deleteUser(discordUserId: string): Promise<void> {
    await this.prisma.user.deleteMany({
      where: { discordUserId }
    });
  }

  private async ensureUserExists(discordUserId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { discordUserId },
      select: { discordUserId: true }
    });

    if (!user) {
      throw new Error(`Cannot update unknown user ${discordUserId}`);
    }
  }
}

function toUserRecord(user: PrismaUser): UserRecord {
  return {
    discordUserId: user.discordUserId,
    blacketUsername: user.blacketUsername,
    encryptedPassword: parseJson<EncryptedSecret>(user.encryptedPassword, "encrypted password"),
    claimEnabled: user.claimEnabled,
    times: parseJson<string[]>(user.times, "claim times"),
    lastClaimed: parseJson<Record<string, string>>(user.lastClaimed, "claim history"),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
}

function serializeJson(value: unknown): string {
  return JSON.stringify(value);
}

function parseJson<T>(value: string, label: string): T {
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    throw new Error(
      `Failed to parse stored ${label}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
