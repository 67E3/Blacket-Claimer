import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./modules/app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"]
  });

  const logger = new Logger("Bootstrap");
  logger.log("Blacket Claimer is running.");

  const shutdown = async (signal: string): Promise<void> => {
    logger.log(`Received ${signal}; shutting down.`);
    await app.close();
    process.exit(0);
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

bootstrap().catch((error: unknown) => {
  const logger = new Logger("Bootstrap");
  logger.error(
    "Failed to start Blacket Claimer.",
    error instanceof Error ? error.stack : String(error)
  );
  process.exit(1);
});
