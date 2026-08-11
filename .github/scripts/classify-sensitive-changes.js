const path = require("node:path");

const authSecurityTokens = [
  "auth", "authentication", "authorization", "login", "signin", "sign-in",
  "sign_in", "permission", "permissions", "role", "roles", "user", "users",
  "account", "accounts", "admin", "security", "session", "sessions",
  "oauth", "oidc", "jwt", "acl", "rbac", "policy", "policies", "guard",
  "guards", "csrf", "mfa", "2fa", "helmet", "cors", "ratelimit",
  "express-rate-limit",
];
const authSecurityTokenPattern = authSecurityTokens.join("|");
const authSecurityContentTokenPattern = authSecurityTokens
  .filter((token) => !["user", "users", "account", "accounts"].includes(token))
  .join("|");
const authPathToken = new RegExp(
  `(^|[\\/._-])(?:${authSecurityTokenPattern})(?=[\\/._-]|$)`,
  "i"
);
const authNameTokens = new Set(authSecurityTokens);
const authSecurityContentPattern = new RegExp(
  `\\b(?:${authSecurityContentTokenPattern}|password|JWT_SECRET|` +
    "access[_ -]?token|permission matrix|adminMiddleware|requireAdmin|" +
    "requireAuth|corsOptions|helmetOptions|rateLimiter|rateLimitOptions)\\b",
  "i"
);
const inspectableSourceExtension =
  /\.(cjs|js|json|mjs|ps1|sh|sql|tf|toml|ts|tsx|vue|ya?ml)$/i;

function matchesAuthenticationPath(file) {
  const basename = path.posix.basename(file).replace(/\.[^.]+$/, "");
  const nameTokens = basename
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .map((token) => token.toLowerCase());
  return authPathToken.test(file) ||
    nameTokens.some((token) => authNameTokens.has(token));
}

const pathRules = [
  {
    category: "database schema or migration",
    matches: (file) =>
      file === "database/schema.sql" || file.startsWith("database/migrations/"),
  },
  {
    category: "authentication or authorization",
    matches: (file) =>
      file.startsWith("backend/src/middleware/") ||
      matchesAuthenticationPath(file),
  },
  {
    category: "security policy or automation guard",
    matches: (file) =>
      file === "SECURITY.md" ||
      file === "AGENTS.md" ||
      file === "CLAUDE.md" ||
      file === "docs/agents/automation.md" ||
      file.startsWith(".github/workflows/") ||
      file.startsWith(".github/scripts/"),
  },
  {
    category: "credential or secret configuration",
    matches: (file) => {
      const base = path.posix.basename(file);
      return /^\.env(?:\.|$)/i.test(base) || /(^|[._-])(secret|credential|token|key)([._-]|$)/i.test(base);
    },
  },
  {
    category: "deployment or production",
    matches: (file) =>
      /(^|\/)(deploy|deployment|infrastructure|infra|production)(\/|\.|-)/i.test(file) ||
      /(^|\/)(Dockerfile|docker-compose[^/]*|vercel\.json|wrangler\.toml)$/i.test(file),
  },
];

const contentRules = [
  {
    category: "destructive database operation",
    pattern: /\b(DROP\s+(?:DATABASE|SCHEMA|TABLE|COLUMN|INDEX|VIEW|TRIGGER|PROCEDURE|FUNCTION)|TRUNCATE(?:\s+TABLE)?|DELETE\s+FROM)\b/i,
  },
  {
    category: "destructive filesystem or process operation",
    pattern: /\b(?:fs(?:\.promises)?\.(?:rm|unlink|rmdir)(?:Sync)?|rimraf|Remove-Item\b[^\n]*(?:-Recurse|-Force)|(?:exec|execSync|spawn)\s*\([^\n]*(?:rm\s+-rf|Remove-Item|del\s+\/[fq]))/i,
  },
  {
    category: "authentication or security behavior",
    pattern: authSecurityContentPattern,
  },
  {
    category: "credential or secret behavior",
    pattern: /\b(api[_ -]?key|client[_ -]?secret|private[_ -]?key|secret[_ -]?key|credentials?)\b/i,
  },
  {
    category: "production or deployment behavior",
    pattern: /\b(production deploy|deploy(?:ment)? to production|production migration)\b/i,
  },
];

function classifySensitiveChanges(files) {
  const findings = [];

  for (const file of files) {
    const filename = String(file.filename || "").replaceAll("\\", "/");
    const candidatePaths = [filename];
    if (file.previous_filename) {
      candidatePaths.push(
        String(file.previous_filename).replaceAll("\\", "/")
      );
    }
    const findingsBeforePathRules = findings.length;

    for (const rule of pathRules) {
      if (candidatePaths.some((candidate) => rule.matches(candidate))) {
        findings.push({ filename, category: rule.category, source: "path" });
      }
    }

    if (
      findings.length === findingsBeforePathRules &&
      typeof file.patch !== "string" &&
      inspectableSourceExtension.test(filename)
    ) {
      findings.push({
        filename,
        category: "source change without inspectable patch",
        source: "patch",
      });
    }

    const patch = typeof file.patch === "string" ? file.patch : "";
    for (const rule of contentRules) {
      if (rule.pattern.test(patch)) {
        findings.push({ filename, category: rule.category, source: "content" });
      }
    }
  }

  return findings.filter((finding, index, all) =>
    all.findIndex((candidate) =>
      candidate.filename === finding.filename &&
      candidate.category === finding.category
    ) === index
  );
}

function evaluateApproval(findings, labels) {
  const labelSet = new Set(labels);
  const manuallyRequired = labelSet.has("human-approval-required");
  const approved = labelSet.has("human-approved");
  const requiresApproval = findings.length > 0 || manuallyRequired;

  return {
    approved,
    manuallyRequired,
    requiresApproval,
    passes: !requiresApproval || approved,
  };
}

module.exports = { classifySensitiveChanges, evaluateApproval };
