import { Injectable, Logger } from "@nestjs/common";
import { Context, Options, SlashCommand, SlashCommandContext } from "necord";
import { ClaimService } from "../services/claim.service";
import { UserStore } from "../services/user-store.service";
import { ClaimSettingsOptionsDto, LoginOptionsDto } from "./claim-options.dto";

@Injectable()
export class ClaimCommands {
  private readonly logger = new Logger(ClaimCommands.name);

  public constructor(
    private readonly claims: ClaimService,
    private readonly users: UserStore
  ) {}

  @SlashCommand({
    name: "login",
    description: "Store your Blacket credentials for daily claiming"
  })
  public async login(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: LoginOptionsDto
  ): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const username = options.username.trim();
    if (!username) {
      await interaction.editReply("Username cannot be empty.");
      return;
    }

    try {
      await this.claims.verifyAndSaveCredentials(interaction.user.id, username, options.password);
      await interaction.editReply("Credentials verified and stored for your Discord account.");
    } catch (error) {
      this.logger.warn(
        `Login failed for Discord user ${interaction.user.id}: ${getErrorMessage(error)}`
      );
      await interaction.editReply(
        "Blacket login failed. Check your username and password, then try again."
      );
    }
  }

  @SlashCommand({
    name: "logout",
    description: "Remove your stored Blacket credentials and claim state"
  })
  public async logout(@Context() [interaction]: SlashCommandContext): Promise<void> {
    await this.users.deleteUser(interaction.user.id);
    await interaction.reply({
      content: "Your stored credentials and claim settings have been removed.",
      ephemeral: true
    });
  }

  @SlashCommand({
    name: "claimer",
    description: "Toggle your daily claiming on or off"
  })
  public async claimer(@Context() [interaction]: SlashCommandContext): Promise<void> {
    const user = await this.users.getUser(interaction.user.id);
    if (!user) {
      await interaction.reply({
        content: "Use `/login` before enabling daily claiming.",
        ephemeral: true
      });
      return;
    }

    const updated = await this.users.updateUser(interaction.user.id, {
      claimEnabled: !user.claimEnabled
    });

    const message = updated.claimEnabled
      ? `Daily claiming enabled. Next scheduled claim: ${this.claims.getNextClaimLabel(updated)}`
      : "Daily claiming disabled.";

    await interaction.reply({ content: message, ephemeral: true });
  }

  @SlashCommand({
    name: "claimsettings",
    description: "View or set your two daily claim times in EST"
  })
  public async claimSettings(
    @Context() [interaction]: SlashCommandContext,
    @Options() options: ClaimSettingsOptionsDto
  ): Promise<void> {
    const user = await this.users.getUser(interaction.user.id);
    if (!user) {
      await interaction.reply({
        content: "Use `/login` before changing claim settings.",
        ephemeral: true
      });
      return;
    }

    const time1 = options.time1?.trim();
    const time2 = options.time2?.trim();

    if (!time1 && !time2) {
      await interaction.reply({
        content: `Current claim times: ${user.times.join(", ")} EST\nNext scheduled claim: ${this.claims.getNextClaimLabel(user)}`,
        ephemeral: true
      });
      return;
    }

    if (!time1 || !time2) {
      await interaction.reply({
        content: "Please provide both time1 and time2 in HH:MM format.",
        ephemeral: true
      });
      return;
    }

    if (!this.claims.isValidClaimTime(time1) || !this.claims.isValidClaimTime(time2)) {
      await interaction.reply({
        content: "Times must use 24-hour HH:MM format, for example 08:30 or 21:15.",
        ephemeral: true
      });
      return;
    }

    const updated = await this.users.updateUser(interaction.user.id, {
      times: this.claims.normalizeClaimTimes([time1, time2]),
      lastClaimed: {}
    });

    await interaction.reply({
      content: `Claim times updated to ${updated.times.join(" and ")} EST. Next scheduled claim: ${this.claims.getNextClaimLabel(updated)}`,
      ephemeral: true
    });
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
