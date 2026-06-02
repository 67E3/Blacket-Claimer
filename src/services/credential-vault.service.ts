import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { EncryptedSecret } from "../types/user-record";
import { EnvironmentService } from "./environment.service";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;

@Injectable()
export class CredentialVault {
  private readonly key: Buffer;

  public constructor(environment: EnvironmentService) {
    this.key = environment.getCredentialKey();
  }

  public encrypt(plainText: string): EncryptedSecret {
    const iv = randomBytes(IV_LENGTH_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const cipherText = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);

    return {
      algorithm: ALGORITHM,
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      data: cipherText.toString("base64")
    };
  }

  public decrypt(secret: EncryptedSecret): string {
    if (secret.algorithm !== ALGORITHM) {
      throw new Error(`Unsupported credential encryption algorithm: ${secret.algorithm}`);
    }

    const decipher = createDecipheriv(ALGORITHM, this.key, Buffer.from(secret.iv, "base64"));
    decipher.setAuthTag(Buffer.from(secret.tag, "base64"));

    return Buffer.concat([
      decipher.update(Buffer.from(secret.data, "base64")),
      decipher.final()
    ]).toString("utf8");
  }
}
