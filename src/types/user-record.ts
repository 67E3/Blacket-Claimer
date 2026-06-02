export interface EncryptedSecret {
  algorithm: "aes-256-gcm";
  iv: string;
  tag: string;
  data: string;
}

export interface UserRecord {
  discordUserId: string;
  blacketUsername: string;
  encryptedPassword: EncryptedSecret;
  claimEnabled: boolean;
  times: string[];
  lastClaimed: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}
