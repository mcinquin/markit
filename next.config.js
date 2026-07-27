/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === "production";

// En production, Next.js n'a pas besoin de unsafe-eval
// En développement, le HMR en a besoin
const scriptSrc = isProd
  ? "script-src 'self' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-eval' 'unsafe-inline'";

const securityHeaders = [
  // Empêche le navigateur de deviner le type MIME
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Protection XSS basique pour les vieux navigateurs (ignoré par les modernes qui ont CSP)
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // Empêche le chargement dans une iframe (clickjacking)
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Contrôle les informations envoyées dans Referer
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Désactive le DNS prefetch pour limiter les fuites d'information
  { key: "X-DNS-Prefetch-Control", value: "off" },
  // Restreint l'accès aux APIs navigateur sensibles
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Content Security Policy
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      // Socket.io utilise des WebSockets — on autorise wss: (prod) et ws: (dev)
      isProd ? "connect-src 'self' wss:" : "connect-src 'self' wss: ws:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  logging: {
    fetches: { fullUrl: false },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  poweredByHeader: false,
};

module.exports = nextConfig;
