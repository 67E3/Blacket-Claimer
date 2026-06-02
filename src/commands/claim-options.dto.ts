import { StringOption } from "necord";

export class LoginOptionsDto {
  @StringOption({
    name: "username",
    description: "Blacket username",
    required: true
  })
  username!: string;

  @StringOption({
    name: "password",
    description: "Blacket password",
    required: true
  })
  password!: string;
}

export class ClaimSettingsOptionsDto {
  @StringOption({
    name: "time1",
    description: "First daily claim time in HH:MM EST",
    required: false
  })
  time1?: string;

  @StringOption({
    name: "time2",
    description: "Second daily claim time in HH:MM EST",
    required: false
  })
  time2?: string;
}
