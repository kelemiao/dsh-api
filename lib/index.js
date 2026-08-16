import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings"
import { toFetchHandler } from "@deepseek-ai/dsh-host-apiproxy"
import { DshApiSettingsSchema, SETTINGS_NAMESPACE_RAW, resolveSettings } from "./config.js"
import { createDshApiServer } from "./server.js"

export const name = "dsh-api"
export const inject = ["apiProxy"]

const SETTINGS_NAMESPACE = settingsNamespace(SETTINGS_NAMESPACE_RAW)

export function apply(ctx, config = {}) {
  const entry = { enabled: config.enabled ?? true, port: config.port ?? 4777, token: config.token }

  let server = null
  let current = () => resolveSettings(entry)

  function restart() {
    const previous = server
    server = null
    const settings = current()
    if (!settings.enabled) {
      if (previous) previous.close()
      return
    }

    const start = () => {
      const next = createDshApiServer({
        api: ctx.apiProxy,
        fetch: toFetchHandler(ctx.apiProxy).fetch,
        token: settings.token,
        port: settings.port
      })
      next.on("error", (error) => {
        console.error("[dsh-api] server error:", error)
        if (server === next) server = null
      })
      server = next
      next.listen(settings.port, "127.0.0.1")
    }

    if (previous) {
      previous.close(() => start())
    } else {
      start()
    }
  }

  installSettingsSection(ctx, SETTINGS_NAMESPACE, DshApiSettingsSchema, entry, {
    setSource: (source) => { current = () => resolveSettings(source()) },
    onChange: restart
  })

  ctx.effect(() => {
    restart()
    return () => { if (server) server.close() }
  }, "dsh-api: local http server")
}
