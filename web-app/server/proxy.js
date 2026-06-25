import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
const PORT = 3002;

app.use("/stream", createProxyMiddleware({
  target: "http://ugeen.live:8080",
  changeOrigin: true,
  pathRewrite: { "^/stream": "" },
  on: {
    proxyReq: (proxyReq) => {
      proxyReq.setHeader("Origin", "http://ugeen.live:8080");
      proxyReq.setHeader("Referer", "http://ugeen.live:8080/");
    },
  },
}));

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
