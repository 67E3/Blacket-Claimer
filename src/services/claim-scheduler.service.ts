import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ClaimService } from "./claim.service";
import { UserStore } from "./user-store.service";

const SCHEDULE_INTERVAL_MS = 30_000;

@Injectable()
export class ClaimScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ClaimScheduler.name);
  private interval: NodeJS.Timeout | null = null;
  private running = false;

  public constructor(
    private readonly claims: ClaimService,
    private readonly users: UserStore
  ) {}

  public onModuleInit(): void {
    this.interval = setInterval(() => void this.checkSchedule(), SCHEDULE_INTERVAL_MS);
    void this.checkSchedule();
  }

  public onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  private async checkSchedule(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    try {
      const users = await this.users.getEnabledUsers();

      for (const user of users) {
        const dueTimes = this.claims.getDueClaimTimes(user);

        for (const time of dueTimes) {
          await this.claims.runScheduledClaim(user, time);
        }
      }
    } catch (error) {
      this.logger.error(
        "Schedule check failed.",
        error instanceof Error ? error.stack : String(error)
      );
    } finally {
      this.running = false;
    }
  }
}
