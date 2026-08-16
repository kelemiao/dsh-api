import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings"
import { toFetchHandler } from "@deepseek-ai/dsh-host-apiproxy"
import { DshApiSettingsSchema, SETTINGS_NAMESPACE_RAW, resolveSettings } from "./config.js"
import { createDshApiServer } from "./server.js"

export const name = "dsh-api"
export const inject = ["apiProxy"]

const SETTINGS_NAMESPACE = settingsNamespace(SETTINGS_NAMESPACE_RAW)

export function apply(ctx, config = {}) {
  const entry = { enabled: config.enabled ?? true, port: config.port ?? 4777, token: config.token }

  ctx.effect(() => {
    let server = null
    let current = () => resolveSettings(entry)

    installSettingsSection(ctx, SETTINGS_NAMESPACE, DshApiSettingsSchema, entry, {
      setSource: (source) => { current = () => resolveSettings(source()) },
      onChange: restart
    })

    function restart() {
      if (server) { server.close(); server = null }
      const settings = current()
      if (!settings.enabled) return
      server = createDshApiServer({
        api: ctx.apiProxy,
        fetch: toFetchHandler(ctx.apiProxy).fetch,
        token: settings.token,
        port: settings.port
      })
      server.listen(settings.port, "127.0.0.1")
    }

    restart()
    return () => { if (server) server.close() }
  }, "dsh-api: local http server")
}
