export function nodeToRequest(req, baseUrl) {
  const method = req.method ?? "GET"
  if (method === "GET" || method === "HEAD") {
    return new Request(baseUrl + req.url, { method, headers: req.headers })
  }
  const body = new ReadableStream({
    start(controller) {
      req.on("data", (chunk) => controller.enqueue(chunk))
      req.on("end", () => controller.close())
      req.on("error", (error) => controller.error(error))
    }
  })
  return new Request(baseUrl + req.url, { method, headers: req.headers, body, duplex: "half" })
}

export async function writeFetchResponse(nodeRes, response) {
  nodeRes.statusCode = response.status
  for (const [key, value] of response.headers) nodeRes.setHeader(key, value)
  if (!response.body) { nodeRes.end(); return }
  const reader = response.body.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    nodeRes.write(value)
  }
  nodeRes.end()
}
