import z from "@deepseek-ai/schemastery"
import { randomUUID } from "node:crypto"

export const DEFAULT_PORT = 4777
export const SETTINGS_NAMESPACE_RAW = "dsh-api"

export const DshApiSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  port: z.number().step(1).min(1).max(65535).default(DEFAULT_PORT),
  token: z.string().min(8).role("secret")
})

const generatedToken = randomUUID().replaceAll("-", "")

export function resolveSettings(entry = {}) {
  return {
    enabled: entry.enabled ?? true,
    port: entry.port ?? DEFAULT_PORT,
    token: entry.token && entry.token.length >= 8 ? entry.token : generatedToken
  }
}
