module.exports = {
  reactStrictMode: true,
  trailingSlash: true,
  assetPrefix: "/admin",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://backend:4000/api/:path*",
      },
      {
        source: "/ws",
        destination: "http://backend:4000/ws",
      },
    ];
  },
};
