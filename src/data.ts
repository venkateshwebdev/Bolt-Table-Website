export interface Monitor {
  [key: string]: unknown;
  id: string;
  name: string;
  url: string;
  status: "active" | "degraded" | "down" | "paused";
  region: string;
  latency: number;
  uptime: number;
  lastChecked: string;
  method: string;
  interval: number;
  tags: string[];
}

const names = [
  "API Gateway",
  "Auth Service",
  "Payment API",
  "User Service",
  "Search Engine",
  "CDN Origin",
  "Database Proxy",
  "Email Service",
  "Webhook Handler",
  "Image Processor",
  "Cache Layer",
  "Queue Worker",
  "Analytics API",
  "Notification Hub",
  "File Storage",
  "Rate Limiter",
  "Config Server",
  "Health Check",
  "Log Aggregator",
  "DNS Resolver",
  "Load Balancer",
  "SSL Terminator",
  "Session Store",
  "Feature Flags",
  "A/B Testing",
  "Fraud Detection",
  "Recommendation",
  "Geolocation API",
  "SMS Gateway",
  "Push Service",
  "OAuth Provider",
  "GraphQL Gateway",
  "REST Proxy",
  "WebSocket Hub",
  "Event Bus",
  "Scheduler",
  "Backup Service",
  "Migration Tool",
  "Audit Logger",
  "Compliance API",
];

const urls = [
  "api.acme.com",
  "auth.acme.com",
  "pay.acme.com",
  "users.acme.com",
  "search.acme.com",
  "cdn.acme.com",
  "db.acme.com",
  "mail.acme.com",
  "hooks.acme.com",
  "img.acme.com",
  "cache.acme.com",
  "queue.acme.com",
  "analytics.acme.com",
  "notify.acme.com",
  "files.acme.com",
  "ratelimit.acme.com",
  "config.acme.com",
  "health.acme.com",
  "logs.acme.com",
  "dns.acme.com",
  "lb.acme.com",
  "ssl.acme.com",
  "sessions.acme.com",
  "flags.acme.com",
  "ab.acme.com",
  "fraud.acme.com",
  "reco.acme.com",
  "geo.acme.com",
  "sms.acme.com",
  "push.acme.com",
  "oauth.acme.com",
  "graphql.acme.com",
  "rest.acme.com",
  "ws.acme.com",
  "events.acme.com",
  "cron.acme.com",
  "backup.acme.com",
  "migrate.acme.com",
  "audit.acme.com",
  "compliance.acme.com",
];

const regions = [
  "us-east-1",
  "us-west-2",
  "eu-west-1",
  "eu-central-1",
  "ap-south-1",
  "ap-northeast-1",
  "sa-east-1",
  "ca-central-1",
];

const statuses: Monitor["status"][] = ["active", "active", "active", "active", "active", "degraded", "down", "paused"];
const methods = ["GET", "POST", "HEAD", "GET", "GET", "GET"];
const tagOptions = ["production", "staging", "critical", "internal", "public", "v2", "legacy", "beta"];

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function generateMonitors(count: number): Monitor[] {
  return Array.from({ length: count }, (_, i) => {
    const r = (offset: number) => seededRandom(i * 13 + offset);
    const idx = i % names.length;
    return {
      id: `mon-${String(i + 1).padStart(3, "0")}`,
      name: names[idx],
      url: `https://${urls[idx]}/v${Math.floor(r(1) * 3) + 1}/health`,
      status: statuses[Math.floor(r(2) * statuses.length)],
      region: regions[Math.floor(r(3) * regions.length)],
      latency: Math.round(20 + r(4) * 480),
      uptime: Math.round((95 + r(5) * 5) * 100) / 100,
      lastChecked: new Date(Date.now() - Math.floor(r(6) * 3600000)).toISOString(),
      method: methods[Math.floor(r(7) * methods.length)],
      interval: [30, 60, 120, 300][Math.floor(r(8) * 4)],
      tags: tagOptions
        .filter((_, ti) => r(9 + ti) > 0.6)
        .slice(0, 3),
    };
  });
}
