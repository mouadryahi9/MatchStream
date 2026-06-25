import express from "express";
import httpProxy from "http-proxy";

const app = express();
const PORT = 80;
const proxy = httpProxy.createProxyServer({ ws: true });

proxy.on("error", (err, req, res) => {
  if (res && !res.headersSent) res.writeHead(502).end("Bad Gateway");
});

app.use((req, res) => {
  req.url = req.originalUrl;
  const path = req.path;
  if (path.startsWith("/api")) {
    proxy.web(req, res, { target: "http://localhost:4000", changeOrigin: true });
  } else if (path.startsWith("/stream")) {
    proxy.web(req, res, { target: "http://localhost:3002", changeOrigin: true });
  } else {
    proxy.web(req, res, { target: "http://localhost:3000", changeOrigin: true });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Network proxy running on http://localhost:${PORT}`);
});

server.on("upgrade", (req, socket, head) => {
  proxy.ws(req, socket, head, { target: "http://localhost:3000" });
});
