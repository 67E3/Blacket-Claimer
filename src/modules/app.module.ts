import { Module } from "@nestjs/common";
import { GatewayIntentBits } from "discord.js";
import { NecordModule } from "necord";
import { ClaimCommands } from "../commands/claim.commands";
import { BlacketClient } from "../services/blacket-client.service";
import { ClaimService } from "../services/claim.service";
import { ClaimScheduler } from "../services/claim-scheduler.service";
import { CredentialVault } from "../services/credential-vault.service";
import { EnvironmentService } from "../services/environment.service";
import { PrismaService } from "../services/prisma.service";
import { UserStore } from "../services/user-store.service";

@Module({
  imports: [
    NecordModule.forRoot({
      token: EnvironmentService.readDiscordToken(),
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages]
    })
  ],
  providers: [
    BlacketClient,
    ClaimCommands,
    ClaimScheduler,
    ClaimService,
    CredentialVault,
    EnvironmentService,
    PrismaService,
    UserStore
  ]
})
export class AppModule {}
