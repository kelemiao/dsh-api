window.__ModuleLoader__.load({ id: "dsh-api", factory: (require) => {
var module = { exports: {} }; var exports = module.exports
"use strict"
var React = require("react")
var runtimeClient = require("@deepseek-ai/dsh-client-runtime/client")

var store = runtimeClient.defineStore({ init: () => ({ enabled: true, port: 4777, token: "" }), actions: { sync() {} } })

function Section(props) {
  var scope = props.scope
  var snapshot = React.useSyncExternalStore(scope.subscribe, scope.getSnapshot)
  var value = snapshot.value || {}
  return React.createElement("div", { style: { padding: "8px 0", maxWidth: 680 } },
    React.createElement("div", { style: { fontSize: 18, fontWeight: 600, paddingBottom: 8 } }, "dsh API"),
    React.createElement("label", { style: { display: "flex", gap: 8, alignItems: "center", padding: "8px 0" } },
      React.createElement("span", null, "启用"),
      React.createElement("input", { type: "checkbox", checked: !!value.enabled, onChange: (e) => scope.set("enabled", e.target.checked) })
    ),
    React.createElement("label", { style: { display: "block", padding: "8px 0" } },
      React.createElement("span", null, "端口"),
      React.createElement("input", { value: value.port ?? 4777, onChange: (e) => scope.set("port", Number(e.target.value)) })
    ),
    React.createElement("label", { style: { display: "block", padding: "8px 0" } },
      React.createElement("span", null, "Token"),
      React.createElement("input", { type: "password", placeholder: "已配置", onChange: (e) => scope.set("token", e.target.value) })
    )
  )
}

exports.apply = function apply(ctx) {
  if (!ctx.slots) return
  ctx.slots.inject("settings.section", function () {
    return ctx.slots.register({
      name: "settings.section",
      id: "dsh-api",
      order: 90,
      label: function () { return "dsh API" },
      store,
      inject: function () { return { scope: ctx.get("settingsScope").bind({ namespace: "dsh-api" }) } }
    }, Section)
  })
}
return module.exports } })
