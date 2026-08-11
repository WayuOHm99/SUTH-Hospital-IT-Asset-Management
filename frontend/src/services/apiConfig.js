export function resolveApiBaseUrl(configuredUrl) {
  const value = String(configuredUrl || "").trim();

  if (!value) return "/api";
  if (value === "/") return value;

  return value.replace(/\/+$/, "");
}
